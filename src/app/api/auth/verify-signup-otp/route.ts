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
import { supabaseAdmin, getSupabaseAdmin } from "@/lib/supabase/admin";

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
    let authUserId: string = crypto.randomUUID();

    // 1.5 Auto-Confirm on Signup / OTP Verification via Supabase Admin
    const adminClient = getSupabaseAdmin();
    if (adminClient) {
      try {
        const createPayload: any = {
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            name: pending.name || cleanEmail.split("@")[0] || "Kamai Karo Partner",
          },
        };
        if (pending.password) {
          createPayload.password = pending.password;
        }

        const { data: supaCreate, error: supaErr } =
          await adminClient.auth.admin.createUser(createPayload);

        if (supaCreate?.user?.id) {
          authUserId = supaCreate.user.id;
        } else if (supaErr) {
          // If the user already exists in Supabase Auth, find and auto-confirm them
          console.warn("Supabase createUser notice in verify-signup-otp:", supaErr.message);

          let existingSupaId: string | null = null;
          try {
            const { data: listData } = await adminClient.auth.admin.listUsers();
            const found = listData?.users?.find(
              (u) => u.email?.toLowerCase() === cleanEmail
            );
            if (found) existingSupaId = found.id;
          } catch {}

          if (!existingSupaId && isDatabaseConfigured()) {
            try {
              const dbU = await prisma.user.findFirst({
                where: { email: cleanEmail },
                select: { id: true },
              });
              if (dbU) existingSupaId = dbU.id;
            } catch {}
          }

          if (existingSupaId) {
            authUserId = existingSupaId;
            const updatePayload: any = { email_confirm: true };
            if (pending.password) {
              updatePayload.password = pending.password;
            }
            await adminClient.auth.admin.updateUserById(existingSupaId, updatePayload);
          }
        }
      } catch (adminErr: any) {
        console.warn("Supabase admin auto-confirm error in verify-signup-otp:", adminErr?.message || adminErr);
      }
    }

    // Direct database auto-confirm for PostgreSQL auth.users
    if (isDatabaseConfigured()) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE lower(email) = lower($1)`,
          cleanEmail
        ).catch(() => null);
      } catch {}
    }

    // 2. Create or link record in database (no duplicate Supabase email sent)
    let createdUser: any = null;

    if (isDatabaseConfigured()) {
      try {
        let referredById: string | null = null;
        if (pending.referralCode) {
          const referrer = await prisma.user.findUnique({
            where: { referralCode: pending.referralCode },
            select: { id: true },
          });
          if (referrer) referredById = referrer.id;
        }

        const existing = await prisma.user.findFirst({
          where: { OR: [{ id: authUserId }, { email: cleanEmail }] },
        });

        if (existing) {
          createdUser = existing;
        } else {
          createdUser = await prisma.user.create({
            data: {
              id: authUserId,
              email: cleanEmail,
              phone: pending.phone || null,
              name: pending.name || cleanEmail.split("@")[0] || "Kamai Karo Partner",
              role,
              referralCode: randomCode(8),
              subIdPrefix: randomCode(6),
              referredById,
            },
          });
        }
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
        name: pending.name || cleanEmail.split("@")[0] || "Kamai Karo Partner",
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
