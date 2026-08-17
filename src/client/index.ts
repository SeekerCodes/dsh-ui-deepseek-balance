/**
 * DeepSeek 余额/成本悬浮组件（browser half，独立发布版）。
 *
 * 通过 slots.inject 在 'shell.overlay'（ui-layout 声明的全局悬浮层：
 * 位于所有栏位之上、默认点击穿透）注册 BalanceWidget。
 * 组件只 fetch http://127.0.0.1:3199 上的 host 数据服务，不接触任何密钥。
 *
 * 兼容性：若当前 dsh 构建未声明 shell.overlay（旧版本），slots.inject
 * 会安静地等待声明、永不挂载——组件不出现、页面不受影响（优雅降级）。
 */
import { BalanceWidget } from './BalanceWidget.tsx'

export { BalanceWidget } from './BalanceWidget.tsx'

/** DSH client 插件上下文的结构化子集（slots 服务的注入/注册面）。 */
export interface DshClientContext {
  effect(fn: () => unknown, label?: string): void
  slots: {
    inject(key: string, callback: () => unknown): unknown
    register(options: { name: string; id?: string; order?: number }, component: unknown): unknown
  }
}

/** 需要 slots 服务（shell.overlay 由 ui-layout 声明）。 */
export const inject = ['slots']

/**
 * Client 插件入口：等 shell.overlay 声明就绪后注册悬浮组件。
 * @param ctx - client root context。
 */
export function apply(ctx: DshClientContext): void {
  ctx.effect(() =>
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'ds-balance',
      order: 10,
    }, BalanceWidget)),
  'dsh-ui-deepseek-balance: shell.overlay widget')
}
