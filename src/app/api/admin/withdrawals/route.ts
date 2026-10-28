import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  updateWithdrawalStatus,
  recordWithdrawalRequest,
  getLiveWithdrawals,
  getLiveStats,
  getAdminPlatformOverview,
} from "@/lib/mockData";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getApiUser().catch(() => null);
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Access denied. Admin authorization required." }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: "Withdrawal ID and target status are required" }, { status: 400 });
    }

    const targetStatus = status === "PAID" ? "PAID" : "FAILED";

    if (isDatabaseConfigured()) {
      try {
        const withdrawal = await prisma.withdrawal.findUnique({
          where: { id },
          include: { entries: true },
        });

        if (withdrawal) {
          if (targetStatus === "PAID") {
            // Mark withdrawal as PAID
            await prisma.withdrawal.update({
              where: { id },
              data: {
                status: "PAID",
                paidAt: new Date(),
                processedAt: new Date(),
              },
            });

            // Mark claimed ledger entries as PAID
            await prisma.earningsLedger.updateMany({
              where: { withdrawalId: id },
              data: {
                status: "PAID",
                paidAt: new Date(),
              },
            });
          } else {
            // Mark withdrawal as FAILED / REJECTED
            await prisma.withdrawal.update({
              where: { id },
              data: {
                status: "FAILED",
                failureReason: "Rejected by Administrator",
                processedAt: new Date(),
              },
            });

            // Release locked ledger entries back to CONFIRMED (restores available balance)
            await prisma.earningsLedger.updateMany({
              where: { withdrawalId: id },
              data: {
                status: "CONFIRMED",
                withdrawalId: null,
              },
            });
          }
        }
      } catch (dbErr) {
        console.warn("DB withdrawal update notice:", dbErr);
      }
    }

    // Always update runtime memory state
    const memoryUpdated = updateWithdrawalStatus(id, targetStatus as any);

    return NextResponse.json({
      success: true,
      withdrawal: memoryUpdated,
      withdrawals: getLiveWithdrawals(),
      stats: getAdminPlatformOverview(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update withdrawal" }, { status: 500 });
  }
}

// Simulated or manual withdrawal request creation (for testing/demo)
export async function PUT(req: Request) {
  try {
    const user = await getApiUser().catch(() => null);
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Access denied. Admin authorization required." }, { status: 403 });
    }

    const body = await req.json();
    const amountPaise = Number(body.amountPaise) || 25000;
    const upiId = body.upiId || "user@okaxis";
    const name = body.name || "Demo Partner";

    const w = recordWithdrawalRequest(amountPaise, upiId, name);
    return NextResponse.json({
      withdrawal: w,
      withdrawals: getLiveWithdrawals(),
      stats: getAdminPlatformOverview(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create withdrawal request" }, { status: 400 });
  }
}
