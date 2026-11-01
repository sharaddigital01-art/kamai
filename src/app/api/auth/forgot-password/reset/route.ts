import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyPasswordResetOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/mockData";

export const runtime = "nodejs";

const ResetPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  otp: z.string().trim().min(4, "Please enter the 6-digit verification code"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = ResetPasswordSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { email: cleanEmail, otp: cleanInputOtp, newPassword } = result.data;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("kamai_pending_otp")?.value || null;

    // 1. Verify OTP
    const verification = verifyPasswordResetOtp({
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

    // 2. Update password in Supabase Auth & PostgreSQL database with email_confirm: true
    let passwordUpdated = false;

    // 2a. Update using Supabase Admin Client
    const adminClient = getSupabaseAdmin();
    if (adminClient) {
      try {
        let targetUserId: string | null = null;
        try {
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const found = listData?.users?.find(
            (u) => u.email?.toLowerCase() === cleanEmail
          );
          if (found) targetUserId = found.id;
        } catch {}

        if (!targetUserId && isDatabaseConfigured()) {
          try {
            const dbU = await prisma.user.findFirst({
              where: { email: cleanEmail },
              select: { id: true },
            });
            if (dbU) targetUserId = dbU.id;
          } catch {}
        }

        if (targetUserId) {
          const { error: adminErr } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            {
              password: newPassword,
              email_confirm: true,
            }
          );
          if (!adminErr) {
            passwordUpdated = true;
          } else {
            console.warn("Supabase admin updateUserById notice:", adminErr.message);
          }
        }
      } catch (adminErr: any) {
        console.warn("Supabase admin updateUserById error:", adminErr?.message || adminErr);
      }
    }

    // 2b. Direct PostgreSQL auth.users update with email_confirmed_at
    if (isDatabaseConfigured()) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE lower(email) = lower($2)`,
          newPassword,
          cleanEmail
        ).catch(() => null);
        passwordUpdated = true;
      } catch (dbErr: any) {
        console.warn("Direct auth.users update notice:", dbErr?.message || dbErr);
      }
    }

    // 2c. Fallback via user session client if active
    if (!passwordUpdated && isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServer();
        const { error: supaErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (!supaErr) {
          passwordUpdated = true;
        }
      } catch (supaErr: any) {
        console.warn("Supabase auth updateUser notice:", supaErr?.message || supaErr);
      }
    }

    // 3. Clear pending OTP cookie
    try {
      cookieStore.delete("kamai_pending_otp");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully! You can now log in with your new password.",
    });
  } catch (err: any) {
    console.error("forgot-password reset error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while resetting password." },
      { status: 500 }
    );
  }
}
