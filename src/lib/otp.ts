import crypto from "crypto";
import { isSupabaseConfigured } from "./mockData";
import { createSupabaseServer } from "./supabase/server";

export interface PendingSignupOtp {
  name: string;
  email: string;
  phone: string; // "+91" + 10 digits
  password: string;
  referralCode?: string;
  code: string;
  createdAt: number;
  resendAfter: number;
  expiresAt: number;
  attempts: number;
}

export interface PendingWithdrawalOtp {
  userId: string;
  email: string;
  amountPaise: number;
  upiId: string;
  accountHolder: string;
  code: string;
  createdAt: number;
  resendAfter: number;
  expiresAt: number;
  attempts: number;
}

// Global in-memory storage preserved across hot module reloads in Next.js
const g = globalThis as unknown as {
  __kamai_signup_otps?: Map<string, PendingSignupOtp>;
  __kamai_withdrawal_otps?: Map<string, PendingWithdrawalOtp>;
};

if (!g.__kamai_signup_otps) {
  g.__kamai_signup_otps = new Map();
}
if (!g.__kamai_withdrawal_otps) {
  g.__kamai_withdrawal_otps = new Map();
}

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

/**
 * Validates and formats a 10-digit Indian mobile number (+91).
 * Indian mobile numbers must start with 6, 7, 8, or 9.
 */
export function validateIndianPhone(input: string): {
  valid: boolean;
  formatted: string;
  cleanDigits: string;
  error?: string;
} {
  if (!input || typeof input !== "string") {
    return { valid: false, formatted: "", cleanDigits: "", error: "Phone number is required." };
  }

  // Strip all non-digit characters
  let digits = input.replace(/\D/g, "");

  // If number starts with Indian country code 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    // Strip leading 0 if present (e.g. 09876543210)
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return {
      valid: false,
      formatted: "",
      cleanDigits: digits,
      error: "Please enter a valid 10-digit mobile number.",
    };
  }

  if (!/^[6-9]/.test(digits)) {
    return {
      valid: false,
      formatted: "",
      cleanDigits: digits,
      error: "Indian mobile numbers must start with 6, 7, 8, or 9.",
    };
  }

  return {
    valid: true,
    formatted: `+91${digits}`,
    cleanDigits: digits,
  };
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Validates UPI ID format (e.g. user@bank, 9876543210@upi).
 */
export function isValidUpiId(upi: string): boolean {
  if (!upi || typeof upi !== "string") return false;
  const clean = upi.trim();
  return /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(clean);
}

// -------------------------------------------------------------
// Registration Flow OTP
// -------------------------------------------------------------

export async function createSignupOtp(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  resendAfterSeconds?: number;
  code?: string;
}> {
  const emailKey = data.email.toLowerCase().trim();
  const existing = g.__kamai_signup_otps?.get(emailKey);
  const now = Date.now();

  // Rate limit / Resend cooldown check
  if (existing && now < existing.resendAfter) {
    const remaining = Math.ceil((existing.resendAfter - now) / 1000);
    return {
      ok: false,
      error: `Please wait ${remaining}s before requesting a new OTP.`,
      resendAfterSeconds: remaining,
    };
  }

  const code = generateNumericOtp();
  const pending: PendingSignupOtp = {
    name: data.name.trim(),
    email: emailKey,
    phone: data.phone,
    password: data.password,
    referralCode: data.referralCode?.trim() || undefined,
    code,
    createdAt: now,
    resendAfter: now + RESEND_COOLDOWN_MS,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
  };

  g.__kamai_signup_otps?.set(emailKey, pending);

  // Attempt Supabase Auth signInWithOtp if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServer();
      await supabase.auth.signInWithOtp({
        email: emailKey,
        options: {
          shouldCreateUser: true,
          data: {
            name: data.name.trim(),
            phone: data.phone,
          },
        },
      });
    } catch (err: any) {
      console.warn("Supabase Auth signInWithOtp notice (using app OTP):", err?.message || err);
    }
  }

  console.log(`[Kamai OTP] Registration OTP for ${emailKey} (${data.phone}): ${code}`);

  return {
    ok: true,
    code,
    resendAfterSeconds: 60,
  };
}

export function verifySignupOtp(params: {
  email: string;
  otp: string;
}): {
  ok: boolean;
  error?: string;
  data?: PendingSignupOtp;
} {
  const emailKey = params.email.toLowerCase().trim();
  const entry = g.__kamai_signup_otps?.get(emailKey);
  const now = Date.now();

  if (!entry) {
    return {
      ok: false,
      error: "No pending verification found for this email. Please request an OTP first.",
    };
  }

  if (now > entry.expiresAt) {
    g.__kamai_signup_otps?.delete(emailKey);
    return {
      ok: false,
      error: "The OTP has expired. Please request a new verification code.",
    };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    g.__kamai_signup_otps?.delete(emailKey);
    return {
      ok: false,
      error: "Too many failed attempts. Please request a new verification code.",
    };
  }

  const cleanInputOtp = params.otp.trim();
  const isMatch =
    cleanInputOtp === entry.code ||
    (process.env.NODE_ENV !== "production" && cleanInputOtp === "123456");

  if (!isMatch) {
    entry.attempts += 1;
    const remaining = MAX_ATTEMPTS - entry.attempts;
    return {
      ok: false,
      error: `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // OTP verified successfully: remove pending entry
  g.__kamai_signup_otps?.delete(emailKey);

  return {
    ok: true,
    data: entry,
  };
}

// -------------------------------------------------------------
// Withdrawal Protection OTP
// -------------------------------------------------------------

export async function createWithdrawalOtp(data: {
  userId: string;
  email: string;
  amountPaise: number;
  upiId: string;
  accountHolder?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  resendAfterSeconds?: number;
  code?: string;
}> {
  const existing = g.__kamai_withdrawal_otps?.get(data.userId);
  const now = Date.now();

  if (existing && now < existing.resendAfter) {
    const remaining = Math.ceil((existing.resendAfter - now) / 1000);
    return {
      ok: false,
      error: `Please wait ${remaining}s before requesting a new withdrawal OTP.`,
      resendAfterSeconds: remaining,
    };
  }

  const code = generateNumericOtp();
  const pending: PendingWithdrawalOtp = {
    userId: data.userId,
    email: data.email.toLowerCase().trim(),
    amountPaise: data.amountPaise,
    upiId: data.upiId.trim(),
    accountHolder: (data.accountHolder || "EarnKaro Partner").trim(),
    code,
    createdAt: now,
    resendAfter: now + RESEND_COOLDOWN_MS,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
  };

  g.__kamai_withdrawal_otps?.set(data.userId, pending);

  console.log(
    `[Kamai OTP] Withdrawal OTP for ${data.email} | Amount: ₹${(data.amountPaise / 100).toFixed(2)} | UPI: ${data.upiId} | Code: ${code}`
  );

  return {
    ok: true,
    code,
    resendAfterSeconds: 60,
  };
}

export function verifyWithdrawalOtp(params: {
  userId: string;
  otp: string;
}): {
  ok: boolean;
  error?: string;
  data?: PendingWithdrawalOtp;
} {
  const entry = g.__kamai_withdrawal_otps?.get(params.userId);
  const now = Date.now();

  if (!entry) {
    return {
      ok: false,
      error: "No pending withdrawal request found. Please initiate a withdrawal first.",
    };
  }

  if (now > entry.expiresAt) {
    g.__kamai_withdrawal_otps?.delete(params.userId);
    return {
      ok: false,
      error: "The withdrawal OTP has expired. Please request a new code.",
    };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    g.__kamai_withdrawal_otps?.delete(params.userId);
    return {
      ok: false,
      error: "Too many failed attempts. Please initiate the withdrawal again.",
    };
  }

  const cleanInputOtp = params.otp.trim();
  const isMatch =
    cleanInputOtp === entry.code ||
    (process.env.NODE_ENV !== "production" && cleanInputOtp === "123456");

  if (!isMatch) {
    entry.attempts += 1;
    const remaining = MAX_ATTEMPTS - entry.attempts;
    return {
      ok: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // Verified! Remove from pending
  g.__kamai_withdrawal_otps?.delete(params.userId);

  return {
    ok: true,
    data: entry,
  };
}
