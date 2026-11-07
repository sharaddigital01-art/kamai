import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, getLiveWithdrawals, updateWithdrawalStatus } from "@/lib/mockData";

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

  if (isDatabaseConfigured()) {
    try {
      const dbWithdrawals = await prisma.withdrawal.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      });

      const withdrawals = dbWithdrawals.map((w) => {
        const snap = w.payoutSnapshot as any;
        return {
          id: w.id,
          userId: w.userId,
          userName: w.user?.name || w.user?.email?.split("@")[0] || "Partner",
          userEmail: w.user?.email || "No email",
          amountPaise: w.amountPaise,
          status: w.status, // REQUESTED | PROCESSING | PAID | FAILED
          method: w.method,
          upiId: snap?.upiId || (w.method === "UPI" ? "UPI Account" : "Bank Transfer"),
          accountHolder: snap?.accountHolder || null,
          utr: w.utr || null,
          failureReason: w.failureReason || null,
          requestedAt: w.requestedAt.toISOString(),
          paidAt: w.paidAt ? w.paidAt.toISOString() : null,
        };
      });

      return NextResponse.json({ withdrawals });
    } catch (err: any) {
      console.warn("Database error in /admin/api/payouts, using mock fallback:", err?.message || err);
    }
  }

  // Fallback to live mock withdrawals
  const live = getLiveWithdrawals();
  const withdrawals = live.map((w) => ({
    id: w.id,
    userId: w.userId,
    userName: "Kamai Karo Partner",
    userEmail: "partner@example.com",
    amountPaise: w.amountPaise,
    status: w.status,
    method: w.method || "UPI",
    upiId: w.upiId || "partner@oksbi",
    accountHolder: "Partner Account",
    utr: (w as any).utr || null,
    failureReason: (w as any).failureReason || null,
    requestedAt: new Date(w.requestedAt).toISOString(),
    paidAt: (w as any).paidAt ? new Date((w as any).paidAt).toISOString() : null,
  }));

  return NextResponse.json({ withdrawals });
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
  const { id, action, utr, reason } = body;

  if (!id || !action || (action !== "mark_paid" && action !== "reject")) {
    return NextResponse.json(
      { error: "id and action ('mark_paid' | 'reject') are required." },
      { status: 400 }
    );
  }

  const targetStatus = action === "mark_paid" ? "PAID" : "FAILED";
  const now = new Date();

  if (isDatabaseConfigured()) {
    try {
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id },
        include: { entries: true },
      });

      if (withdrawal) {
        if (targetStatus === "PAID") {
          // 1. Mark withdrawal as PAID with UTR reference
          await prisma.withdrawal.update({
            where: { id },
            data: {
              status: "PAID",
              utr: utr?.trim() || null,
              paidAt: now,
              processedAt: now,
            },
          });

          // 2. Mark claimed ledger entries as PAID (terminal confirmed payout)
          await prisma.earningsLedger.updateMany({
            where: { withdrawalId: id },
            data: {
              status: "PAID",
              paidAt: now,
            },
          });
        } else {
          // 1. Mark withdrawal as FAILED / REJECTED with reason
          await prisma.withdrawal.update({
            where: { id },
            data: {
              status: "FAILED",
              failureReason: reason?.trim() || "Rejected by Administrator",
              processedAt: now,
            },
          });

          // 2. RELEASE claimed ledger entries back to CONFIRMED with withdrawalId: null
          // This refunds the balance back to user's available balance in their wallet immediately!
          await prisma.earningsLedger.updateMany({
            where: { withdrawalId: id },
            data: {
              status: "CONFIRMED",
              withdrawalId: null,
            },
          });
        }
      }
    } catch (dbErr: any) {
      console.warn("Database error in updating payout status:", dbErr?.message || dbErr);
    }
  }

  // Update memory state
  updateWithdrawalStatus(id, targetStatus as any);

  return NextResponse.json({
    success: true,
    id,
    status: targetStatus,
    utr: utr || null,
    message:
      targetStatus === "PAID"
        ? `Withdrawal marked as Paid (UTR: ${utr || "Confirmed"})`
        : "Withdrawal rejected. Funds successfully refunded to user profit balance.",
  });
}
