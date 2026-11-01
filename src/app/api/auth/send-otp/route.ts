import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createLoginOtp } from "@/lib/otp";

export const runtime = "nodejs";

const SendOtpSchema = z.object({
  email: z.string().trim().optional(),
  identifier: z.string().trim().optional(),
  emailOrPhone: z.string().trim().optional(),
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

    const { identifier, emailOrPhone, email } = result.data;
    const rawTarget = (email || identifier || emailOrPhone || "").trim().toLowerCase();

    if (!rawTarget) {
      return NextResponse.json(
        { error: "Please enter your email address." },
        { status: 400 }
      );
    }

    // Strictly Email-first verification
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawTarget)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const otpResult = await createLoginOtp({
      identifier: rawTarget,
      type: "email",
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

    // Set serverless-resilient cookie
    try {
      const store = await cookies();
      if (otpResult.cookieValue) {
        store.set("kamai_pending_otp", otpResult.cookieValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 600,
        });
      }
    } catch {
      // outside request scope
    }

    const isNonProd = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${rawTarget} via support@kamaikaro.in.`,
      email: rawTarget,
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
