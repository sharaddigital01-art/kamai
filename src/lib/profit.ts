/** Profit estimates shown on deal cards. Real profit always comes from the store's postback. */
export interface StoreRates {
  commissionRateBps: number;
  userShareBps: number;
}

export function estimateProfitPaise(pricePaise: number, rates: StoreRates): number {
  // price × commission% × userShare%  (two basis-point multiplications, BigInt-safe)
  return Number((BigInt(pricePaise) * BigInt(rates.commissionRateBps) * BigInt(rates.userShareBps)) / 100_000_000n);
}

/** "Up to X%" label: commission rate × user share. */
export function profitPercent(rates: StoreRates): number {
  return Math.round(((rates.commissionRateBps * rates.userShareBps) / 1_000_000) * 10) / 10;
}
