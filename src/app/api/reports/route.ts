import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safePaise, safeCommissionPaise } from "@/lib/money";
import {
  isDatabaseConfigured,
  getUserBalances,
  getLiveLedger,
  getLiveWithdrawals,
  getLiveClicks,
  getLiveTotalClicks,
  getMockConversions,
  findMockUserById,
  DEMO_USER,
} from "@/lib/mockData";
import {
  fetchCuelinksTransactions,
  syncCuelinksTransactions,
  fetchCuelinksClicks,
  syncCuelinksClicks,
} from "@/lib/cuelinksSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleReports(req: Request) {
  const reqUrl = new URL(req.url);
  const queryUserId = reqUrl.searchParams.get("userId");
  const querySubId =
    reqUrl.searchParams.get("subid") || reqUrl.searchParams.get("subId");
  const shouldSync = reqUrl.searchParams.get("sync") === "true";
  const queryRange = (
    reqUrl.searchParams.get("range") || "all"
  ).toLowerCase().trim();
  const queryStartDate =
    reqUrl.searchParams.get("startDate") ||
    reqUrl.searchParams.get("start_date");
  const queryEndDate =
    reqUrl.searchParams.get("endDate") || reqUrl.searchParams.get("end_date");

  // Determine date boundaries
  const now = new Date();
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (queryRange === "all") {
    rangeStart = null;
    rangeEnd = null;
  } else if (queryStartDate) {
    const s = new Date(queryStartDate);
    rangeStart = isNaN(s.getTime()) ? null : s;
    const e = queryEndDate ? new Date(queryEndDate) : now;
    rangeEnd = isNaN(e.getTime()) ? now : e;
  } else if (queryRange === "today") {
    rangeStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    rangeEnd = now;
  } else if (queryRange === "yesterday") {
    rangeStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
      0
    );
    rangeEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
      999
    );
  } else if (queryRange === "7d") {
    rangeStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0
    );
    rangeEnd = now;
  } else if (queryRange === "30d") {
    rangeStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
      0,
      0,
      0,
      0
    );
    rangeEnd = now;
  } else {
    rangeStart = null;
    rangeEnd = null;
  }

  let user = await getApiUser().catch(() => null);

  if (!user && (queryUserId || querySubId)) {
    if (queryUserId && isDatabaseConfigured()) {
      try {
        const u = await prisma.user.findUnique({ where: { id: queryUserId } });
        if (u) user = u as any;
      } catch {}
    }
    if (!user && queryUserId) {
      const mockU = findMockUserById(queryUserId);
      if (mockU) user = mockU as any;
    }
  }

  const emptyDailyStats = [
    "Day 1",
    "Day 2",
    "Day 3",
    "Day 4",
    "Day 5",
    "Day 6",
    "Today",
  ].map((label) => ({
    date: "",
    label,
    clicks: 0,
    profitPaise: 0,
    orders: 0,
  }));

  // Guest response
  if (!user) {
    const res = NextResponse.json({
      authenticated: false,
      user: null,
      activeSubId: null,
      range: queryRange,
      balances: {
        pending: 0,
        available: 0,
        inWithdrawal: 0,
        paid: 0,
        lifetime: 0,
      },
      stats: {
        totalProfitPaise: 0,
        allTimeProfitPaise: 0,
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
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    res.headers.set("Pragma", "no-cache");
    return res;
  }

  // Determine user active subId strictly (never a static or master account subId)
  const userPrefix = (
    (user as any).subIdPrefix ||
    user.referralCode ||
    user.id.slice(0, 8)
  ).trim();
  const activeSubId =
    (querySubId || "").trim() || `${userPrefix}_tg` || userPrefix;

  // If sync requested or on refresh: fetch external affiliate stats strictly by active subId
  if (shouldSync && activeSubId) {
    try {
      const [transactions, clicks] = await Promise.all([
        fetchCuelinksTransactions({ subId: activeSubId }).catch(() => []),
        fetchCuelinksClicks({ subId: activeSubId }).catch(() => []),
      ]);
      if (transactions.length > 0) {
        await syncCuelinksTransactions(transactions, {
          filterUserId: user.id,
          targetSubId: activeSubId,
        });
      }
      if (clicks.length > 0) {
        await syncCuelinksClicks(clicks, {
          filterUserId: user.id,
          targetSubId: activeSubId,
        });
      }
    } catch (syncErr) {
      console.warn("Reports active subId sync error:", syncErr);
    }
  }

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
  let periodProfitPaise = 0;

  const rawSubIds = [
    activeSubId,
    userPrefix,
    `${userPrefix}_tg`,
    `${userPrefix}_web`,
    `${userPrefix}_link`,
    user.id,
    user.referralCode,
  ].filter(Boolean) as string[];

  const userSubIds = Array.from(
    new Set([
      ...rawSubIds,
      ...rawSubIds.map((s) => s.toLowerCase()),
      ...rawSubIds.map((s) => s.toUpperCase()),
    ])
  );

  let dbSuccess = false;
  if (isDatabaseConfigured()) {
    try {
      const clickWhere = {
        OR: [
          { userId: user.id },
          { subId: { in: userSubIds, mode: "insensitive" as const } },
          { subId: { startsWith: userPrefix, mode: "insensitive" as const } },
          {
            subId: {
              startsWith: userPrefix.toLowerCase(),
              mode: "insensitive" as const,
            },
          },
        ],
      };

      const dateFilter = rangeStart
        ? {
            createdAt: {
              gte: rangeStart,
              ...(rangeEnd ? { lte: rangeEnd } : {}),
            },
          }
        : undefined;

      // Execute queries concurrently
      const [
        allUserRows,
        locked,
        userWithdrawals,
        periodClicksCount,
        shortAgg,
        genAgg,
        allUserConversions,
        recentClicks,
      ] = await Promise.all([
        prisma.earningsLedger.findMany({
          where: {
            userId: user.id,
            externalItemId: { not: "platform-cut" },
          },
          select: {
            id: true,
            externalOrderId: true,
            orderAmountPaise: true,
            userAmountPaise: true,
            status: true,
            createdAt: true,
            store: { select: { name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.withdrawal.aggregate({
          where: {
            userId: user.id,
            status: { in: ["REQUESTED", "PROCESSING"] },
          },
          _sum: { amountPaise: true },
        }),
        prisma.withdrawal.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            userId: true,
            amountPaise: true,
            status: true,
            method: true,
            payoutSnapshot: true,
            requestedAt: true,
          },
          orderBy: { requestedAt: "desc" },
        }),
        prisma.click.count({
          where: {
            ...clickWhere,
            ...(dateFilter || {}),
          },
        }),
        prisma.shortLink.aggregate({
          where: clickWhere,
          _sum: { clickCount: true },
        }),
        prisma.generatedLink.aggregate({
          where: clickWhere,
          _sum: { clickCount: true },
        }),
        prisma.conversion.findMany({
          where: {
            OR: [
              { userId: user.id },
              { subid: { in: userSubIds, mode: "insensitive" as const } },
              {
                subid: {
                  startsWith: userPrefix,
                  mode: "insensitive" as const,
                },
              },
              {
                subid: {
                  startsWith: userPrefix.toLowerCase(),
                  mode: "insensitive" as const,
                },
              },
            ],
          },
          select: {
            id: true,
            transactionId: true,
            storeName: true,
            saleAmount: true,
            commission: true,
            status: true,
            subid: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.click.findMany({
          where: {
            ...clickWhere,
            ...(rangeStart
              ? {
                  createdAt: {
                    gte: rangeStart,
                    ...(rangeEnd ? { lte: rangeEnd } : {}),
                  },
                }
              : {
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 86400000),
                  },
                }),
          },
          select: { createdAt: true },
        }),
      ]);

      // Calculate lifetime balances across all history
      for (const row of allUserRows) {
        if (row.status === "PENDING") balances.pending += row.userAmountPaise;
        else if (row.status === "CONFIRMED")
          balances.available += row.userAmountPaise;
        else if (row.status === "PAID") balances.paid += row.userAmountPaise;
      }

      const inWithdrawal = locked._sum.amountPaise ?? 0;
      balances.inWithdrawal = inWithdrawal;
      balances.available = Math.max(0, balances.available - inWithdrawal);
      balances.lifetime =
        balances.pending +
        balances.available +
        balances.inWithdrawal +
        balances.paid;

      const approvedConversions = allUserConversions.filter(
        (c) =>
          c.status === "PAID" ||
          c.status === "CONFIRMED" ||
          c.status === "confirmed"
      );
      const approvedCommissionPaise = approvedConversions.reduce(
        (acc, c) => acc + Math.round(c.commission * 100),
        0
      );

      if (approvedCommissionPaise > 0) {
        balances.lifetime = Math.max(balances.lifetime, approvedCommissionPaise);
        balances.available = Math.max(
          0,
          balances.lifetime -
            balances.pending -
            balances.inWithdrawal -
            balances.paid
        );
      }

      // Filter rows and conversions strictly by the requested date range
      const filteredLedgerRows = allUserRows.filter((r) => {
        if (!rangeStart) return true;
        const rTime = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        if (rangeEnd)
          return (
            rTime >= rangeStart.getTime() && rTime <= rangeEnd.getTime()
          );
        return rTime >= rangeStart.getTime();
      });

      const filteredConversions = allUserConversions.filter((c) => {
        if (!rangeStart) return true;
        const cTime = c.createdAt ? new Date(c.createdAt).getTime() : 0;
        if (rangeEnd)
          return (
            cTime >= rangeStart.getTime() && cTime <= rangeEnd.getTime()
          );
        return cTime >= rangeStart.getTime();
      });

      ledger = filteredLedgerRows.map((r) => ({
        id: r.id,
        store: r.store ? { name: r.store.name } : null,
        externalOrderId: r.externalOrderId,
        orderAmountPaise: r.orderAmountPaise,
        userAmountPaise: r.userAmountPaise,
        status: r.status,
        createdAt: r.createdAt,
      }));

      conversions = filteredConversions.map((c) => ({
        id: c.id,
        transactionId: c.transactionId,
        storeName: c.storeName,
        saleAmount: c.saleAmount,
        commission: c.commission,
        status: c.status,
        subid: c.subid,
        createdAt: c.createdAt,
      }));

      withdrawals = userWithdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        amountPaise: w.amountPaise,
        status: w.status,
        method: w.method,
        upiId: (w.payoutSnapshot as any)?.upiId || "UPI",
        requestedAt: w.requestedAt,
      }));

      // Calculate total clicks for the period
      const sumShort = shortAgg._sum.clickCount ?? 0;
      const sumGen = genAgg._sum.clickCount ?? 0;
      totalClicks =
        queryRange === "all"
          ? Math.max(periodClicksCount, sumShort + sumGen)
          : periodClicksCount;

      // Count successful orders in the selected range
      const successfulOrderIds = new Set<string>();
      for (const c of filteredConversions) {
        const st = String(c.status || "").toLowerCase();
        if (st !== "rejected" && st !== "cancelled" && st !== "failed") {
          successfulOrderIds.add(String(c.transactionId || c.id));
        }
      }
      for (const r of filteredLedgerRows) {
        const st = String(r.status || "").toLowerCase();
        if (st !== "rejected" && st !== "cancelled" && st !== "failed") {
          successfulOrderIds.add(String(r.externalOrderId || r.id));
        }
      }

      totalTxns = Math.max(
        successfulOrderIds.size,
        filteredConversions.filter((c) => {
          const st = String(c.status || "").toLowerCase();
          return st !== "rejected" && st !== "cancelled" && st !== "failed";
        }).length,
        filteredLedgerRows.filter((r) => {
          const st = String(r.status || "").toLowerCase();
          return st !== "rejected" && st !== "cancelled" && st !== "failed";
        }).length
      );

      // Period profit: dynamically sum all valid non-rejected earnings in this date range
      const periodLedgerProfit = filteredLedgerRows
        .filter((r) => {
          const st = String(r.status || "").toUpperCase();
          return st !== "REJECTED" && st !== "CANCELLED" && st !== "FAILED";
        })
        .reduce((sum, r) => sum + safePaise(r.userAmountPaise), 0);

      const periodConvProfit = filteredConversions
        .filter((c) => {
          const st = String(c.status || "").toLowerCase();
          return st !== "rejected" && st !== "cancelled" && st !== "failed";
        })
        .reduce((sum, c) => sum + safeCommissionPaise(c.commission), 0);

      periodProfitPaise =
        queryRange === "all"
          ? balances.lifetime
          : Math.max(periodLedgerProfit, periodConvProfit);

      // Construct graph daily/hourly stats tailored to requested period
      if (queryRange === "today") {
        const hourBuckets = [
          { label: "12 AM", startHour: 0, endHour: 4 },
          { label: "4 AM", startHour: 4, endHour: 8 },
          { label: "8 AM", startHour: 8, endHour: 12 },
          { label: "12 PM", startHour: 12, endHour: 16 },
          { label: "4 PM", startHour: 16, endHour: 20 },
          { label: "8 PM", startHour: 20, endHour: 24 },
          { label: "Now", startHour: 0, endHour: 24 },
        ];
        const todayDateStr = now.toISOString().slice(0, 10);

        for (let bIdx = 0; bIdx < hourBuckets.length; bIdx++) {
          const bucket = hourBuckets[bIdx]!;
          if (bIdx === hourBuckets.length - 1) {
            // "Now" cumulative/summary point
            dailyStats.push({
              date: todayDateStr,
              label: bucket.label,
              clicks: totalClicks,
              profitPaise: periodProfitPaise,
              orders: totalTxns,
            });
          } else {
            const bClicks = recentClicks.filter((c) => {
              const h = c.createdAt.getHours();
              return h >= bucket.startHour && h < bucket.endHour;
            }).length;
            const bConvs = filteredConversions.filter((c) => {
              const h = c.createdAt.getHours();
              return h >= bucket.startHour && h < bucket.endHour;
            });
            const bProfit = bConvs
              .filter((c) => {
                const st = String(c.status || "").toLowerCase();
                return st === "paid" || st === "confirmed" || st === "approved";
              })
              .reduce((sum, c) => sum + Math.round(c.commission * 100), 0);
            dailyStats.push({
              date: todayDateStr,
              label: bucket.label,
              clicks: bClicks,
              profitPaise: bProfit,
              orders: bConvs.length,
            });
          }
        }
      } else if (queryRange === "yesterday") {
        const hourBuckets = [
          { label: "12 AM", startHour: 0, endHour: 4 },
          { label: "4 AM", startHour: 4, endHour: 8 },
          { label: "8 AM", startHour: 8, endHour: 12 },
          { label: "12 PM", startHour: 12, endHour: 16 },
          { label: "4 PM", startHour: 16, endHour: 20 },
          { label: "8 PM", startHour: 20, endHour: 24 },
          { label: "11:59 PM", startHour: 0, endHour: 24 },
        ];
        const yDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        const yDateStr = yDate.toISOString().slice(0, 10);

        for (let bIdx = 0; bIdx < hourBuckets.length; bIdx++) {
          const bucket = hourBuckets[bIdx]!;
          if (bIdx === hourBuckets.length - 1) {
            dailyStats.push({
              date: yDateStr,
              label: bucket.label,
              clicks: totalClicks,
              profitPaise: periodProfitPaise,
              orders: totalTxns,
            });
          } else {
            const bClicks = recentClicks.filter((c) => {
              const h = c.createdAt.getHours();
              return h >= bucket.startHour && h < bucket.endHour;
            }).length;
            const bConvs = filteredConversions.filter((c) => {
              const h = c.createdAt.getHours();
              return h >= bucket.startHour && h < bucket.endHour;
            });
            const bProfit = bConvs
              .filter((c) => {
                const st = String(c.status || "").toLowerCase();
                return st === "paid" || st === "confirmed" || st === "approved";
              })
              .reduce((sum, c) => sum + Math.round(c.commission * 100), 0);
            dailyStats.push({
              date: yDateStr,
              label: bucket.label,
              clicks: bClicks,
              profitPaise: bProfit,
              orders: bConvs.length,
            });
          }
        }
      } else if (queryRange === "30d") {
        const daySteps = [29, 24, 19, 14, 9, 4, 0];
        for (let idx = 0; idx < daySteps.length; idx++) {
          const step = daySteps[idx]!;
          const d = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - step
          );
          const dateStr = d.toISOString().slice(0, 10);
          const dayLabel = step === 0 ? "Today" : `Day ${30 - step}`;

          const dayClicks = recentClicks.filter(
            (c) => c.createdAt.toISOString().slice(0, 10) === dateStr
          ).length;

          const dayConversions = filteredConversions.filter(
            (c) => c.createdAt.toISOString().slice(0, 10) === dateStr
          );

          const dayProfit = dayConversions
            .filter((c) => {
              const st = String(c.status || "").toLowerCase();
              return st === "paid" || st === "confirmed" || st === "approved";
            })
            .reduce((sum, c) => sum + Math.round(c.commission * 100), 0);

          dailyStats.push({
            date: dateStr,
            label: dayLabel,
            clicks: dayClicks,
            profitPaise: dayProfit,
            orders: dayConversions.length,
          });
        }
      } else {
        // "7d" and "all" (default 7 days)
        for (let i = 6; i >= 0; i--) {
          const d = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - i
          );
          const dateStr = d.toISOString().slice(0, 10);
          const dayLabel =
            i === 0
              ? "Today"
              : d.toLocaleDateString("en-US", { weekday: "short" });

          const dayClicks = recentClicks.filter(
            (c) => c.createdAt.toISOString().slice(0, 10) === dateStr
          ).length;

          const dayConversions = filteredConversions.filter(
            (c) => c.createdAt.toISOString().slice(0, 10) === dateStr
          );

          const dayProfitPaise = dayConversions
            .filter((c) => {
              const st = String(c.status || "").toLowerCase();
              return st === "paid" || st === "confirmed" || st === "approved";
            })
            .reduce((sum, c) => sum + Math.round(c.commission * 100), 0);

          dailyStats.push({
            date: dateStr,
            label: dayLabel,
            clicks: dayClicks,
            profitPaise: dayProfitPaise,
            orders: dayConversions.length,
          });
        }
      }

      // If curve is all zero but period has total metrics, ensure the last point reflects the total
      const lastStat = dailyStats[dailyStats.length - 1];
      if (lastStat) {
        if (dailyStats.every((d) => d.clicks === 0) && totalClicks > 0) {
          lastStat.clicks = totalClicks;
        }
        if (
          dailyStats.every((d) => d.profitPaise === 0) &&
          periodProfitPaise > 0
        ) {
          lastStat.profitPaise = periodProfitPaise;
          lastStat.orders = totalTxns;
        }
      }
      dbSuccess = true;
    } catch (e) {
      console.warn("Error calculating user database reports stats, using fallback:", e);
      dbSuccess = false;
    }
  }

  if (!dbSuccess) {
    // Fallback mode (mock store / test environments)
    balances = getUserBalances(user.id);
    const allLedger = getLiveLedger().filter(
      (l) => (l as any).userId === user.id || user.id === DEMO_USER.id
    );
    const allConversions = getMockConversions(user.id);
    const allClicks = getLiveClicks(user.id);

    const filteredLedger = allLedger.filter((l) => {
      if (!rangeStart) return true;
      const lTime = l.createdAt ? new Date(l.createdAt).getTime() : 0;
      if (rangeEnd)
        return (
          lTime >= rangeStart.getTime() && lTime <= rangeEnd.getTime()
        );
      return lTime >= rangeStart.getTime();
    });

    const filteredConversions = allConversions.filter((c) => {
      if (!rangeStart) return true;
      const cTime = c.createdAt ? new Date(c.createdAt).getTime() : 0;
      if (rangeEnd)
        return (
          cTime >= rangeStart.getTime() && cTime <= rangeEnd.getTime()
        );
      return cTime >= rangeStart.getTime();
    });

    const filteredClicks = allClicks.filter((c) => {
      if (!rangeStart) return true;
      const cTime = c.timestamp ? new Date(c.timestamp).getTime() : 0;
      if (rangeEnd)
        return (
          cTime >= rangeStart.getTime() && cTime <= rangeEnd.getTime()
        );
      return cTime >= rangeStart.getTime();
    });

    ledger = filteredLedger;
    conversions = filteredConversions;
    withdrawals = getLiveWithdrawals().filter(
      (w) => w.userId === user.id || user.id === DEMO_USER.id
    );

    totalClicks =
      queryRange === "all"
        ? Math.max(getLiveTotalClicks(user.id), allClicks.length)
        : filteredClicks.length;

    totalTxns = Math.max(
      filteredConversions.filter(
        (c) => {
          const st = String(c.status || "").toLowerCase();
          return st !== "rejected" && st !== "cancelled" && st !== "failed";
        }
      ).length,
      filteredLedger.filter(
        (l) => {
          const st = String(l.status || "").toUpperCase();
          return st !== "REJECTED" && st !== "CANCELLED" && st !== "FAILED";
        }
      ).length
    );

    const periodLedgerProfit = filteredLedger
      .filter((l) => {
        const st = String(l.status || "").toUpperCase();
        return st !== "REJECTED" && st !== "CANCELLED" && st !== "FAILED";
      })
      .reduce((sum, l) => sum + safePaise(l.userAmountPaise), 0);

    const periodConvProfit = filteredConversions
      .filter((c) => {
        const st = String(c.status || "").toLowerCase();
        return st !== "rejected" && st !== "cancelled" && st !== "failed";
      })
      .reduce((sum, c) => sum + safeCommissionPaise(c.commission), 0);

    periodProfitPaise =
      queryRange === "all"
        ? balances.lifetime
        : Math.max(periodLedgerProfit, periodConvProfit);

    const labels =
      queryRange === "today"
        ? ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "Now"]
        : queryRange === "yesterday"
        ? ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "11:59 PM"]
        : queryRange === "30d"
        ? ["Day 1", "Day 5", "Day 10", "Day 15", "Day 20", "Day 25", "Today"]
        : ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"];

    for (let i = 0; i < labels.length; i++) {
      const isLast = i === labels.length - 1;
      dailyStats.push({
        date: "",
        label: labels[i]!,
        clicks: isLast ? totalClicks : 0,
        profitPaise: isLast ? periodProfitPaise : 0,
        orders: isLast ? totalTxns : 0,
      });
    }
  }

  // Dynamic conversion rate calculation:
  // Guarded formula: clicks > 0 ? ((orders / clicks) * 100).toFixed(1) + '%' : '0%'
  // Cap display at 100% and clicks guaranteed to reflect true traffic (at least orders).
  const effectiveClicks = Math.max(totalClicks, totalTxns);
  const convPct =
    effectiveClicks > 0
      ? Math.min(100, Math.max(0, (totalTxns / effectiveClicks) * 100))
      : 0;
  const convRate = effectiveClicks > 0 ? `${convPct.toFixed(2)}%` : "0.0%";
  const convRate1 = effectiveClicks > 0 ? `${convPct.toFixed(1)}%` : "0%";

  const res = NextResponse.json({
    authenticated: true,
    activeSubId,
    range: queryRange,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      referralCode: user.referralCode,
      subIdPrefix: (user as any).subIdPrefix || userPrefix,
    },
    balances,
    stats: {
      totalProfitPaise: periodProfitPaise,
      allTimeProfitPaise: balances.lifetime,
      availablePaise: balances.available,
      pendingPaise: balances.pending,
      paidPaise: balances.paid,
      inWithdrawalPaise: balances.inWithdrawal,
      totalClicks: effectiveClicks,
      totalTransactions: totalTxns,
      convRate,
      conversionRate: convRate1,
      registeredUsersCount: 1,
    },
    dailyStats,
    conversions,
    ledger,
    withdrawals,
    recentClicks: getLiveClicks(user.id).slice(0, 20),
  });

  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  return res;
}

export async function GET(req: Request) {
  return handleReports(req);
}

export async function POST(req: Request) {
  return handleReports(req);
}
