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
      const totalUsers = await prisma.user.count();
      const totalLinks = await prisma.generatedLink.count();

      // Platform revenue: rows with externalItemId "platform-cut"
      const adminCuts = await prisma.earningsLedger.aggregate({
        where: { externalItemId: "platform-cut" },
        _sum: { userAmountPaise: true },
      });
      const platformRev = adminCuts._sum.userAmountPaise ?? 0;

      const pendingAggregate = await prisma.withdrawal.aggregate({
        where: { status: { in: ["REQUESTED", "PROCESSING"] } },
        _sum: { amountPaise: true },
      });
      const pendingPaise = pendingAggregate._sum.amountPaise ?? 0;

      stats = {
        totalRegisteredUsers: totalUsers,
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
        store: c.store.name,
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
