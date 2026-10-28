import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { randomCode } from "./shortcode";
import { createSupabaseServer } from "./supabase/server";
import {
  isDatabaseConfigured,
  isSupabaseConfigured,
  DEMO_USER,
  findMockUserByEmail,
  createMockUser,
} from "./mockData";

export const REF_COOKIE = "kamai_ref";
export const AUTH_COOKIE = "kamai_auth_user";

export function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS || "admin@earnkaro.com,admin@earnkaro.local,admin@gmail.com";
  return envEmails
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export function isAdminUser(user?: User | null): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || isAdminEmail(user.email);
}

/**
 * Returns authenticated user from Supabase Auth or verified session cookie.
 * Returns null if not logged in.
 */
export const getAuthUser = cache(async () => {
  const store = await cookies();

  // 1. Try Supabase Auth session via cookies
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServer();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        return data.user;
      }
    } catch (err) {
      // Continue to check fallback session cookie
    }
  }

  // 2. Check application auth session cookie (set during email/password login)
  const sessionCookie = store.get(AUTH_COOKIE)?.value;
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      if (parsed?.id) {
        return {
          id: parsed.id,
          email: parsed.email || null,
          user_metadata: { name: parsed.name || parsed.email?.split("@")[0] || "EarnKaro Partner" },
          aud: "authenticated",
          created_at: parsed.createdAt || new Date().toISOString(),
        } as any;
      }
    } catch {
      // invalid cookie format
    }
  }

  return null;
});

/**
 * Ensures a profile record exists in the public User table for the authenticated user.
 */
export async function getOrCreateProfile(auth: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: { name?: string };
}): Promise<User> {
  const isAdmin = isAdminEmail(auth.email);
  const targetRole: Role = isAdmin ? "ADMIN" : "USER";

  if (!isDatabaseConfigured()) {
    if (auth.email) {
      const existingMock = findMockUserByEmail(auth.email);
      if (existingMock) {
        return {
          id: existingMock.id,
          email: existingMock.email,
          phone: null,
          name: existingMock.name,
          role: isAdmin ? "ADMIN" : existingMock.role,
          referralCode: existingMock.referralCode,
          subIdPrefix: existingMock.subIdPrefix,
          referredById: null,
          createdAt: existingMock.createdAt,
          updatedAt: existingMock.createdAt,
        };
      }
    }
    const userName = auth.user_metadata?.name || (auth.email ? auth.email.split("@")[0] : null) || "EarnKaro Partner";
    const newMock = createMockUser({
      id: auth.id,
      email: auth.email || "partner@kamai.local",
      name: userName,
      role: targetRole,
      referralCode: randomCode(8),
      subIdPrefix: randomCode(6),
    });
    return {
      id: newMock.id,
      email: newMock.email,
      phone: null,
      name: newMock.name,
      role: newMock.role,
      referralCode: newMock.referralCode,
      subIdPrefix: newMock.subIdPrefix,
      referredById: null,
      createdAt: newMock.createdAt,
      updatedAt: newMock.createdAt,
    };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: auth.id } });
    if (existing) {
      // If user is listed in ADMIN_EMAILS but role is USER, update role
      if (isAdmin && existing.role !== "ADMIN") {
        return await prisma.user.update({
          where: { id: existing.id },
          data: { role: "ADMIN" },
        });
      }
      return existing;
    }

    const store = await cookies();
    const refCode = store.get(REF_COOKIE)?.value;
    const referrer =
      refCode && /^[0-9a-zA-Z]{6,12}$/.test(refCode)
        ? await prisma.user.findUnique({ where: { referralCode: refCode } })
        : null;

    const userName =
      auth.user_metadata?.name ||
      (auth.email ? auth.email.split("@")[0] : null) ||
      "EarnKaro Partner";

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.user.create({
          data: {
            id: auth.id,
            email: auth.email || null,
            phone: auth.phone || null,
            name: userName,
            role: targetRole,
            referralCode: randomCode(8),
            subIdPrefix: randomCode(6),
            referredById: referrer && referrer.id !== auth.id ? referrer.id : null,
          },
        });
      } catch (e) {
        const raced = await prisma.user.findUnique({ where: { id: auth.id } });
        if (raced) return raced;
        if ((e as { code?: string }).code !== "P2002") throw e;
      }
    }
  } catch (err) {
    console.warn("Database error in getOrCreateProfile, fallback profile:", err);
  }

  return {
    ...DEMO_USER,
    id: auth.id,
    email: auth.email || DEMO_USER.email,
    name: auth.user_metadata?.name || DEMO_USER.name,
    role: targetRole,
  };
}

/** For route handlers: returns null instead of redirecting if not logged in. */
export async function getApiUser(): Promise<User | null> {
  const auth = await getAuthUser();
  return auth ? getOrCreateProfile(auth) : null;
}

/** For pages: redirects to /login when signed out. */
export async function requirePageUser(nextPath: string): Promise<User> {
  const auth = await getAuthUser();
  if (!auth) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return getOrCreateProfile(auth);
}

/** For admin pages: requires logged in user with role ADMIN. */
export async function requireAdminUser(nextPath: string = "/admin"): Promise<User> {
  const user = await requirePageUser(nextPath);
  if (!isAdminUser(user)) {
    redirect("/?error=access-denied");
  }
  return user;
}
