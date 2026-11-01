import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import {
  isDatabaseConfigured,
  findMockUserByEmail,
  findMockUserByPhone,
  createMockUser,
} from "@/lib/mockData";
import { AUTH_COOKIE, isAdminEmail } from "@/lib/auth";
import { normalizeIdentifier, verifyLoginOtp } from "@/lib/otp";

export const runtime = "nodejs";

const VerifyOtpSchema = z.object({
  identifier: z.string().trim().optional(),
  emailOrPhone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  otp: z.string().trim().min(6, "Please enter the 6-digit OTP").max(6),
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

    const { identifier, emailOrPhone, email, phone, otp } = result.data;
    const rawTarget = identifier || emailOrPhone || email || phone || "";

    if (!rawTarget) {
      return NextResponse.json(
        { error: "Please enter your email address." },
        { status: 400 }
      );
    }

    const norm = normalizeIdentifier(rawTarget);
    if (norm.error) {
      return NextResponse.json({ error: norm.error }, { status: 400 });
    }

    const verification = verifyLoginOtp({
      identifier: norm.normalized,
      otp,
    });

    if (!verification.ok) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    const isAdmin = norm.type === "email" ? isAdminEmail(norm.normalized) : false;
    let user: any = null;

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
        console.warn("Database lookup in verify-otp fallback:", dbErr?.message || dbErr);
      }
    }

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
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
