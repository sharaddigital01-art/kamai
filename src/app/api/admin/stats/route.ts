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

  let stats = {
    totalRegisteredUsers: 1,
    totalConvertedLinks: 0,
    totalPlatformRevenuePaise: 0,
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
      // Ensure it is NOT calculating 30% of total product order value (saleAmount)
      const approvedConversions = await prisma.conversion.findMany({
        where: {
          status: { in: ["confirmed", "approved", "paid", "CONFIRMED", "PAID"] },
          userId: { notIn: excludeUserIds },
          transactionId: {
            not: { startsWith: "test" },
          },
        },
        select: {
          commission: true,
        },
      });

      const platformRev = approvedConversions.reduce((sum, c) => {
        const commRupees = Number(c.commission) || 0;
        return sum + Math.round(commRupees * 100 * 0.30);
      }, 0);

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
        totalPlatformRevenuePaise: platformRev,
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
