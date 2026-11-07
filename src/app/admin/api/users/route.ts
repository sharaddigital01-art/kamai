import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, DEMO_USER } from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const g = globalThis as unknown as {
  mockUsers?: Map<string, any>;
  __suspendedUserIds?: Set<string>;
};
if (!g.__suspendedUserIds) g.__suspendedUserIds = new Set();

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

  const suspendedSet = g.__suspendedUserIds || new Set();

  if (isDatabaseConfigured()) {
    try {
      // 1. Fetch users with telegram config and payout account
      const dbUsers = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          telegramConfig: {
            select: {
              telegramUserId: true,
              telegramUsername: true,
              targetChannelName: true,
              targetChannelId: true,
              isActive: true,
            },
          },
          payoutAccount: {
            select: {
              method: true,
              upiId: true,
              accountHolder: true,
            },
          },
          _count: {
            select: {
              clicks: true,
              ledger: true,
            },
          },
        },
      });

      // 2. Aggregate confirmed & paid earnings per user
      const earningsAgg = await prisma.earningsLedger.groupBy({
        by: ["userId"],
        where: {
          status: { in: ["CONFIRMED", "PAID"] },
        },
        _sum: {
          userAmountPaise: true,
        },
      });

      const earningsMap = new Map<string, number>();
      for (const row of earningsAgg) {
        earningsMap.set(row.userId, row._sum.userAmountPaise ?? 0);
      }

      const users = dbUsers.map((u) => {
        const isSuspended = suspendedSet.has(u.id);
        const tg = u.telegramConfig;
        const tgConnected = Boolean(tg?.telegramUserId || tg?.targetChannelId || tg?.isActive);

        return {
          id: u.id,
          name: u.name || u.email?.split("@")[0] || "Kamai Karo Partner",
          email: u.email || "No email",
          phone: u.phone || null,
          role: u.role,
          referralCode: u.referralCode,
          subId: u.subIdPrefix,
          createdAt: u.createdAt.toISOString(),
          isSuspended,
          lifetimeProfitPaise: earningsMap.get(u.id) || 0,
          clicksCount: u._count.clicks || 0,
          ordersCount: u._count.ledger || 0,
          telegramConfig: {
            connected: tgConnected,
            telegramUserId: tg?.telegramUserId || null,
            telegramUsername: tg?.telegramUsername || null,
            targetChannelName: tg?.targetChannelName || null,
            targetChannelId: tg?.targetChannelId || null,
            isActive: Boolean(tg?.isActive),
          },
          payoutAccount: u.payoutAccount
            ? {
                method: u.payoutAccount.method,
                upiId: u.payoutAccount.upiId || "Not set",
                accountHolder: u.payoutAccount.accountHolder || null,
              }
            : null,
        };
      });

      return NextResponse.json({ users });
    } catch (err: any) {
      console.warn("Database error in /admin/api/users, using memory fallback:", err?.message || err);
    }
  }

  // Memory fallback
  const mockMap = g.mockUsers || new Map();
  const rawList = Array.from(mockMap.values());
  if (!rawList.some((u) => u.id === DEMO_USER.id)) {
    rawList.unshift({
      id: DEMO_USER.id,
      name: DEMO_USER.name || "Demo Partner",
      email: DEMO_USER.email || "demo@earnkaro.local",
      phone: "+919876543210",
      role: "ADMIN",
      referralCode: DEMO_USER.referralCode,
      subIdPrefix: DEMO_USER.subIdPrefix,
      createdAt: DEMO_USER.createdAt,
    });
  }

  const users = rawList.map((u) => {
    const isSuspended = suspendedSet.has(u.id);
    return {
      id: u.id,
      name: u.name || u.email?.split("@")[0] || "Kamai Karo Partner",
      email: u.email,
      phone: u.phone || null,
      role: u.role || "USER",
      referralCode: u.referralCode || "KAMAI01",
      subId: u.subIdPrefix || "sub01",
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
      isSuspended,
      lifetimeProfitPaise: 2783,
      clicksCount: 14,
      ordersCount: 2,
      telegramConfig: {
        connected: true,
        telegramUserId: "12345678",
        telegramUsername: "kamaideals",
        targetChannelName: "Kamai Official Deals",
        targetChannelId: "-1001234567890",
        isActive: true,
      },
      payoutAccount: {
        method: "UPI",
        upiId: "partner@oksbi",
        accountHolder: u.name || "Partner",
      },
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const admin = await getApiUser().catch(() => null);
  if (!checkAdminAuth(admin)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { userId, action } = body;

  if (!userId || !action) {
    return NextResponse.json(
      { error: "userId and action ('suspend' | 'activate') are required." },
      { status: 400 }
    );
  }

  if (!g.__suspendedUserIds) g.__suspendedUserIds = new Set();

  if (action === "suspend") {
    g.__suspendedUserIds.add(userId);
  } else if (action === "activate") {
    g.__suspendedUserIds.delete(userId);
  }

  return NextResponse.json({
    success: true,
    userId,
    isSuspended: g.__suspendedUserIds.has(userId),
    message: action === "suspend" ? "User account suspended successfully." : "User account activated successfully.",
  });
}
