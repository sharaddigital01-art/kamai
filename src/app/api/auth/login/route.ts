import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  isDatabaseConfigured,
  isSupabaseConfigured,
  findMockUserByEmail,
  createMockUser,
} from "@/lib/mockData";
import { AUTH_COOKIE, isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = LoginSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const isAdmin = isAdminEmail(email);

    let authUserId: string | null = null;
    let authName: string | null = null;

    // 1. If Supabase Auth is configured, attempt authentication
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServer();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          return NextResponse.json({ error: authError.message }, { status: 401 });
        }

        if (authData.user) {
          authUserId = authData.user.id;
          authName = (authData.user.user_metadata as any)?.name || null;
        }
      } catch (err: any) {
        console.warn("Supabase Auth login attempt notice:", err?.message || err);
      }
    }

    // 2. Fetch or create user record from database
    let user: any = null;

    if (isDatabaseConfigured()) {
      try {
        user = await prisma.user.findFirst({
          where: authUserId ? { OR: [{ id: authUserId }, { email }] } : { email },
        });

        if (!user && (authUserId || isAdmin)) {
          // Auto-create linked user record
          user = await prisma.user.create({
            data: {
              id: authUserId || crypto.randomUUID(),
              email,
              name: authName || email.split("@")[0] || (isAdmin ? "EarnKaro Admin" : "EarnKaro Partner"),
              role: isAdmin ? "ADMIN" : "USER",
              referralCode: randomCode(8),
              subIdPrefix: randomCode(6),
            },
          });
        }

        // If email is listed in ADMIN_EMAILS, ensure role is ADMIN in database
        if (user && isAdmin && user.role !== "ADMIN") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
        }
      } catch (dbErr: any) {
        console.warn("Database lookup fallback:", dbErr?.message || dbErr);
      }
    }

    // 3. Fallback / sandbox runtime store
    if (!user) {
      const existingMock = findMockUserByEmail(email);
      if (existingMock) {
        user = {
          ...existingMock,
          role: isAdmin ? "ADMIN" : existingMock.role,
        };
      } else if (isAdmin || !isSupabaseConfigured()) {
        user = createMockUser({
          id: authUserId || crypto.randomUUID(),
          email,
          name: authName || email.split("@")[0] || (isAdmin ? "EarnKaro Admin" : "EarnKaro Partner"),
          role: isAdmin ? "ADMIN" : "USER",
          referralCode: randomCode(8),
          subIdPrefix: randomCode(6),
        });
      } else {
        return NextResponse.json(
          { error: "Invalid email or password. Please check your credentials." },
          { status: 401 }
        );
      }
    }

    // 4. Set persistent session cookie (7 days)
    const store = await cookies();
    const sessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      referralCode: user.referralCode,
      createdAt: user.createdAt || new Date().toISOString(),
    };

    store.set(AUTH_COOKIE, encodeURIComponent(JSON.stringify(sessionPayload)), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        referralCode: user.referralCode,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
