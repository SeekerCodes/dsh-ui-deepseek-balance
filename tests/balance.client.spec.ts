import { describe, it, expect } from 'vitest'
import { parseBalance, fetchBalance } from '../src/balance.js'

describe('parseBalance 余额解析', () => {
  it('标准响应解析', () => {
    const r = parseBalance({
      is_available: true,
      balance_infos: [
        { currency: 'CNY', total_balance: '110.50', granted_balance: '10.00', topped_up_balance: '100.50' },
      ],
    })
    expect(r.isAvailable).toBe(true)
    expect(r.balanceInfos[0]!.totalBalance).toBe(110.5)
    expect(r.balanceInfos[0]!.currency).toBe('CNY')
  })
  it('缺失字段容错为 0', () => {
    const r = parseBalance({ balance_infos: [{ currency: 'CNY' }] })
    expect(r.balanceInfos[0]!.totalBalance).toBe(0)
  })
})

describe('fetchBalance', () => {
  it('成功请求返回解析结果', async () => {
    const fetchFn = async () => new Response(JSON.stringify({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '88' }] }), { status: 200 })
    const r = await fetchBalance('sk-test', 'https://api.deepseek.com', fetchFn)
    expect(r.balanceInfos[0]!.totalBalance).toBe(88)
  })
  it('401 抛错', async () => {
    const fetchFn = async () => new Response('unauthorized', { status: 401 })
    await expect(fetchBalance('bad', 'https://api.deepseek.com', fetchFn)).rejects.toThrow(/401/)
  })
})
