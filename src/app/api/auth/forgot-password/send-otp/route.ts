import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createPasswordResetOtp } from "@/lib/otp";

export const runtime = "nodejs";

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = ForgotPasswordSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Valid email address is required." },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const otpResult = await createPasswordResetOtp({ email });

    if (!otpResult.ok) {
      return NextResponse.json(
        {
          error: otpResult.error || "Unable to send password reset code. Please try again later.",
          resendAfterSeconds: otpResult.resendAfterSeconds,
        },
        { status: 429 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "A 6-digit password reset code has been sent to your email.",
      resendAfterSeconds: otpResult.resendAfterSeconds || 60,
      ...(process.env.NODE_ENV !== "production" ? { demoOtp: otpResult.code } : {}),
    });

    if (otpResult.cookieValue) {
      const cookieStore = await cookies();
      cookieStore.set("kamai_pending_otp", otpResult.cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      });
    }

    return response;
  } catch (err: any) {
    console.error("forgot-password send-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while sending reset code." },
      { status: 500 }
    );
  }
}
