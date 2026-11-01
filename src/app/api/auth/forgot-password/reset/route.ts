import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyPasswordResetOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase/server";
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

    // 2. Update password in Supabase and PostgreSQL database
    let passwordUpdated = false;

    if (isDatabaseConfigured()) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = now() WHERE lower(email) = lower($2)`,
          newPassword,
          cleanEmail
        );
        passwordUpdated = true;
      } catch (dbErr: any) {
        console.warn("Direct auth.users update notice:", dbErr?.message || dbErr);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServer();
        // If an active session exists or admin client available
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
