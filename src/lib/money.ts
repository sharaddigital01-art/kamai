/**
 * Safely parses any number or numeric/currency string into integer paise.
 * Examples:
 *   safePaise(2783) => 2783
 *   safePaise("2783") => 2783
 *   safePaise("27.83") => 2783
 *   safePaise("₹27.83") => 2783
 *   safePaise(null) => 0
 */
export function safePaise(val: unknown): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") {
    return isNaN(val) ? 0 : Math.round(val);
  }
  const str = String(val).replace(/[^0-9.-]/g, "").trim();
  if (!str) return 0;
  if (str.includes(".")) {
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.round(num * 100);
  }
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Safely parses a commission value in Rupees into integer paise.
 * Examples:
 *   safeCommissionPaise(27.83) => 2783
 *   safeCommissionPaise("27.83") => 2783
 *   safeCommissionPaise("₹27.83") => 2783
 */
export function safeCommissionPaise(val: unknown): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") {
    return isNaN(val) ? 0 : Math.round(val * 100);
  }
  const str = String(val).replace(/[^0-9.-]/g, "").trim();
  if (!str) return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

/** All money is integer paise. Convert only at the edges. */
export function formatINR(paise: unknown): string {
  const numericPaise =
    typeof paise === "number"
      ? isNaN(paise)
        ? 0
        : paise
      : safePaise(paise);
  const rupees = numericPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Math.round(numericPaise) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** amount × bps / 10_000, floored, using BigInt so large orders can't lose precision. */
export function mulBps(amountPaise: number, bps: number): number {
  return Number(
    (BigInt(Math.trunc(amountPaise)) * BigInt(Math.trunc(bps))) / 10_000n
  );
}

export const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);
