import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'

/** host 数据服务 /api/balance 响应。 */
interface BalanceData {
  ok: boolean
  error?: string
  currency?: string
  total?: number
  granted?: number
  topped?: number
}

/** host 数据服务 /api/usage 响应。 */
interface UsageData {
  ok: boolean
  error?: string
  cost?: number | null
  usage?: UsageTokens
}

/** 一次任务的 token 用量明细。 */
interface UsageTokens {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

/** 各类 token 求和（缺失 cache 量按 0 计）。 */
const totalTokens = (u: UsageTokens): number =>
  u.inputTokens + u.outputTokens + (u.cacheReadTokens ?? 0) + (u.cacheWriteTokens ?? 0)

/** 界面文案（按浏览器语言自动选择）。 */
const I18N = {
  zh: {
    title: 'DeepSeek 余额',
    balance: '账户余额',
    topped: '充值',
    granted: '赠送',
    task: '本次任务',
    tokens: 'tokens',
    expand: '展开 DeepSeek 余额/成本',
    collapse: '收起',
    unavailable: '数据服务不可用：',
    hint: '请确认插件 host half 已随 harness 启动（127.0.0.1:3199）',
  },
  en: {
    title: 'DeepSeek Balance',
    balance: 'Balance',
    topped: 'Top-up',
    granted: 'Granted',
    task: 'Last task',
    tokens: 'tokens',
    expand: 'Expand DeepSeek balance / cost',
    collapse: 'Collapse',
    unavailable: 'Data service unavailable: ',
    hint: 'Make sure the plugin host half is running with the harness (127.0.0.1:3199)',
  },
} as const

const isZh = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
const T = isZh ? I18N.zh : I18N.en

const BASE = 'http://127.0.0.1:3199'
const REFRESH_MS = 30000

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + String(res.status))
  return await res.json() as T
}

const fmt = (n: number): string => n.toFixed(2)
const int = (n: number): string => n.toLocaleString('en-US')

/**
 * 全局悬浮余额/成本卡片（注册于 shell.overlay）。
 * 展示余额与最近一次任务花费，30 秒自动刷新；点击右上角收起为小胶囊。
 */
export function BalanceWidget(): ReactElement {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let alive = true
    const refresh = async (): Promise<void> => {
      try {
        const [b, u] = await Promise.all([
          getJson<BalanceData>(BASE + '/api/balance'),
          getJson<UsageData>(BASE + '/api/usage'),
        ])
        if (!alive) return
        setBalance(b)
        setUsage(u)
        setError(null)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    void refresh()
    const timer = setInterval(() => { void refresh() }, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  // shell.overlay 默认点击穿透——卡片显式接收指针事件。
  const rootStyle: CSSProperties = {
    position: 'fixed',
    right: 16,
    bottom: 16,
    zIndex: 9999,
    pointerEvents: 'auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title={T.expand}
        style={{
          ...rootStyle,
          background: 'rgba(17,24,39,0.92)',
          color: '#e5e7eb',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 999,
          padding: '6px 14px',
          fontSize: 12,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        {balance?.ok === true ? '¥' + fmt(balance.total ?? 0) : 'DS'}
      </button>
    )
  }

  return (
    <div
      style={{
        ...rootStyle,
        width: 264,
        background: 'rgba(17,24,39,0.94)',
        color: '#e5e7eb',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 12,
        padding: '12px 14px',
        fontSize: 13,
        lineHeight: 1.6,
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{T.title}</span>
        <button
          onClick={() => setCollapsed(true)}
          title={T.collapse}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
          }}
        >
          –
        </button>
      </div>
      {error !== null ? (
        <div style={{ color: '#fca5a5', fontSize: 12 }}>
          {T.unavailable}{error}
          <div style={{ color: '#9ca3af', marginTop: 4 }}>{T.hint}</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af' }}>{T.balance}</span>
            <span>{balance?.ok === true ? '¥' + fmt(balance.total ?? 0) : '…'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: 12 }}>
            <span>{T.topped} {balance?.ok === true ? '¥' + fmt(balance.topped ?? 0) : '…'}</span>
            <span>{T.granted} {balance?.ok === true ? '¥' + fmt(balance.granted ?? 0) : '…'}</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0 6px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af' }}>{T.task}</span>
            <span>{usage?.ok === true ? '¥' + fmt(usage.cost ?? 0) : '…'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: 12 }}>
            <span>{T.tokens}</span>
            <span>
              {usage?.ok === true && usage.usage !== undefined
                ? int(totalTokens(usage.usage))
                : '…'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
