import { formatINR } from "@/lib/money";
import type { Balances } from "@/lib/ledger";

export function EarningsSummary({ b }: { b: Balances }) {
  return (
    <section aria-label="Earnings summary" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-leaf-600 p-5 text-white sm:col-span-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Available to withdraw</p>
        <p className="num mt-1 font-display text-4xl font-extrabold">{formatINR(b.available)}</p>
        <p className="mt-1 text-xs text-white/80">Confirmed profit</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        <Tile label="Pending" value={b.pending} hint="Awaiting store approval" />
        <Tile label="In withdrawal" value={b.inWithdrawal} hint="Being paid out" />
        <Tile label="Paid" value={b.paid} hint="Sent to you" />
      </div>
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      <p className="num mt-1 font-display text-xl font-bold">{formatINR(value)}</p>
      <p className="mt-0.5 hidden text-[11px] text-ink-faint sm:block">{hint}</p>
    </div>
  );
}
