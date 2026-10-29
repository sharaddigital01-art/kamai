import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  getUserBalances,
  DEMO_USER,
} from "@/lib/mockData";
import { isValidUpiId, createWithdrawalOtp } from "@/lib/otp";
import { formatINR } from "@/lib/money";

export const runtime = "nodejs";

const SendOtpSchema = z.object({
  amountPaise: z.number().int().min(10000, "Minimum withdrawal is ₹100 (10,000 paise)"),
  upiId: z.string().trim().min(3, "Please enter a valid UPI ID"),
  accountHolder: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getApiUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to make a withdrawal request." },
        { status: 401 }
      );
    }

    const json = await req.json();
    const result = SendOtpSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid withdrawal parameters" },
        { status: 400 }
      );
    }

    const { amountPaise, upiId, accountHolder } = result.data;

    // Validate UPI ID structure
    if (!isValidUpiId(upiId)) {
      return NextResponse.json(
        { error: "Invalid UPI ID format. Examples: rahul@oksbi, payment@paytm, 9876543210@upi" },
        { status: 400 }
      );
    }

    // Check available balance
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
        console.warn("DB balance check in send-otp fallback:", dbErr);
        availablePaise = getUserBalances(user.id).available;
      }
    } else {
      availablePaise = getUserBalances(user.id).available;
    }

    if (amountPaise > availablePaise) {
      return NextResponse.json(
        {
          error: `Requested amount (${formatINR(amountPaise)}) exceeds available balance (${formatINR(
            availablePaise
          )}).`,
        },
        { status: 400 }
      );
    }

    const userEmail = user.email || "partner@kamai.local";

    const otpResult = await createWithdrawalOtp({
      userId: user.id,
      email: userEmail,
      amountPaise,
      upiId,
      accountHolder: accountHolder || user.name || "EarnKaro Partner",
    });

    if (!otpResult.ok) {
      return NextResponse.json(
        { error: otpResult.error || "Please wait before requesting another withdrawal OTP." },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit confirmation OTP has been sent to ${userEmail}.`,
      resendAfterSeconds: otpResult.resendAfterSeconds || 60,
      demoOtp: process.env.NODE_ENV !== "production" ? otpResult.code : undefined,
    });
  } catch (err: any) {
    console.error("send-withdrawal-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while requesting withdrawal OTP." },
      { status: 500 }
    );
  }
}
