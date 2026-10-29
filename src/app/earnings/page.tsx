import { clsx } from "clsx";
import { EarningsSummary } from "@/components/EarningsSummary";
import { LedgerTable, type LedgerRow } from "@/components/LedgerTable";
import { LiveEarnings } from "@/components/LiveEarnings";
import { PayoutForm } from "@/components/PayoutForm";
import { WithdrawButton } from "@/components/WithdrawButton";
import { requirePageUser } from "@/lib/auth";
import { getBalances } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, MOCK_BALANCES, MOCK_LEDGER_ROWS, MOCK_WITHDRAWALS, MOCK_PAYOUT } from "@/lib/mockData";

export const metadata = { title: "My earnings · Kamai" };

export default async function EarningsPage() {
  const user = await requirePageUser("/earnings");

  let balances = MOCK_BALANCES;
  let ledger: Array<{
    id: string;
    store: { name: string } | null;
    externalOrderId: string;
    orderAmountPaise: number;
    userAmountPaise: number;
    status: any;
    createdAt: Date;
  }> = MOCK_LEDGER_ROWS;
  let withdrawals: Array<{ id: string; requestedAt: Date; amountPaise: number; status: any }> = MOCK_WITHDRAWALS;
  let payout: { upiId: string | null; accountHolder: string | null } | null = MOCK_PAYOUT;

  if (isDatabaseConfigured()) {
    try {
      const [b, l, w, p] = await Promise.all([
        getBalances(user.id),
        prisma.earningsLedger.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { store: { select: { name: true } } },
        }),
        prisma.withdrawal.findMany({ where: { userId: user.id }, orderBy: { requestedAt: "desc" }, take: 10 }),
        prisma.payoutAccount.findUnique({ where: { userId: user.id } }),
      ]);
      balances = b;
      ledger = l;
      withdrawals = w;
      payout = p;
    } catch (err) {
      console.warn("Database error in EarningsPage, using mock earnings:", err);
    }
  }

  const rows: LedgerRow[] = ledger.map((e) => ({
    id: e.id,
    storeName: e.store?.name ?? null,
    orderRef: e.externalOrderId.slice(-8),
    orderAmountPaise: e.orderAmountPaise,
    userAmountPaise: e.userAmountPaise,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  }));
  const inProgress = withdrawals.some((w) => w.status === "REQUESTED" || w.status === "PROCESSING");

  return (
    <div className="space-y-6 pt-6">
      <LiveEarnings />
      <h1 className="font-display text-3xl font-extrabold tracking-tight">My earnings</h1>
      <EarningsSummary b={balances} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section aria-labelledby="wd-h" className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <h2 id="wd-h" className="mb-3 font-display text-lg font-bold">
              Withdraw
            </h2>
            <WithdrawButton
              availablePaise={balances.available}
              hasPayout={Boolean(payout)}
              inProgress={inProgress}
              userEmail={user.email ?? ""}
              userName={user.name ?? undefined}
              defaultUpiId={payout?.upiId ?? undefined}
            />
          </section>

          <section aria-labelledby="ledger-h">
            <h2 id="ledger-h" className="mb-3 font-display text-lg font-bold">
              Orders & profit
            </h2>
            <LedgerTable rows={rows} />
          </section>
        </div>

        <aside className="space-y-6">
          <PayoutForm upiId={payout?.upiId ?? null} accountHolder={payout?.accountHolder ?? null} />

          <section aria-labelledby="hist-h">
            <h2 id="hist-h" className="mb-3 font-display text-lg font-bold">
              Withdrawals
            </h2>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-ink-soft">No withdrawals yet.</p>
            ) : (
              <ul className="divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
                {withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="num text-ink-soft">{w.requestedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span className="num font-bold">{formatINR(w.amountPaise)}</span>
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        w.status === "PAID" ? "bg-leaf-600 text-white" : w.status === "FAILED" ? "bg-canvas text-ink-faint" : "bg-saffron-50 text-saffron-700",
                      )}
                    >
                      {w.status.charAt(0) + w.status.slice(1).toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
