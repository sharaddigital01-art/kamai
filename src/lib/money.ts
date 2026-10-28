/** All money is integer paise. Convert only at the edges. */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** amount × bps / 10_000, floored, using BigInt so large orders can't lose precision. */
export function mulBps(amountPaise: number, bps: number): number {
  return Number((BigInt(Math.trunc(amountPaise)) * BigInt(Math.trunc(bps))) / 10_000n);
}

export const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);
