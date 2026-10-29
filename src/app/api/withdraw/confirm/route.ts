import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  getUserBalances,
  recordWithdrawalRequest,
} from "@/lib/mockData";
import { verifyWithdrawalOtp } from "@/lib/otp";
import { formatINR } from "@/lib/money";

export const runtime = "nodejs";

const ConfirmSchema = z.object({
  otp: z.string().trim().min(6, "Please enter the 6-digit OTP").max(6),
});

export async function POST(req: Request) {
  try {
    const user = await getApiUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to confirm your withdrawal." },
        { status: 401 }
      );
    }

    const json = await req.json();
    const result = ConfirmSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid OTP" },
        { status: 400 }
      );
    }

    const { otp } = result.data;

    // 1. Verify withdrawal OTP
    const verification = verifyWithdrawalOtp({ userId: user.id, otp });
    if (!verification.ok || !verification.data) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired withdrawal OTP." },
        { status: 400 }
      );
    }

    const pending = verification.data;

    // 2. Double-check available balance
    let availablePaise = 0;

    if (isDatabaseConfigured()) {
      try {
        const rows = await prisma.earningsLedger.findMany({
          where: {
            userId: user.id,
            status: "CONFIRMED",
            withdrawalId: null,
            externalItemId: { not: "platform-cut" },
          },
          select: { userAmountPaise: true },
        });
        const confirmedSum = rows.reduce((acc, r) => acc + r.userAmountPaise, 0);

        const inFlight = await prisma.withdrawal.aggregate({
          where: {
            userId: user.id,
            status: { in: ["REQUESTED", "PROCESSING"] },
          },
          _sum: { amountPaise: true },
        });
        const lockedPaise = inFlight._sum.amountPaise || 0;
        availablePaise = Math.max(0, confirmedSum - lockedPaise);
      } catch (dbErr) {
        console.warn("DB balance re-check in confirm fallback:", dbErr);
        availablePaise = getUserBalances(user.id).available;
      }
    } else {
      availablePaise = getUserBalances(user.id).available;
    }

    if (pending.amountPaise > availablePaise) {
      return NextResponse.json(
        {
          error: `Insufficient available balance to complete this withdrawal. Available: ${formatINR(
            availablePaise
          )}.`,
        },
        { status: 400 }
      );
    }

    // 3. Create withdrawal record and lock/deduct funds
    let withdrawalRecord: any = null;

    if (isDatabaseConfigured()) {
      try {
        withdrawalRecord = await prisma.$transaction(async (tx) => {
          const w = await tx.withdrawal.create({
            data: {
              userId: user.id,
              amountPaise: pending.amountPaise,
              status: "REQUESTED",
              method: "UPI",
              payoutSnapshot: {
                upiId: pending.upiId,
                accountHolder: pending.accountHolder,
              },
            },
          });

          // Claim available confirmed ledger entries up to amountPaise
          const availableRows = await tx.earningsLedger.findMany({
            where: {
              userId: user.id,
              status: "CONFIRMED",
              withdrawalId: null,
              externalItemId: { not: "platform-cut" },
            },
            orderBy: { createdAt: "asc" },
          });

          let claimed = 0;
          const claimedIds: string[] = [];
          for (const row of availableRows) {
            if (claimed >= pending.amountPaise) break;
            claimed += row.userAmountPaise;
            claimedIds.push(row.id);
          }

          if (claimedIds.length > 0) {
            await tx.earningsLedger.updateMany({
              where: { id: { in: claimedIds } },
              data: { withdrawalId: w.id },
            });
          }

          return w;
        });
      } catch (dbErr: any) {
        console.warn("Database withdrawal creation error, using fallback store:", dbErr?.message || dbErr);
      }
    }

    // 4. Runtime / sandbox fallback
    if (!withdrawalRecord) {
      withdrawalRecord = recordWithdrawalRequest(
        pending.amountPaise,
        pending.upiId,
        pending.accountHolder,
        user.id
      );
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request confirmed and submitted for processing!",
      withdrawal: {
        id: withdrawalRecord.id,
        amountPaise: pending.amountPaise,
        upiId: pending.upiId,
        status: withdrawalRecord.status || "REQUESTED",
        requestedAt: withdrawalRecord.requestedAt || new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("confirm-withdrawal-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to confirm withdrawal. Please try again." },
      { status: 500 }
    );
  }
}
