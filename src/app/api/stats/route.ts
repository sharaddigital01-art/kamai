import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  getLiveStats,
  getLiveBalances,
  getUserBalances,
  getLiveLedger,
  getLiveWithdrawals,
  getLiveClicks,
  getLiveTotalClicks,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser().catch(() => null);

  // If user is not logged in: return clean unauthenticated zero-state
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      balances: {
        pending: 0,
        available: 0,
        inWithdrawal: 0,
        paid: 0,
        lifetime: 0,
      },
      stats: {
        totalProfitPaise: 0,
        availablePaise: 0,
        pendingPaise: 0,
        paidPaise: 0,
        inWithdrawalPaise: 0,
        totalClicks: 0,
        totalTransactions: 0,
        convRate: "0.0%",
        registeredUsersCount: 1,
      },
      ledger: [],
      withdrawals: [],
      recentClicks: [],
    });
  }

  // User is authenticated: compute their actual ledger & balances
  let balances = {
    pending: 0,
    available: 0,
    inWithdrawal: 0,
    paid: 0,
    lifetime: 0,
  };

  let ledger: any[] = [];
  let withdrawals: any[] = [];
  let totalClicks = 0;
  let totalTxns = 0;

  if (isDatabaseConfigured()) {
    try {
      // Query non-admin transactions for this specific user
      const userRows = await prisma.earningsLedger.findMany({
        where: {
          userId: user.id,
          externalItemId: { not: "platform-cut" },
        },
        include: { store: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      });

      ledger = userRows.map((r) => ({
        id: r.id,
        store: r.store ? { name: r.store.name } : null,
        externalOrderId: r.externalOrderId,
        orderAmountPaise: r.orderAmountPaise,
        userAmountPaise: r.userAmountPaise,
        status: r.status,
        createdAt: r.createdAt,
      }));

      for (const row of userRows) {
        if (row.status === "PENDING") balances.pending += row.userAmountPaise;
        else if (row.status === "CONFIRMED") balances.available += row.userAmountPaise;
        else if (row.status === "PAID") balances.paid += row.userAmountPaise;
      }

      const locked = await prisma.withdrawal.aggregate({
        where: { userId: user.id, status: { in: ["REQUESTED", "PROCESSING"] } },
        _sum: { amountPaise: true },
      });
      const inWithdrawal = locked._sum.amountPaise ?? 0;
      balances.inWithdrawal = inWithdrawal;
      balances.available = Math.max(0, balances.available - inWithdrawal);
      balances.lifetime = balances.pending + balances.available + balances.inWithdrawal + balances.paid;

      const userWithdrawals = await prisma.withdrawal.findMany({
        where: { userId: user.id },
        orderBy: { requestedAt: "desc" },
      });

      withdrawals = userWithdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        amountPaise: w.amountPaise,
        status: w.status,
        method: w.method,
        upiId: (w.payoutSnapshot as any)?.upiId || "UPI",
        requestedAt: w.requestedAt,
      }));

      const clicksCount = await prisma.click.count({ where: { userId: user.id } });
      totalClicks = clicksCount;
      totalTxns = userRows.filter((r) => r.status === "CONFIRMED" || r.status === "PAID").length;
    } catch (e) {
      console.warn("Error calculating user database stats:", e);
    }
  } else {
    // In fallback mode: read dynamic runtime state
    balances = getUserBalances(user.id);
    ledger = getLiveLedger().filter((l) => (l as any).userId === user.id || user.id === DEMO_USER.id);
    withdrawals = getLiveWithdrawals().filter((w) => w.userId === user.id || user.id === DEMO_USER.id);
    totalClicks = getLiveTotalClicks();
    totalTxns = ledger.filter((l) => l.status === "CONFIRMED" || l.status === "PAID").length;
  }

  const convRate = totalClicks > 0 ? `${((totalTxns / totalClicks) * 100).toFixed(1)}%` : "0.0%";

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      referralCode: user.referralCode,
    },
    balances,
    stats: {
      totalProfitPaise: balances.lifetime,
      availablePaise: balances.available,
      pendingPaise: balances.pending,
      paidPaise: balances.paid,
      inWithdrawalPaise: balances.inWithdrawal,
      totalClicks,
      totalTransactions: totalTxns,
      convRate,
      registeredUsersCount: 1,
    },
    ledger,
    withdrawals,
    recentClicks: getLiveClicks().slice(0, 20),
  });
}
