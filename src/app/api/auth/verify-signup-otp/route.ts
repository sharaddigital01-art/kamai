import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  isDatabaseConfigured,
  isSupabaseConfigured,
  createMockUser,
  findMockUserByEmail,
  getUserBalances,
} from "@/lib/mockData";
import { AUTH_COOKIE, isAdminEmail } from "@/lib/auth";
import { verifySignupOtp } from "@/lib/otp";

export const runtime = "nodejs";

const VerifySchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  otp: z.string().trim().min(6, "Please enter the 6-digit OTP").max(6),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = VerifySchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { email, otp } = result.data;

    // 1. Verify OTP from our secure OTP store
    const verification = verifySignupOtp({ email, otp });
    if (!verification.ok || !verification.data) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired OTP. Please try again." },
        { status: 400 }
      );
    }

    const pending = verification.data;
    const isAdmin = isAdminEmail(email);
    const role = isAdmin ? "ADMIN" : "USER";

    let authUserId = crypto.randomUUID();

    // 2. Finalize user in Supabase Auth if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServer();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: pending.password,
          options: {
            data: {
              name: pending.name,
              phone: pending.phone,
              is_verified: true,
            },
          },
        });

        if (authData?.user?.id) {
          authUserId = authData.user.id;
        } else if (authError) {
          console.warn("Supabase Auth finalization warning:", authError.message);
        }
      } catch (err: any) {
        console.warn("Supabase Auth verify notice:", err?.message || err);
      }
    }

    // 3. Create or link record in the User database table
    let createdUser: any = null;

    if (isDatabaseConfigured()) {
      try {
        let referredById: string | null = null;
        if (pending.referralCode) {
          const referrer = await prisma.user.findUnique({
            where: { referralCode: pending.referralCode },
          });
          if (referrer) referredById = referrer.id;
        }

        createdUser = await prisma.user.create({
          data: {
            id: authUserId,
            email,
            phone: pending.phone,
            name: pending.name,
            role,
            referralCode: randomCode(8),
            subIdPrefix: randomCode(6),
            referredById,
          },
        });
      } catch (dbErr: any) {
        console.warn("Database user create in verify-signup-otp fallback:", dbErr?.message || dbErr);
      }
    }

    // 4. Runtime / sandbox fallback user store
    if (!createdUser) {
      createdUser = createMockUser({
        id: authUserId,
        email,
        phone: pending.phone,
        name: pending.name,
        role,
        isVerified: true,
        referralCode: randomCode(8),
        subIdPrefix: randomCode(6),
      });
    }

    // 5. Initialize wallet ledger balance to exactly ₹0.00
    const initialBalances = getUserBalances(createdUser.id);
    initialBalances.available = 0;
    initialBalances.pending = 0;
    initialBalances.inWithdrawal = 0;
    initialBalances.paid = 0;
    initialBalances.lifetime = 0;

    // 6. Set persistent authenticated session cookie (7 days)
    const store = await cookies();
    const sessionPayload = {
      id: createdUser.id,
      email: createdUser.email,
      phone: createdUser.phone || pending.phone,
      name: createdUser.name,
      role: createdUser.role,
      referralCode: createdUser.referralCode,
      createdAt: new Date().toISOString(),
    };

    store.set(AUTH_COOKIE, encodeURIComponent(JSON.stringify(sessionPayload)), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account verified and created successfully!",
        user: {
          id: createdUser.id,
          email: createdUser.email,
          phone: createdUser.phone || pending.phone,
          name: createdUser.name,
          role: createdUser.role,
          referralCode: createdUser.referralCode,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("verify-signup-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}
