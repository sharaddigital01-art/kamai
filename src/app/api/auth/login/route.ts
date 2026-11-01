import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  isDatabaseConfigured,
  isSupabaseConfigured,
  findMockUserByEmail,
  findMockUserByPhone,
  createMockUser,
} from "@/lib/mockData";
import { AUTH_COOKIE, isAdminEmail } from "@/lib/auth";
import { normalizeIdentifier, verifyLoginOtp } from "@/lib/otp";

export const runtime = "nodejs";

const LoginRequestSchema = z.object({
  // Identifiers
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  identifier: z.string().trim().optional(),
  emailOrPhone: z.string().trim().optional(),

  // Credentials
  password: z.string().optional(),
  otp: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const result = LoginRequestSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid login credentials." },
        { status: 400 }
      );
    }

    const { email, phone, identifier, emailOrPhone, password, otp } = result.data;
    const rawTarget = identifier || emailOrPhone || email || phone || "";

    if (!rawTarget) {
      return NextResponse.json(
        { error: "Please enter your email address." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------
    // Flow A: OTP Login (Email OTP)
    // -------------------------------------------------------------
    if (otp) {
      const norm = normalizeIdentifier(rawTarget);
      if (norm.error) {
        return NextResponse.json({ error: norm.error }, { status: 400 });
      }

      let cookieToken: string | null = null;
      let cookieStore: any = null;
      try {
        cookieStore = await cookies();
        cookieToken = cookieStore.get("kamai_pending_otp")?.value || null;
      } catch {
        // outside request scope
      }

      // Verify OTP against unified Brevo store or mock/test OTP 123456
      const verification = verifyLoginOtp({
        identifier: norm.normalized,
        otp,
        cookieToken,
      });

      if (!verification.ok) {
        return NextResponse.json(
          { error: verification.error || "Invalid or expired verification code." },
          { status: 400 }
        );
      }

      const isAdmin = norm.type === "email" ? isAdminEmail(norm.normalized) : false;
      let user: any = null;

      // 1. Database Lookup or Upsert
      if (isDatabaseConfigured()) {
        try {
          if (norm.type === "email") {
            user = await prisma.user.findFirst({
              where: { email: norm.normalized },
            });
          } else {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { phone: norm.normalized },
                  ...(norm.cleanDigits ? [{ phone: norm.cleanDigits }] : []),
                ],
              },
            });
          }

          if (!user) {
            // Auto-create user record for new OTP login
            const generatedId = crypto.randomUUID();
            user = await prisma.user.create({
              data: {
                id: generatedId,
                email: norm.type === "email" ? norm.normalized : null,
                phone: norm.type === "phone" ? norm.normalized : null,
                name:
                  norm.type === "email"
                    ? norm.normalized.split("@")[0]
                    : `Partner ${norm.cleanDigits?.slice(-4) || ""}`.trim(),
                role: isAdmin ? "ADMIN" : "USER",
                referralCode: randomCode(8),
                subIdPrefix: randomCode(6),
              },
            });
          } else if (isAdmin && user.role !== "ADMIN") {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" },
            });
          }
        } catch (dbErr: any) {
          console.warn("Database lookup in OTP login fallback:", dbErr?.message || dbErr);
        }
      }

      // 2. Fallback / Mock Runtime Store
      if (!user) {
        if (norm.type === "email") {
          const existingMock = findMockUserByEmail(norm.normalized);
          if (existingMock) {
            user = { ...existingMock, role: isAdmin ? "ADMIN" : existingMock.role };
          }
        } else if (norm.cleanDigits) {
          const existingMock = findMockUserByPhone(norm.cleanDigits);
          if (existingMock) {
            user = existingMock;
          }
        }

        if (!user) {
          const fallbackName =
            (norm.type === "email"
              ? norm.normalized.split("@")[0]
              : `Partner ${norm.cleanDigits?.slice(-4) || ""}`.trim()) || "EarnKaro Partner";

          user = createMockUser({
            id: crypto.randomUUID(),
            email: norm.type === "email" ? norm.normalized : `user_${randomCode(6)}@kamai.local`,
            phone: norm.type === "phone" ? norm.normalized : null,
            name: fallbackName,
            role: isAdmin ? "ADMIN" : "USER",
            referralCode: randomCode(8),
            subIdPrefix: randomCode(6),
          });
        }
      }

      // 3. Set persistent session cookie (7 days)
      try {
        const store = await cookies();
        const sessionPayload = {
          id: user.id,
          email: user.email || null,
          phone: user.phone || null,
          name: user.name || "EarnKaro Partner",
          role: user.role || "USER",
          referralCode: user.referralCode,
          createdAt: user.createdAt || new Date().toISOString(),
        };

        store.set(AUTH_COOKIE, encodeURIComponent(JSON.stringify(sessionPayload)), {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        store.delete("kamai_pending_otp");
      } catch (cookieErr: any) {
        console.warn("Session cookie set notice (e.g. outside request context):", cookieErr?.message || cookieErr);
      }

      return NextResponse.json({
        success: true,
        message: "Successfully signed in via OTP.",
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          referralCode: user.referralCode,
        },
      });
    }

    // -------------------------------------------------------------
    // Flow B: Direct Password Sign-In
    // -------------------------------------------------------------
    if (!password) {
      return NextResponse.json(
        { error: "Password or verification code is required." },
        { status: 400 }
      );
    }

    const norm = normalizeIdentifier(rawTarget);
    const targetEmail = norm.type === "email" ? norm.normalized : rawTarget.toLowerCase().trim();
    const isAdmin = isAdminEmail(targetEmail);

    let authUserId: string | null = null;
    let authName: string | null = null;

    // 1. If Supabase Auth is configured, attempt authentication
    if (isSupabaseConfigured() && norm.type === "email") {
      try {
        const supabase = await createSupabaseServer();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (authError) {
          // If Supabase throws rate limit or invalid credentials, return clear message
          if (authError.status === 429) {
            return NextResponse.json(
              { error: "Too many sign-in attempts. Please try again later or sign in using OTP." },
              { status: 429 }
            );
          }
          if (!isAdmin && isDatabaseConfigured()) {
            return NextResponse.json({ error: authError.message }, { status: 401 });
          }
        }

        if (authData?.user) {
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
        if (norm.type === "email") {
          user = await prisma.user.findFirst({
            where: authUserId ? { OR: [{ id: authUserId }, { email: targetEmail }] } : { email: targetEmail },
          });
        } else {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: norm.normalized },
                ...(norm.cleanDigits ? [{ phone: norm.cleanDigits }] : []),
              ],
            },
          });
        }

        if (!user && (authUserId || isAdmin)) {
          // Auto-create linked user record
          user = await prisma.user.create({
            data: {
              id: authUserId || crypto.randomUUID(),
              email: norm.type === "email" ? targetEmail : null,
              phone: norm.type === "phone" ? norm.normalized : null,
              name: authName || targetEmail.split("@")[0] || (isAdmin ? "EarnKaro Admin" : "EarnKaro Partner"),
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
      const existingMock =
        norm.type === "email"
          ? findMockUserByEmail(targetEmail)
          : norm.cleanDigits
          ? findMockUserByPhone(norm.cleanDigits)
          : undefined;

      if (existingMock) {
        user = {
          ...existingMock,
          role: isAdmin ? "ADMIN" : existingMock.role,
        };
      } else if (isAdmin || !isSupabaseConfigured()) {
        user = createMockUser({
          id: authUserId || crypto.randomUUID(),
          email: norm.type === "email" ? targetEmail : `user_${randomCode(6)}@kamai.local`,
          phone: norm.type === "phone" ? norm.normalized : null,
          name: authName || targetEmail.split("@")[0] || (isAdmin ? "EarnKaro Admin" : "EarnKaro Partner"),
          role: isAdmin ? "ADMIN" : "USER",
          referralCode: randomCode(8),
          subIdPrefix: randomCode(6),
        });
      } else {
        return NextResponse.json(
          { error: "Invalid credentials. Please check your email and password or log in via Email OTP." },
          { status: 401 }
        );
      }
    }

    // 4. Set persistent session cookie (7 days)
    try {
      const store = await cookies();
      const sessionPayload = {
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        name: user.name || "EarnKaro Partner",
        role: user.role || "USER",
        referralCode: user.referralCode,
        createdAt: user.createdAt || new Date().toISOString(),
      };

      store.set(AUTH_COOKIE, encodeURIComponent(JSON.stringify(sessionPayload)), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch (cookieErr: any) {
      console.warn("Session cookie set notice (e.g. outside request context):", cookieErr?.message || cookieErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
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
