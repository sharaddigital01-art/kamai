import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  getLiveStores,
  getLiveDeals,
  getLiveWithdrawals,
  getLiveClicks,
  getLiveLedger,
  getAdminPlatformOverview,
} from "@/lib/mockData";

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

  let stores = getLiveStores();
  let deals = getLiveDeals();
  let withdrawals: any[] = getLiveWithdrawals();
  let stats = {
    totalRegisteredUsers: 1,
    totalConvertedLinks: 0,
    totalPlatformRevenuePaise: 0,
    pendingPayoutsPaise: 0,
  };
  let recentClicks: any[] = getLiveClicks().slice(0, 30);
  let ledger: any[] = getLiveLedger().slice(0, 30);

  if (isDatabaseConfigured()) {
    try {
      // 1. Stores
      const dbStores = await prisma.partnerStore.findMany({
        orderBy: { sortOrder: "asc" },
      });
      if (dbStores.length > 0) {
        stores = dbStores.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          brandColor: s.brandColor,
          commissionRateBps: s.commissionRateBps,
          userShareBps: s.userShareBps,
          sortOrder: s.sortOrder,
          status: s.status,
          confirmationDays: s.confirmationDays,
          logoUrl: s.logoUrl || undefined,
        }));
      }

      // 2. Deals
      const dbDeals = await prisma.deal.findMany({
        include: { store: { select: { slug: true, name: true, brandColor: true } } },
        orderBy: { createdAt: "desc" },
      });
      if (dbDeals.length > 0) {
        deals = dbDeals.map((d) => ({
          id: d.id,
          storeId: d.storeId,
          externalId: d.externalId || d.id,
          title: d.title,
          category: d.category,
          pricePaise: d.pricePaise,
          mrpPaise: d.mrpPaise,
          discountPct: d.discountPct,
          estimatedProfitPaise: d.estimatedProfitPaise,
          productUrl: d.productUrl,
          imageUrl: d.imageUrl,
          tags: d.tags,
          isFeatured: d.isFeatured,
          isActive: d.isActive,
          clickCount: d.clickCount,
          shareCount: d.shareCount,
          createdAt: d.createdAt,
          expiresAt: d.expiresAt,
          store: d.store,
        }));
      }

      // 3. Withdrawals
      const dbWithdrawals = await prisma.withdrawal.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { requestedAt: "desc" },
      });
      withdrawals = dbWithdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        userName: w.user.name || w.user.email?.split("@")[0] || "User",
        userEmail: w.user.email,
        amountPaise: w.amountPaise,
        status: w.status,
        method: w.method,
        upiId: (w.payoutSnapshot as any)?.upiId || "UPI",
        requestedAt: w.requestedAt,
        paidAt: w.paidAt,
      }));

      // 4. Platform Overview KPI Counts
      const seedIds = [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000000",
      ];

      // Exclude seed and test accounts
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

      // Wipe or exclude simulated/test transaction rows from DB
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
        // Safe proceed if already wiped or restricted
      }

      const totalUsers = await prisma.user.count({
        where: { id: { notIn: excludeUserIds } },
      });
      const totalLinks = await prisma.generatedLink.count();

      // Calculation formula strictly: admin_revenue = SUM(affiliate_commission * 0.30)
      // (Ensure it is NOT calculating 30% of total product order value / saleAmount)
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

      // 5. Recent Clicks
      const dbClicks = await prisma.click.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: { store: { select: { name: true } }, link: { select: { code: true } } },
      });
      recentClicks = dbClicks.map((c) => ({
        code: c.link?.code || "direct",
        store: c.store?.name || "Direct",
        timestamp: c.createdAt,
        ip: "192.168.1.***",
      }));
    } catch (e) {
      console.warn("Prisma admin data error, using live memory data:", e);
      stats = getAdminPlatformOverview();
    }
  } else {
    stats = getAdminPlatformOverview();
  }

  return NextResponse.json({
    stores,
    deals,
    withdrawals,
    stats,
    recentClicks,
    ledger,
  });
}
