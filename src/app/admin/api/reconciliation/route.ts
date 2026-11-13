import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, getLiveClicks, getLiveLedger, getAdminPlatformOverview } from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdminAuth(user: any): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  return (
    user.role === "ADMIN" ||
    user.is_admin === true ||
    email === "support@kamaikaro.in" ||
    email === "admin@kamaikaro.in" ||
    isAdminEmail(email)
  );
}

export async function GET() {
  const admin = await getApiUser().catch(() => null);
  if (!checkAdminAuth(admin)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (isDatabaseConfigured()) {
    try {
      const seedIds = [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000000",
      ];

      // Run all queries concurrently for maximum performance
      const [
        clicksTodayCount,
        totalClicksCount,
        shortLinkAgg,
        genLinkAgg,
        ledgerRows,
        conversions,
        dbRecentOrders,
      ] = await Promise.all([
        prisma.click.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        prisma.click.count(),
        prisma.shortLink.aggregate({ _sum: { clickCount: true } }),
        prisma.generatedLink.aggregate({ _sum: { clickCount: true } }),
        prisma.earningsLedger.findMany({
          where: {
            userId: { notIn: seedIds },
            kind: "COMMISSION",
          },
          select: {
            orderAmountPaise: true,
            commissionPaise: true,
            userAmountPaise: true,
            status: true,
          },
        }),
        prisma.conversion.findMany({
          where: { userId: { notIn: seedIds } },
          select: { commission: true, saleAmount: true, status: true },
        }),
        prisma.earningsLedger.findMany({
          where: { userId: { notIn: seedIds } },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            store: { select: { name: true } },
            user: { select: { name: true, email: true, subIdPrefix: true } },
          },
        }),
      ]);

      // Aggregate real clicks from Prisma clicks table, shortlinks, and generated links without double counting
      const aggregatedLinkClicks =
        (shortLinkAgg._sum.clickCount || 0) + (genLinkAgg._sum.clickCount || 0);
      const totalClicks = Math.max(totalClicksCount, aggregatedLinkClicks);
      const clicksToday = clicksTodayCount;

      let lifetimeGrossPaise = 0;
      let totalUserPaiseFromLedger = 0;
      let approvedUserProfitPaise = 0;
      let approvedCutPaise = 0;
      let pendingCutPaise = 0;
      let rejectedCutPaise = 0;

      for (const row of ledgerRows) {
        const gross = Number(row.commissionPaise) || 0;
        const userAmt = Number(row.userAmountPaise) || Math.round(gross * 0.70);
        const adminCut = Math.round(gross * 0.30);
        const st = String(row.status || "").toUpperCase();

        if (st === "REJECTED" || st === "CANCELLED" || st === "FAILED") {
          rejectedCutPaise += adminCut;
          continue;
        }

        lifetimeGrossPaise += gross;
        totalUserPaiseFromLedger += userAmt;

        if (st === "CONFIRMED" || st === "PAID") {
          approvedCutPaise += adminCut;
          approvedUserProfitPaise += userAmt;
        } else if (st === "PENDING") {
          pendingCutPaise += adminCut;
        }
      }

      // Aggregate conversion table in case Cuelinks has partner-synced rows
      let convGrossPaise = 0;
      let convTotalUserPaise = 0;
      let convApprovedCutPaise = 0;
      let convPendingCutPaise = 0;
      let convRejectedCutPaise = 0;

      for (const c of conversions) {
        const gross = Math.round((Number(c.commission) || 0) * 100);
        const userAmt = Math.round(gross * 0.70);
        const adminCut = Math.round(gross * 0.30);
        const st = String(c.status || "").toLowerCase();

        if (st === "rejected" || st === "cancelled" || st === "failed") {
          convRejectedCutPaise += adminCut;
          continue;
        }

        convGrossPaise += gross;
        convTotalUserPaise += userAmt;

        if (st === "approved" || st === "confirmed" || st === "paid") {
          convApprovedCutPaise += adminCut;
        } else if (st === "pending" || st === "open" || st === "processing") {
          convPendingCutPaise += adminCut;
        }
      }

      // Merge highest values
      if (convGrossPaise > lifetimeGrossPaise) {
        lifetimeGrossPaise = convGrossPaise;
        totalUserPaiseFromLedger = convTotalUserPaise;
        approvedCutPaise = convApprovedCutPaise;
        pendingCutPaise = convPendingCutPaise;
        rejectedCutPaise = convRejectedCutPaise;
      }

      // Dynamically calculate user profit (70%): ensure it reflects valid user payouts accurately and excludes cancelled/rejected conversions
      const expected70Pct = Math.round(lifetimeGrossPaise * 0.70);
      const distributedUserProfitPaise = Math.max(
        totalUserPaiseFromLedger,
        approvedUserProfitPaise,
        expected70Pct
      );

      const platformNetProfitPaise = approvedCutPaise + pendingCutPaise;

      const recentOrders = dbRecentOrders.map((o) => {
        const gross = Number(o.commissionPaise) || 0;
        const userAmt = Number(o.userAmountPaise) || Math.round(gross * 0.70);
        const adminCut = Math.round(gross * 0.30);

        return {
          id: o.id,
          orderId: o.externalOrderId,
          storeName: o.store?.name || "Affiliate Store",
          userName: o.user?.name || o.user?.email?.split("@")[0] || "User",
          userEmail: o.user?.email || "No email",
          subId: o.user?.subIdPrefix || "subid",
          orderAmountPaise: o.orderAmountPaise,
          commissionPaise: gross,
          userAmountPaise: userAmt,
          adminCutPaise: adminCut,
          status: o.status,
          date: o.createdAt.toISOString(),
        };
      });

      return NextResponse.json({
        clicksToday,
        totalClicks,
        lifetimeGrossPaise,
        distributedUserProfitPaise,
        platformNetProfitPaise,
        pendingCutPaise,
        approvedCutPaise,
        rejectedCutPaise,
        recentOrders,
      });
    } catch (err: any) {
      console.warn("Database error in /admin/api/reconciliation, using fallback:", err?.message || err);
    }
  }

  // Fallback to memory state
  const overview = getAdminPlatformOverview();
  const liveClicks = getLiveClicks();
  const clicksToday = liveClicks.filter((c) => new Date(c.timestamp) >= startOfToday).length;
  const liveLedger = getLiveLedger();

  const grossPaise = Math.round((overview.totalPlatformRevenuePaise / 0.30) || 3975);
  const userProfitPaise = Math.round(grossPaise * 0.70);

  const recentOrders = liveLedger.slice(0, 15).map((l) => {
    const commPaise = (l as any).commissionPaise ?? Math.round(l.userAmountPaise / 0.70);
    const storeName = l.store?.name || (l as any).storeName || "Partner Store";
    return {
      id: l.id,
      orderId: l.externalOrderId,
      storeName,
      userName: "Kamai Partner",
      userEmail: "partner@example.com",
      subId: "tg_sub",
      orderAmountPaise: l.orderAmountPaise,
      commissionPaise: commPaise,
      userAmountPaise: l.userAmountPaise,
      adminCutPaise: Math.round(commPaise * 0.30),
      status: l.status,
      date: new Date(l.createdAt).toISOString(),
    };
  });

  return NextResponse.json({
    clicksToday,
    totalClicks: liveClicks.length,
    lifetimeGrossPaise: grossPaise,
    distributedUserProfitPaise: userProfitPaise,
    platformNetProfitPaise: overview.totalPlatformRevenuePaise,
    pendingCutPaise: overview.pendingCutPaise,
    approvedCutPaise: overview.approvedCutPaise,
    rejectedCutPaise: overview.rejectedCutPaise,
    recentOrders,
  });
}
