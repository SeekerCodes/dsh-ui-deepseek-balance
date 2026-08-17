import { describe, it, expect } from 'vitest'
import { computeCost, DEFAULT_PRICES } from '../src/cost.js'

describe('computeCost 任务花费', () => {
  it('基础：输入输出按单价计费', () => {
    // 输入 1M tokens × 2 元 + 输出 1M tokens × 8 元 = 10 元
    expect(computeCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(10)
  })
  it('cache 命中按低价计费', () => {
    const cost = computeCost({ inputTokens: 100_000, outputTokens: 50_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 200_000 })
    const expected = 0.1 * 2 + 0.05 * 8 + 1.0 * 0.5 + 0.2 * 2 // 0.2+0.4+0.5+0.4=1.5
    expect(cost).toBeCloseTo(expected, 4)
  })
  it('零用量花费为 0', () => {
    expect(computeCost({ inputTokens: 0, outputTokens: 0 })).toBe(0)
  })
  it('自定义单价生效', () => {
    const cost = computeCost({ inputTokens: 1_000_000, outputTokens: 0 }, { ...DEFAULT_PRICES, input: 4 })
    expect(cost).toBe(4)
  })
  it('结果保留 4 位小数', () => {
    const cost = computeCost({ inputTokens: 123, outputTokens: 456 })
    expect(Number.isInteger(cost * 10000)).toBe(true)
  })
})
