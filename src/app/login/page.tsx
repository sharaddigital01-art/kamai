"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const ForgotPasswordModal = dynamic(
  () =>
    import("@/components/ForgotPasswordModal").then(
      (m) => m.ForgotPasswordModal
    ),
  { ssr: false }
);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/profile";

  // Tab: 'password' | 'otp'
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // --- Password Mode States ---
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- OTP Mode States ---
  const [otpStep, setOtpStep] = useState<1 | 2>(1); // 1 = enter email, 2 = enter otp
  const [otpEmail, setOtpEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState<number>(0);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  // --- Common UI States ---
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // Focus first OTP input when entering OTP step 2
  useEffect(() => {
    if (authMode === "otp" && otpStep === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [authMode, otpStep]);

  // ---------------------------------------------------------------------------
  // Action: Direct Password Login (Email + Password)
  // ---------------------------------------------------------------------------
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanEmail = passwordEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setIsRateLimited(true);
          setError(
            data.error ||
              "Too many failed login attempts. Please wait a moment or sign in using Email OTP."
          );
        } else {
          setError(data.error || "Invalid credentials. Please verify your email and password.");
        }
        return;
      }

      // Success: redirect
      router.push(nextPath.startsWith("/") ? nextPath : "/profile");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Action: Send Login OTP (Step 1)
  // ---------------------------------------------------------------------------
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setIsRateLimited(true);
          const cooldown = data.resendAfterSeconds || 60;
          setCountdown(cooldown);
          setError(
            data.error ||
              `Rate limit reached. Please wait ${cooldown}s or switch to Password Login.`
          );
        } else {
          setError(
            data.error ||
              "Could not send email OTP. You can log in directly using your Password instead."
          );
        }
        return;
      }

      // Success: proceed to Step 2
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      const cooldownSec = data.resendAfterSeconds || 60;
      setCountdown(cooldownSec);
      setIsRateLimited(false);
      setSuccessNotice(data.message || `Verification code sent to ${cleanEmail}.`);
      setOtpStep(2);
    } catch {
      setError("Network connection issue. Please try again or use Password Login.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Action: Resend OTP
  // ---------------------------------------------------------------------------
  async function handleResendOtp() {
    if (countdown > 0 || resending) return;
    setError(null);
    setSuccessNotice(null);
    setResending(true);

    try {
      const cleanEmail = otpEmail.trim().toLowerCase();
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setIsRateLimited(true);
          setCountdown(data.resendAfterSeconds || 60);
        }
        setError(data.error || "Unable to resend OTP at this time.");
        return;
      }

      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      setCountdown(data.resendAfterSeconds || 60);
      setIsRateLimited(false);
      setSuccessNotice("New verification code sent to your email!");
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch {
      setError("Network error while resending OTP.");
    } finally {
      setResending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Action: Verify OTP & Complete Login (Step 2)
  // ---------------------------------------------------------------------------
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: otpEmail.trim().toLowerCase(),
          otp: enteredOtp,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Invalid verification code. Please check and try again.");
        return;
      }

      // Success: redirect
      router.push(nextPath.startsWith("/") ? nextPath : "/profile");
      router.refresh();
    } catch {
      setError("Network error while verifying OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // OTP Digits Input Handler
  // ---------------------------------------------------------------------------
  function handleOtpChange(index: number, val: string) {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    // Handle full 6-digit paste
    if (clean.length >= 6) {
      const six = clean.slice(0, 6).split("");
      setOtpDigits(six);
      otpInputRefs.current[5]?.focus();
      return;
    }

    const digit = clean.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function fillDemoOtp(code: string) {
    const chars = code.slice(0, 6).split("");
    while (chars.length < 6) chars.push("");
    setOtpDigits(chars);
    otpInputRefs.current[5]?.focus();
  }

  function fillAdminDemo() {
    setAuthMode("password");
    setPasswordEmail("admin@earnkaro.com");
    setPassword("admin123456");
    setError(null);
  }

  return (
    <div className="mx-auto my-6 max-w-md px-4 pb-16">
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
        {/* Top Header Card */}
        <div className="bg-gradient-to-tr from-[#134024] to-[#169443] px-6 py-8 text-white text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/20 shadow-md">
            <svg className="h-8 w-8 fill-white" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-10 4-4.22 4.22-3.1 9.5-3 10 .3.4.8.7 1.3.7 1.1 0 1.9-.9 1.9-2 0-3 3-5 5-7z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white">
            Log In to Kamai Karo
          </h1>
          <p className="mt-1 text-xs text-emerald-100">
            Sign in using your email address to access your deals and dashboard
          </p>
        </div>

        {/* Tab Switcher: Password Login vs Email OTP Login */}
        <div className="border-b border-gray-100 bg-[#F9FBFA] p-2">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-200/60 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition ${
                authMode === "password"
                  ? "bg-white text-[#169443] shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Password Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 transition ${
                authMode === "otp"
                  ? "bg-white text-[#169443] shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Login via OTP / Magic Link</span>
            </button>
          </div>
        </div>

        {/* Login Body */}
        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex flex-col gap-2 rounded-2xl bg-red-50 p-3.5 text-xs text-red-700 ring-1 ring-red-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>

              {isRateLimited && (
                <div className="mt-1 flex items-center justify-between border-t border-red-200/60 pt-2 text-[11px]">
                  <span className="font-medium text-red-800">
                    {countdown > 0 ? `Cooldown: ${countdown}s remaining` : "Cooldown active"}
                  </span>
                  {authMode === "otp" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("password");
                        setError(null);
                      }}
                      className="font-bold text-[#169443] hover:underline"
                    >
                      Use Password Login →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("otp");
                        setError(null);
                      }}
                      className="font-bold text-[#169443] hover:underline"
                    >
                      Try Email OTP →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Success Notice */}
          {successNotice && !error && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#169443]" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: Password Direct Sign-In Form                               */}
          {/* ================================================================= */}
          {authMode === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={passwordEmail}
                    onChange={(e) => setPasswordEmail(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-11 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft hover:text-ink"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-xs font-semibold text-[#169443] hover:text-[#13803a] hover:underline transition"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <span>Log In with Password</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("otp");
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#169443] hover:text-[#13803a] hover:underline transition"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Login via OTP / Magic Link →</span>
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: Email OTP Login (Step 1: Enter Email)                       */}
          {/* ================================================================= */}
          {authMode === "otp" && otpStep === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  We will send a 6-digit verification code to your email via Brevo (<span className="text-[#169443] font-semibold">support@kamaikaro.in</span>).
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || countdown > 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Sending Code to Email...</span>
                  </>
                ) : countdown > 0 ? (
                  <span>Wait {countdown}s to Resend</span>
                ) : (
                  <>
                    <span>Get Email Verification Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("password");
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#169443] hover:text-[#13803a] hover:underline transition"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Have a password? Log in with Password instead →</span>
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: Email OTP Login (Step 2: Enter 6-digit Code)                */}
          {/* ================================================================= */}
          {authMode === "otp" && otpStep === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-ink-soft">
                  Enter the 6-digit verification code sent to
                </p>
                <p className="font-bold text-sm text-ink mt-0.5">{otpEmail}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep(1);
                    setError(null);
                    setSuccessNotice(null);
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#169443] hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Change email address</span>
                </button>
              </div>

              {/* 6-Digit OTP Boxes */}
              <div className="flex justify-center gap-2 pt-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="h-12 w-11 rounded-xl border border-gray-200 bg-[#F4F6F5] text-center text-lg font-black text-ink shadow-sm outline-none transition focus:border-[#169443] focus:bg-white focus:ring-2 focus:ring-[#169443]/30"
                  />
                ))}
              </div>

              {/* Test / Dev OTP Helper */}
              {demoOtp && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
                  <span className="flex items-center gap-1 font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-[#169443]" />
                    Test Code: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">{demoOtp}</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => fillDemoOtp(demoOtp)}
                    className="font-bold text-[#169443] hover:underline"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              {/* Resend Cooldown Countdown */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-ink-soft">Didn't receive email?</span>
                {countdown > 0 ? (
                  <span className="font-semibold text-ink-soft">
                    Resend in {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendOtp}
                    className="flex items-center gap-1 font-bold text-[#169443] hover:underline disabled:opacity-50"
                  >
                    <RotateCcw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Verifying & Logging In...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Log In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("password");
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#169443] hover:text-[#13803a] hover:underline transition"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Have a password? Log in with Password instead →</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Credentials Help */}
          <div className="mt-6 rounded-2xl bg-emerald-50/80 p-3.5 text-xs text-emerald-900 ring-1 ring-emerald-200/60">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="h-4 w-4 text-[#169443]" />
                Demo Credentials & Quick Sign-In
              </span>
              <button
                type="button"
                onClick={fillAdminDemo}
                className="font-bold text-[#169443] hover:underline"
              >
                Auto-fill Admin
              </button>
            </div>
            <p className="mt-1 text-[11px] text-emerald-700">
              Admin Login: <code className="bg-emerald-100 px-1 py-0.5 rounded">admin@earnkaro.com</code> | Pass: <code className="bg-emerald-100 px-1 py-0.5 rounded">admin123456</code>
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-700">
              Reliable Test OTP in dev: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">123456</code> (always accepted)
            </p>
          </div>

          {/* Switch to Signup */}
          <div className="mt-6 text-center text-xs text-ink-soft">
            Don't have an account yet?{" "}
            <Link
              href={`/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
              className="font-bold text-[#169443] hover:underline"
            >
              Sign Up for Free
            </Link>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={passwordEmail}
        onSuccess={() => {
          setSuccessNotice("Password reset successfully! Please log in with your new password.");
          setPassword("");
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
