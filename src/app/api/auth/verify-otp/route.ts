import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import {
  isDatabaseConfigured,
  findMockUserByEmail,
  createMockUser,
} from "@/lib/mockData";
import { AUTH_COOKIE, isAdminEmail } from "@/lib/auth";
import { verifyUnifiedOtp } from "@/lib/otp";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mockData";

export const runtime = "nodejs";

const VerifyOtpSchema = z.object({
  identifier: z.string().trim().optional(),
  emailOrPhone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  password: z.string().optional(),
  otp: z.string().trim().min(1, "Please enter the verification code"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const result = VerifyOtpSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid OTP payload." },
        { status: 400 }
      );
    }

    const { identifier, emailOrPhone, email, phone, password: directPassword, otp } = result.data;
    const cleanEmail = (email || identifier || emailOrPhone || phone || "").trim().toLowerCase();
    const cleanInputOtp = otp.trim();

    if (!cleanEmail) {
      return NextResponse.json(
        { error: "Please enter your email address." },
        { status: 400 }
      );
    }

    // Read serverless cookie if present
    let cookieToken: string | null = null;
    let cookieStore: any = null;
    try {
      cookieStore = await cookies();
      cookieToken = cookieStore.get("kamai_pending_otp")?.value || null;
    } catch {
      // outside request context
    }

    // Verify against Unified Brevo OTP store
    const verification = verifyUnifiedOtp({
      email: cleanEmail,
      otp: cleanInputOtp,
      cookieToken,
    });

    if (!verification.ok || !verification.data) {
      return NextResponse.json(
        { error: verification.error || "Invalid verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    const pending = verification.data;
    const isAdmin = isAdminEmail(cleanEmail);
    let user: any = null;

    // 1. Database Lookup or Creation
    if (isDatabaseConfigured()) {
      try {
        user = await prisma.user.findFirst({
          where: { email: cleanEmail },
        });

        if (!user) {
          let referredById: string | null = null;
          if (pending.referralCode) {
            const referrer = await prisma.user.findUnique({
              where: { referralCode: pending.referralCode },
            });
            if (referrer) referredById = referrer.id;
          }

          const generatedId = crypto.randomUUID();
          user = await prisma.user.create({
            data: {
              id: generatedId,
              email: cleanEmail,
              name: pending.name || cleanEmail.split("@")[0] || "Kamai Karo Partner",
              role: isAdmin ? "ADMIN" : "USER",
              referralCode: randomCode(8),
              subIdPrefix: randomCode(6),
              referredById,
            },
          });
        }

        if (user && isAdmin && user.role !== "ADMIN") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
        }
      } catch (dbErr: any) {
        console.warn("Database lookup in verify-otp fallback:", dbErr?.message || dbErr);
      }
    }

    const enteredPassword = (directPassword || pending.password || "").trim();

    // Auto-confirm verified user in Supabase Auth & PostgreSQL
    const adminClient = getSupabaseAdmin();
    if (adminClient) {
      try {
        let supaUserId: string | null = user?.id || null;
        if (!supaUserId) {
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const found = listData?.users?.find(
            (u) => u.email?.toLowerCase() === cleanEmail
          );
          if (found) supaUserId = found.id;
        }
        if (supaUserId) {
          const updatePayload: any = { email_confirm: true };
          if (enteredPassword) {
            updatePayload.password = enteredPassword;
          }
          await adminClient.auth.admin.updateUserById(supaUserId, updatePayload);
        }
      } catch (adminErr: any) {
        console.warn("Supabase admin confirm in verify-otp notice:", adminErr?.message || adminErr);
      }
    }

    // Call supabase.auth.updateUser({ password: enteredPassword }) once session is confirmed
    if (isSupabaseConfigured() && enteredPassword) {
      try {
        const supabase = await createSupabaseServer();
        const { data: signInRes } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: enteredPassword,
        });
        if (signInRes?.user || signInRes?.session) {
          await supabase.auth.updateUser({ password: enteredPassword });
        }
      } catch (supaErr: any) {
        console.warn("Supabase server updateUser notice in verify-otp:", supaErr?.message || supaErr);
      }
    }

    if (isDatabaseConfigured()) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE lower(email) = lower($1)`,
          cleanEmail
        ).catch(() => null);
      } catch {}
    }

    // 2. Mock Fallback Store if DB unavailable
    if (!user) {
      const existingMock = findMockUserByEmail(cleanEmail);
      if (existingMock) {
        if (enteredPassword) existingMock.password = enteredPassword;
        user = { ...existingMock, role: isAdmin ? "ADMIN" : existingMock.role };
      } else {
        user = createMockUser({
          id: crypto.randomUUID(),
          email: cleanEmail,
          name: pending.name || cleanEmail.split("@")[0] || "Kamai Karo Partner",
          role: isAdmin ? "ADMIN" : "USER",
          password: enteredPassword || undefined,
          referralCode: randomCode(8),
          subIdPrefix: randomCode(6),
        });
      }
    }

    // 3. Set persistent authenticated session cookie (7 days) & clear pending OTP
    try {
      if (cookieStore) {
        const sessionPayload = {
          id: user.id,
          email: user.email || cleanEmail,
          name: user.name || "Kamai Karo Partner",
          role: user.role || "USER",
          referralCode: user.referralCode,
          createdAt: user.createdAt || new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
      message: "Successfully verified and signed in.",
      user: {
        id: user.id,
        email: user.email || cleanEmail,
        name: user.name,
        role: user.role,
        referralCode: user.referralCode,
      },
    });
  } catch (err: any) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
