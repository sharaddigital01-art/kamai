import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/mockData";

export const runtime = "nodejs";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const user = await getApiUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Authentication required to change password." },
        { status: 401 }
      );
    }

    const json = await req.json();
    const result = ChangePasswordSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    // 1. Verify current password with Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServer();
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInErr) {
          return NextResponse.json(
            { error: "Current password does not match. Please verify and try again." },
            { status: 400 }
          );
        }

        // 2. Update to new password in Supabase Auth
        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateErr) {
          return NextResponse.json(
            { error: updateErr.message || "Failed to update password." },
            { status: 400 }
          );
        }
      } catch (err: any) {
        console.warn("Supabase auth change password notice:", err?.message || err);
      }
    }

    // 3. Direct SQL sync in database if configured
    if (isDatabaseConfigured()) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = now() WHERE lower(email) = lower($2)`,
          newPassword,
          user.email.toLowerCase().trim()
        );
      } catch (dbErr: any) {
        console.warn("Direct auth.users update in change-password notice:", dbErr?.message || dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (err: any) {
    console.error("change-password error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error while changing password." },
      { status: 500 }
    );
  }
}
