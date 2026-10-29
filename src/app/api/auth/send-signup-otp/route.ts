import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  findMockUserByEmail,
  findMockUserByPhone,
} from "@/lib/mockData";
import { validateIndianPhone, createSignupOtp } from "@/lib/otp";

export const runtime = "nodejs";

const RequestSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  phone: z.string().trim().min(10, "Please enter a valid 10-digit mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = RequestSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { name, email, phone, password, referralCode } = result.data;

    // Validate 10-digit Indian mobile number
    const phoneCheck = validateIndianPhone(phone);
    if (!phoneCheck.valid) {
      return NextResponse.json(
        { error: phoneCheck.error || "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }
    const formattedPhone = phoneCheck.formatted; // "+91" + 10 digits

    // 1. Check if an account already exists with this email or phone
    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { phone: formattedPhone },
              { phone: phoneCheck.cleanDigits },
            ],
          },
        });

        if (existing) {
          const duplicateField = existing.email === email ? "email" : "mobile number";
          return NextResponse.json(
            { error: `An account with this ${duplicateField} already exists. Please log in.` },
            { status: 409 }
          );
        }
      } catch (dbErr: any) {
        console.warn("Database lookup in send-signup-otp fallback:", dbErr?.message || dbErr);
      }
    }

    // Check mock fallback store
    const existingMockEmail = findMockUserByEmail(email);
    if (existingMockEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }
    const existingMockPhone = findMockUserByPhone(phoneCheck.cleanDigits);
    if (existingMockPhone) {
      return NextResponse.json(
        { error: "An account with this mobile number already exists. Please log in." },
        { status: 409 }
      );
    }

    // 2. Generate and store OTP
    const otpResult = await createSignupOtp({
      name,
      email,
      phone: formattedPhone,
      password,
      referralCode,
    });

    if (!otpResult.ok) {
      return NextResponse.json(
        { error: otpResult.error || "Failed to send OTP. Please wait before retrying." },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}.`,
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
