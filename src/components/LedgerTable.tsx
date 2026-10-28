import type { LedgerStatus } from "@prisma/client";
import { clsx } from "clsx";
import { formatINR } from "@/lib/money";

export interface LedgerRow {
  id: string;
  storeName: string | null;
  orderRef: string;
  orderAmountPaise: number;
  userAmountPaise: number;
  status: LedgerStatus;
  createdAt: string;
}

const PILL: Record<LedgerStatus, string> = {
  PENDING: "bg-saffron-50 text-saffron-700",
  CONFIRMED: "bg-leaf-50 text-leaf-700",
  PAID: "bg-leaf-600 text-white",
  REJECTED: "bg-canvas text-ink-faint",
};
const LABEL: Record<LedgerStatus, string> = { PENDING: "Pending", CONFIRMED: "Confirmed", PAID: "Paid", REJECTED: "Rejected" };

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
        <p className="font-display text-lg font-bold">No orders yet</p>
        <p className="mt-1 text-sm text-ink-soft">Share a profit link. Orders show up here as stores report them, usually within a day or two.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{r.storeName ?? "Adjustment"}</p>
            <p className="num truncate text-xs text-ink-faint">
              {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · Order {r.orderRef}
              {r.orderAmountPaise > 0 && ` · ${formatINR(r.orderAmountPaise)}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={clsx("num font-display text-base font-bold", r.status === "REJECTED" && "text-ink-faint line-through")}>
              {formatINR(r.userAmountPaise)}
            </span>
            <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", PILL[r.status])}>{LABEL[r.status]}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
