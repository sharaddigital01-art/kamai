import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeIdentifier, createLoginOtp } from "@/lib/otp";

export const runtime = "nodejs";

const SendOtpSchema = z.object({
  identifier: z.string().trim().optional(),
  emailOrPhone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const result = SendOtpSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request format." },
        { status: 400 }
      );
    }

    const { identifier, emailOrPhone, email, phone } = result.data;
    const rawTarget = identifier || emailOrPhone || phone || email || "";

    if (!rawTarget) {
      return NextResponse.json(
        { error: "Please enter your mobile number or email address." },
        { status: 400 }
      );
    }

    const norm = normalizeIdentifier(rawTarget);
    if (norm.error) {
      return NextResponse.json(
        { error: norm.error },
        { status: 400 }
      );
    }

    const otpResult = await createLoginOtp({
      identifier: norm.normalized,
      type: norm.type,
    });

    if (!otpResult.ok) {
      return NextResponse.json(
        {
          error: otpResult.error || "Please wait before requesting a new OTP.",
          resendAfterSeconds: otpResult.resendAfterSeconds,
        },
        { status: otpResult.resendAfterSeconds ? 429 : 400 }
      );
    }

    const isNonProd = process.env.NODE_ENV !== "production";
    const displayTarget =
      norm.type === "email"
        ? norm.normalized
        : `${norm.normalized.slice(0, 5)}••••${norm.normalized.slice(-3)}`;

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${displayTarget}.`,
      type: norm.type,
      resendAfterSeconds: otpResult.resendAfterSeconds || 60,
      demoOtp: isNonProd ? (otpResult.code || "123456") : undefined,
    });
  } catch (err: any) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send OTP. Please try again or log in with password." },
      { status: 500 }
    );
  }
}
