/**
 * DeepSeek 余额/成本数据服务（host half，独立发布版）。
 *
 * 提供两个 GET JSON 端点：
 *  - GET /api/balance  读取 DEEPSEEK_API_KEY（环境变量，~/.zshrc 兜底）查询 DeepSeek 账户余额
 *  - GET /api/usage    读取 ~/.dsh/storages/session_projcache.json 中最近会话的 token 用量并折算费用
 *
 * 端点同时注册在两个出口，浏览器侧不接触任何密钥：
 *  1) DSH 主 webServer 的同源路由（/api/balance、/api/usage）——浏览器/手机端（含 DSH
 *     Pocket 等远程访问）走同一 origin，跨设备可用；
 *  2) 回环微服务 127.0.0.1:3199（CORS 放开）——老版本浏览器端/独立部署的兜底路径。
 * 本包不依赖任何 @deepseek-ai 运行时包（零依赖），webServer 以结构化子集类型接入。
 */
import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { computeCost } from './cost.ts'
import { fetchBalance } from './balance.ts'

/** cordis 插件上下文的结构化子集（本插件只用 effect 生命周期与可选 webServer 路由注册）。 */
export interface PluginContext {
  effect(fn: () => unknown, label?: string): void
  /** DSH 主 webServer（同源 /api 路由注册点）；不存在时仅走 3199 回环兜底。 */
  webServer?: {
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
    }): () => void
  }
}

/** 数据服务监听地址（仅回环，不暴露到局域网）。 */
export const HOST = '127.0.0.1'
/** 数据服务端口。 */
export const PORT = 3199

/** 读取 DEEPSEEK_API_KEY：环境变量优先，~/.zshrc 的 export 行兜底。 */
function apiKeyFromEnv(): string {
  const env = process.env.DEEPSEEK_API_KEY
  if (typeof env === 'string' && env.length > 0) return env
  try {
    const zshrc = fs.readFileSync(path.join(os.homedir(), '.zshrc'), 'utf8')
    const m = zshrc.match(/export\s+DEEPSEEK_API_KEY="([^"]+)"/u)
    if (m?.[1] !== undefined && m[1].length > 0) return m[1]
  } catch { /* ignore */ }
  return ''
}

/** 投影缓存中最近一个有 token 用量的会话汇总。 */
export interface UsageTotals {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

interface ProjCacheShape {
  tables?: {
    sessions?: Record<string, { rows?: { tokenUsage?: { val?: { totals?: Record<string, unknown> } } } }>
  }
}

/** 读取最近会话的 token 用量（uncachedInputTokens 视为输入量）。 */
export function lastUsage(): UsageTotals | null {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), '.dsh', 'storages', 'session_projcache.json'), 'utf8')
    const data = JSON.parse(raw) as ProjCacheShape
    const sessions = data?.tables?.sessions
    if (sessions === undefined) return null
    const ids = Object.keys(sessions)
    for (let i = ids.length - 1; i >= 0; i -= 1) {
      const id = ids[i]
      if (id === undefined) continue
      const tu = sessions[id]?.rows?.tokenUsage?.val?.totals
      if (tu !== undefined && typeof tu.outputTokens === 'number') {
        return {
          inputTokens: Number(tu.uncachedInputTokens ?? 0),
          outputTokens: tu.outputTokens,
          cacheReadTokens: Number(tu.cacheReadTokens ?? 0),
          cacheWriteTokens: Number(tu.cacheWriteTokens ?? 0),
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

/** 统一的 JSON 响应（允许浏览器跨源读取；回环兜底服务只绑定本机）。 */
function json(res: ServerResponse, body: unknown): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

/** 创建（未监听）数据服务：便于单测与 smoke 验证。 */
async function handleData(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'GET') { json(res, { ok: false, error: 'method not allowed' }); return }
    const key = apiKeyFromEnv()
    if (req.url === '/api/balance') {
      if (key.length === 0) {
        json(res, { ok: false, error: 'DEEPSEEK_API_KEY 未配置（检查环境变量或 ~/.zshrc）' })
        return
      }
      try {
        const b = await fetchBalance(key)
        const info = b.balanceInfos[0]
        json(res, {
          ok: b.isAvailable,
          currency: info?.currency ?? 'CNY',
          total: info?.totalBalance ?? 0,
          granted: info?.grantedBalance ?? 0,
          topped: info?.toppedUpBalance ?? 0,
        })
      } catch (e) {
        json(res, { ok: false, error: e instanceof Error ? e.message : String(e) })
      }
      return
    }
    if (req.url === '/api/usage') {
      const u = lastUsage()
      json(res, { ok: u !== null, usage: u, cost: u === null ? null : computeCost(u) })
      return
    }
    json(res, { ok: false, error: 'not found' })
}

/** 创建（未监听）回环数据服务：便于单测与 smoke 验证。 */
export function createDataServer(): http.Server {
  return http.createServer(handleData)
}

/** Host 插件入口：随 dsh 启动数据服务，卸载时关闭。 */
export function apply(ctx: PluginContext): void {
  ctx.effect(() => {
    // 1) 主 webServer 同源路由：浏览器/手机端（含 DSH Pocket 远程访问）走同一 origin
    const unregisters: Array<() => void> = []
    if (ctx.webServer !== undefined) {
      unregisters.push(ctx.webServer.register({ kind: 'exact', path: '/api/balance', handler: handleData }))
      unregisters.push(ctx.webServer.register({ kind: 'exact', path: '/api/usage', handler: handleData }))
    }
    // 2) 回环微服务兜底：老版本浏览器端 / 独立部署
    const server = createDataServer()
    server.listen(PORT, HOST)
    return () => {
      for (const unregister of unregisters) unregister()
      server.close()
    }
  }, 'dsh-ui-deepseek-balance: host data server')
}
