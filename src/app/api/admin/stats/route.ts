import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, getAdminPlatformOverview, DEMO_USER } from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser().catch(() => null);
  if (!isAdminUser(user)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  let stats: Record<string, any> = {
    totalRegisteredUsers: 1,
    totalConvertedLinks: 0,
    totalPlatformRevenuePaise: 0,
    totalPlatformRevenue: 0,
    total_admin_revenue: 0,
    pendingCutPaise: 0,
    pendingCut: 0,
    pending_admin_cut: 0,
    approvedCutPaise: 0,
    approvedCut: 0,
    approved_admin_cut: 0,
    rejectedCutPaise: 0,
    rejectedCut: 0,
    rejected_admin_cut: 0,
    pendingPayoutsPaise: 0,
  };

  if (isDatabaseConfigured()) {
    try {
      const seedIds = [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000000",
      ];

      // Identify seed and test user accounts
      const testUsers = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: seedIds } },
            { email: { endsWith: "@kamaikaro.local" } },
            { email: { endsWith: "@earnkaro.test" } },
            { email: { contains: "test", mode: "insensitive" } },
            { email: { contains: "seed", mode: "insensitive" } },
            { email: { contains: "simulate", mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      const excludeUserIds = Array.from(new Set([...seedIds, ...testUsers.map((u) => u.id)]));

      // Wipe or delete simulated/test transaction rows
      try {
        await prisma.conversion.deleteMany({
          where: {
            OR: [
              { userId: { in: excludeUserIds } },
              { transactionId: { startsWith: "test" } },
              { transactionId: { startsWith: "sim" } },
              { transactionId: { startsWith: "mock" } },
              { transactionId: { startsWith: "demo" } },
              { transactionId: { startsWith: "OD" } },
            ],
          },
        });
        await prisma.earningsLedger.deleteMany({
          where: {
            OR: [
              { userId: { in: excludeUserIds } },
              { externalOrderId: { startsWith: "test" } },
              { externalOrderId: { startsWith: "sim" } },
              { externalOrderId: { startsWith: "mock" } },
              { externalOrderId: { startsWith: "demo" } },
              { externalOrderId: { startsWith: "od-" } },
            ],
          },
        });
      } catch {
        // Safe proceed
      }

      const totalUsers = await prisma.user.count({
        where: { id: { notIn: excludeUserIds } },
      });
      const totalLinks = await prisma.generatedLink.count();

      // Calculation formula strictly: admin_revenue = SUM(affiliate_commission * 0.30)
      // Segmented by status: approved, pending, rejected
      // Ensure it is NOT calculating 30% of total product order value (saleAmount)
      const realConversions = await prisma.conversion.findMany({
        where: {
          userId: { notIn: excludeUserIds },
          transactionId: {
            not: { startsWith: "test" },
          },
        },
        select: {
          commission: true,
          status: true,
        },
      });

      let pendingCutPaise = 0;
      let approvedCutPaise = 0;
      let rejectedCutPaise = 0;

      for (const c of realConversions) {
        const commRupees = Number(c.commission) || 0;
        const cutPaise = Math.round(commRupees * 100 * 0.30);
        const st = String(c.status || "").toLowerCase().trim();

        if (st === "approved" || st === "confirmed" || st === "paid") {
          approvedCutPaise += cutPaise;
        } else if (st === "pending" || st === "open" || st === "0") {
          pendingCutPaise += cutPaise;
        } else if (
          st === "rejected" ||
          st === "cancelled" ||
          st === "canceled" ||
          st === "failed" ||
          st === "declined" ||
          st === "2"
        ) {
          rejectedCutPaise += cutPaise;
        }
      }

      const totalPlatformRevenuePaise = approvedCutPaise + pendingCutPaise;

      const pendingAggregate = await prisma.withdrawal.aggregate({
        where: {
          status: { in: ["REQUESTED", "PROCESSING"] },
          userId: { notIn: excludeUserIds },
        },
        _sum: { amountPaise: true },
      });
      const pendingPaise = pendingAggregate._sum.amountPaise ?? 0;

      stats = {
        totalRegisteredUsers: Math.max(1, totalUsers),
        totalConvertedLinks: totalLinks,
        totalPlatformRevenuePaise,
        totalPlatformRevenue: totalPlatformRevenuePaise / 100,
        total_admin_revenue: totalPlatformRevenuePaise / 100,
        pendingCutPaise,
        pendingCut: pendingCutPaise / 100,
        pending_admin_cut: pendingCutPaise / 100,
        approvedCutPaise,
        approvedCut: approvedCutPaise / 100,
        approved_admin_cut: approvedCutPaise / 100,
        rejectedCutPaise,
        rejectedCut: rejectedCutPaise / 100,
        rejected_admin_cut: rejectedCutPaise / 100,
        pendingPayoutsPaise: pendingPaise,
      };
    } catch (e) {
      console.warn("Prisma admin stats error, using live memory data:", e);
      stats = getAdminPlatformOverview();
    }
  } else {
    stats = getAdminPlatformOverview();
  }

  return NextResponse.json({
    success: true,
    stats,
  });
}

export async function POST() {
  return GET();
}
