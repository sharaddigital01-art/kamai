import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  findMockUserByEmail,
} from "@/lib/mockData";
import { createSignupOtp } from "@/lib/otp";

export const runtime = "nodejs";

const RequestSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  phone: z.string().trim().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const result = RequestSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { name, email, phone, password, referralCode } = result.data;
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if an account already exists with this email
    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.user.findFirst({
          where: { email: cleanEmail },
        });

        if (existing) {
          return NextResponse.json(
            { error: "An account with this email address already exists. Please log in." },
            { status: 409 }
          );
        }
      } catch (dbErr: any) {
        console.warn("Database lookup in send-signup-otp fallback:", dbErr?.message || dbErr);
      }
    }

    // Check mock fallback store
    const existingMockEmail = findMockUserByEmail(cleanEmail);
    if (existingMockEmail) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in." },
        { status: 409 }
      );
    }

    // 2. Generate and store OTP, triggering transactional email ONLY via Brevo
    const otpResult = await createSignupOtp({
      name,
      email: cleanEmail,
      phone: phone?.trim() || undefined,
      password,
      referralCode,
    });

    if (!otpResult.ok) {
      return NextResponse.json(
        { error: otpResult.error || "Failed to send OTP. Please wait before retrying." },
        { status: 429 }
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

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail} via support@kamaikaro.in.`,
      resendAfterSeconds: otpResult.resendAfterSeconds || 60,
      demoOtp: process.env.NODE_ENV !== "production" ? otpResult.code : undefined,
    });
  } catch (err: any) {
    console.error("send-signup-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while sending OTP." },
      { status: 500 }
    );
  }
}
