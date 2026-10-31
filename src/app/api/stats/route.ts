import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  getLiveBalances,
  getUserBalances,
  getLiveLedger,
  getLiveWithdrawals,
  getLiveClicks,
  getLiveTotalClicks,
  getMockConversions,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getApiUser().catch(() => null);

  const emptyDailyStats = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"].map((label) => ({
    date: "",
    label,
    clicks: 0,
    profitPaise: 0,
    orders: 0,
  }));

  // If user is not logged in: return clean unauthenticated zero-state
  if (!user) {
    const res = NextResponse.json({
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
      dailyStats: emptyDailyStats,
      conversions: [],
      ledger: [],
      withdrawals: [],
      recentClicks: [],
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    return res;
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
  let conversions: any[] = [];
  let dailyStats: {
    date: string;
    label: string;
    clicks: number;
    profitPaise: number;
    orders: number;
  }[] = [];
  let totalClicks = 0;
  let totalTxns = 0;

  if (isDatabaseConfigured()) {
    try {
      // 1. Query non-admin transactions from earningsLedger
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

      // 2. Real Total Clicks = Click rows + ShortLink clicks + GeneratedLink clicks
      const clicksCount = await prisma.click.count({ where: { userId: user.id } });
      const shortAgg = await prisma.shortLink.aggregate({
        where: { userId: user.id },
        _sum: { clickCount: true },
      });
      const genAgg = await prisma.generatedLink.aggregate({
        where: { userId: user.id },
        _sum: { clickCount: true },
      });
      const sumShort = shortAgg._sum.clickCount ?? 0;
      const sumGen = genAgg._sum.clickCount ?? 0;
      totalClicks = Math.max(clicksCount, sumShort + sumGen);

      // 3. User Conversions by userId OR subId
      const userPrefix = (user as any).subIdPrefix || user.referralCode || user.id.slice(0, 6);
      const userConversions = await prisma.conversion.findMany({
        where: {
          OR: [
            { userId: user.id },
            { subid: userPrefix },
            { subid: `${userPrefix}_tg` },
            { subid: { startsWith: userPrefix } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      conversions = userConversions.map((c) => ({
        id: c.id,
        transactionId: c.transactionId,
        storeName: c.storeName,
        saleAmount: c.saleAmount,
        commission: c.commission,
        status: c.status,
        subid: c.subid,
        createdAt: c.createdAt,
      }));

      const approvedConversions = userConversions.filter(
        (c) => c.status === "PAID" || c.status === "CONFIRMED" || c.status === "confirmed"
      );
      const approvedCommissionPaise = approvedConversions.reduce(
        (acc, c) => acc + Math.round(c.commission * 100),
        0
      );

      if (approvedCommissionPaise > 0) {
        balances.lifetime = Math.max(balances.lifetime, approvedCommissionPaise);
        balances.available = Math.max(
          0,
          balances.lifetime - balances.pending - balances.inWithdrawal - balances.paid
        );
      }

      totalTxns = Math.max(
        userConversions.length,
        userRows.filter((r) => r.status === "CONFIRMED" || r.status === "PAID").length
      );

      // 4. Daily grouped clicks and profit for chart
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const recentClicks = await prisma.click.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true },
      });

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });

        const dayClicks = recentClicks.filter(
          (c) => c.createdAt.toISOString().slice(0, 10) === dateStr
        ).length;

        const dayConversions = userConversions.filter(
          (c) => c.createdAt.toISOString().slice(0, 10) === dateStr
        );

        const dayProfitPaise = dayConversions
          .filter((c) => c.status === "PAID" || c.status === "CONFIRMED" || c.status === "confirmed")
          .reduce((sum, c) => sum + Math.round(c.commission * 100), 0);

        const dayOrders = dayConversions.length;

        dailyStats.push({
          date: dateStr,
          label: dayLabel,
          clicks: dayClicks,
          profitPaise: dayProfitPaise,
          orders: dayOrders,
        });
      }

      // If no day-bucketed click timestamps exist but totalClicks > 0, show total on Today
      const todayStat = dailyStats[dailyStats.length - 1];
      if (todayStat) {
        if (dailyStats.every((d) => d.clicks === 0) && totalClicks > 0) {
          todayStat.clicks = totalClicks;
        }
        if (dailyStats.every((d) => d.profitPaise === 0) && balances.lifetime > 0) {
          todayStat.profitPaise = balances.lifetime;
          todayStat.orders = totalTxns;
        }
      }
    } catch (e) {
      console.warn("Error calculating user database stats:", e);
    }
  } else {
    // Fallback mode: read dynamic runtime mock state
    balances = getUserBalances(user.id);
    ledger = getLiveLedger().filter((l) => (l as any).userId === user.id || user.id === DEMO_USER.id);
    withdrawals = getLiveWithdrawals().filter((w) => w.userId === user.id || user.id === DEMO_USER.id);
    conversions = getMockConversions(user.id);
    totalClicks = getLiveTotalClicks();
    totalTxns = Math.max(
      conversions.length,
      ledger.filter((l) => l.status === "CONFIRMED" || l.status === "PAID").length
    );

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });

      dailyStats.push({
        date: dateStr,
        label: dayLabel,
        clicks: i === 0 ? totalClicks : 0,
        profitPaise: i === 0 ? balances.lifetime : 0,
        orders: i === 0 ? totalTxns : 0,
      });
    }
  }

  const convRate = totalClicks > 0 ? `${((totalTxns / totalClicks) * 100).toFixed(1)}%` : "0.0%";

  const res = NextResponse.json({
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
    dailyStats,
    conversions,
    ledger,
    withdrawals,
    recentClicks: getLiveClicks().slice(0, 20),
  });

  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}
