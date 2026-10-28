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
} from "@/lib/mockData";
import { AUTH_COOKIE, isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = SignupSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { name, email, password, referralCode } = result.data;
    const isAdmin = isAdminEmail(email);
    const role = isAdmin ? "ADMIN" : "USER";

    let authUserId = crypto.randomUUID();

    // 1. If Supabase Auth is configured, register user in Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServer();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (authError) {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (authData.user?.id) {
          authUserId = authData.user.id;
        }
      } catch (err: any) {
        console.warn("Supabase Auth signup notice:", err?.message || err);
      }
    }

    // 2. Link with User table in database
    let createdUser: any = null;

    if (isDatabaseConfigured()) {
      try {
        // Check if user already exists
        const existing = await prisma.user.findFirst({
          where: { OR: [{ id: authUserId }, { email }] },
        });

        if (existing) {
          return NextResponse.json(
            { error: "An account with this email already exists. Please log in." },
            { status: 409 }
          );
        }

        // Check referral
        let referredById: string | null = null;
        if (referralCode) {
          const referrer = await prisma.user.findUnique({
            where: { referralCode },
          });
          if (referrer) referredById = referrer.id;
        }

        createdUser = await prisma.user.create({
          data: {
            id: authUserId,
            email,
            name,
            role,
            referralCode: randomCode(8),
            subIdPrefix: randomCode(6),
            referredById,
          },
        });
      } catch (dbErr: any) {
        console.warn("Database create user fallback:", dbErr?.message || dbErr);
      }
    }

    // 3. Fallback / sandbox runtime store
    if (!createdUser) {
      const existingMock = findMockUserByEmail(email);
      if (existingMock) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in." },
          { status: 409 }
        );
      }

      createdUser = createMockUser({
        id: authUserId,
        email,
        name,
        role,
        referralCode: randomCode(8),
        subIdPrefix: randomCode(6),
      });
    }

    // 4. Set persistent session cookie (7 days)
    const store = await cookies();
    const sessionPayload = {
      id: createdUser.id,
      email: createdUser.email,
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
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          role: createdUser.role,
          referralCode: createdUser.referralCode,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
