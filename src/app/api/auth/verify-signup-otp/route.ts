import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import {
  isDatabaseConfigured,
  createMockUser,
  findMockUserByEmail,
  getUserBalances,
} from "@/lib/mockData";
import { AUTH_COOKIE, isAdminEmail } from "@/lib/auth";
import { verifyUnifiedOtp } from "@/lib/otp";

export const runtime = "nodejs";

const VerifySchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  otp: z.string().trim().min(1, "Please enter the verification code"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const result = VerifySchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { email, otp } = result.data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanInputOtp = otp.trim();

    // Read serverless cookie if present
    let cookieToken: string | null = null;
    let cookieStore: any = null;
    try {
      cookieStore = await cookies();
      cookieToken = cookieStore.get("kamai_pending_otp")?.value || null;
    } catch {
      // outside request context
    }

    // 1. Verify against Unified Brevo OTP Store
    const verification = verifyUnifiedOtp({
      email: cleanEmail,
      otp: cleanInputOtp,
      cookieToken,
    });

    if (!verification.ok || !verification.data) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    const pending = verification.data;
    const isAdmin = isAdminEmail(cleanEmail);
    const role = isAdmin ? "ADMIN" : "USER";
    const authUserId = crypto.randomUUID();

    // 2. Create or link record in database (no duplicate Supabase email sent)
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
            email: cleanEmail,
            phone: pending.phone || null,
            name: pending.name || cleanEmail.split("@")[0] || "EarnKaro Partner",
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

    // 3. Runtime / sandbox fallback user store
    if (!createdUser) {
      createdUser = createMockUser({
        id: authUserId,
        email: cleanEmail,
        phone: pending.phone || null,
        name: pending.name || cleanEmail.split("@")[0] || "EarnKaro Partner",
        role,
        isVerified: true,
        referralCode: randomCode(8),
        subIdPrefix: randomCode(6),
      });
    }

    // 4. Initialize wallet ledger balance to exactly ₹0.00
    try {
      const initialBalances = getUserBalances(createdUser.id);
      initialBalances.available = 0;
      initialBalances.pending = 0;
      initialBalances.inWithdrawal = 0;
      initialBalances.paid = 0;
      initialBalances.lifetime = 0;
    } catch {
      // ignore
    }

    // 5. Set persistent authenticated session cookie (7 days) & clear pending OTP
    try {
      if (cookieStore) {
        const sessionPayload = {
          id: createdUser.id,
          email: createdUser.email,
          phone: createdUser.phone || null,
          name: createdUser.name,
          role: createdUser.role,
          referralCode: createdUser.referralCode,
          createdAt: new Date().toISOString(),
        };

        cookieStore.set(AUTH_COOKIE, encodeURIComponent(JSON.stringify(sessionPayload)), {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        cookieStore.delete("kamai_pending_otp");
      }
    } catch (cookieErr: any) {
      console.warn("Session cookie set notice:", cookieErr?.message || cookieErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account verified and created successfully!",
        user: {
          id: createdUser.id,
          email: createdUser.email,
          phone: createdUser.phone || null,
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
