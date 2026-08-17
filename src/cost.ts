/** DeepSeek 任务成本计算：token 用量 × 单价 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}
/** 单价：元 / 1M tokens */
export interface TokenPrices {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}
export const DEFAULT_PRICES: TokenPrices = {
  input: 2.0,
  output: 8.0,
  cacheRead: 0.5,
  cacheWrite: 2.0,
};
/** 计算一次任务花费（元），保留 4 位小数 */
export function computeCost(usage: TokenUsage, prices: TokenPrices = DEFAULT_PRICES): number {
  const tokens =
    usage.inputTokens * prices.input +
    usage.outputTokens * prices.output +
    (usage.cacheReadTokens ?? 0) * prices.cacheRead +
    (usage.cacheWriteTokens ?? 0) * prices.cacheWrite;
  return Math.round((tokens / 1_000_000) * 10000) / 10000;
}
