/** DeepSeek 账户余额查询与解析 */
export interface BalanceInfo {
  currency: string;
  totalBalance: number;
  grantedBalance: number;
  toppedUpBalance: number;
}
export interface BalanceResult {
  isAvailable: boolean;
  balanceInfos: BalanceInfo[];
}
/** 解析 GET /user/balance 响应 */
export function parseBalance(json: unknown): BalanceResult {
  const d = json as { is_available?: boolean; balance_infos?: unknown[] };
  const infos = (d.balance_infos ?? []).map((b) => {
    const x = b as Record<string, unknown>;
    return {
      currency: String(x.currency ?? 'CNY'),
      totalBalance: Number(x.total_balance ?? 0),
      grantedBalance: Number(x.granted_balance ?? 0),
      toppedUpBalance: Number(x.topped_up_balance ?? 0),
    };
  });
  return { isAvailable: d.is_available ?? false, balanceInfos: infos };
}
/** 查询余额；fetchFn 可注入以便测试 */
export async function fetchBalance(
  apiKey: string,
  baseUrl = 'https://api.deepseek.com',
  fetchFn: typeof fetch = fetch,
): Promise<BalanceResult> {
  const res = await fetchFn(baseUrl + '/user/balance', {
    headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('balance request failed: ' + res.status + ' ' + (await res.text()));
  }
  return parseBalance(await res.json());
}
