"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Tag,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/profile";
  const refQuery = searchParams.get("ref") || "";

  // Step 1 = Details, Step 2 = OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(refQuery);
  const [showPassword, setShowPassword] = useState(false);

  // OTP Fields
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState<number>(60);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 60-Second Countdown Timer for Step 2
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Focus first OTP input when step 2 opens
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Step A: Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6-9.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-signup-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          password,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP. Please try again.");
        setLoading(false);
        return;
      }

      // Success: proceed to Step 2
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      setCountdown(data.resendAfterSeconds || 60);
      setStep(2);
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  // Resend OTP
  async function handleResendOtp() {
    if (countdown > 0 || resending) return;
    setError(null);
    setResending(true);

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const res = await fetch("/api/auth/send-signup-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          password,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend OTP.");
        setResending(false);
        return;
      }

      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      setCountdown(data.resendAfterSeconds || 60);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch {
      setError("Network error while resending OTP.");
    } finally {
      setResending(false);
    }
  }

  // Handle individual OTP digit change
  function handleOtpChange(index: number, val: string) {
    const digit = val.slice(-1).replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  // Handle backspace navigation in OTP boxes
  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  // Handle clipboard paste across OTP boxes
  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);

    const nextIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  }

  // Auto-fill demo OTP
  function fillDemoOtp() {
    if (!demoOtp || demoOtp.length !== 6) return;
    const digits = demoOtp.split("");
    setOtpDigits(digits);
    otpInputRefs.current[5]?.focus();
  }

  // Step B: Verify OTP and finalize signup
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter all 6 digits of the OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-signup-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: fullOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid verification code.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(nextPath.startsWith("/") ? nextPath : "/profile");
        router.refresh();
      }, 1000);
    } catch {
      setError("Network error while verifying OTP.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto my-6 max-w-md px-4 pb-16">
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
        {/* Top Header Card */}
        <div className="bg-gradient-to-tr from-[#134024] to-[#169443] px-6 py-7 text-white text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/20 shadow-md">
            {step === 1 ? (
              <svg className="h-8 w-8 fill-white" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-10 4-4.22 4.22-3.1 9.5-3 10 .3.4.8.7 1.3.7 1.1 0 1.9-.9 1.9-2 0-3 3-5 5-7z" />
              </svg>
            ) : (
              <ShieldCheck className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white">
            {step === 1 ? "Join EarnKaro" : "Verify Email OTP"}
          </h1>
          <p className="mt-1 text-xs text-emerald-100">
            {step === 1
              ? "Register to start generating affiliate profit links"
              : `6-digit verification code sent to ${email}`}
          </p>

          {/* Stepper Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 1 ? "w-8 bg-white" : "w-4 bg-white/40"
              }`}
            />
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 2 ? "w-8 bg-white" : "w-4 bg-white/40"
              }`}
            />
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-700 ring-1 ring-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 ring-1 ring-emerald-300 animate-pulse">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Account verified successfully! Redirecting...</span>
            </div>
          )}

          {/* STEP 1: Registration Input Form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                </div>
              </div>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide flex items-center justify-between">
                  <span>Mobile Number</span>
                  <span className="text-[10px] text-ink-soft font-normal">10 Digits (+91)</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1 pointer-events-none">
                    <Phone className="h-4 w-4 text-ink-soft" />
                    <span className="text-xs font-black text-ink pl-1 border-r border-ink-soft/30 pr-2">
                      +91
                    </span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-20 pr-4 text-sm font-medium tracking-wide text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
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
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide flex items-center justify-between">
                  <span>Referral Code (Optional)</span>
                  <span className="text-[10px] text-ink-soft font-normal">Bonus on signup</span>
                </label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="text"
                    placeholder="e.g. EARN2026"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-4 text-sm text-ink uppercase placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue & Send OTP</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: 6-Digit OTP Verification Form */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="rounded-2xl bg-emerald-50/70 p-3.5 text-xs text-emerald-950 ring-1 ring-emerald-200/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-700">Verifying Email</span>
                    <p className="font-bold text-ink truncate max-w-[200px] sm:max-w-xs">{email}</p>
                    <p className="text-[10px] text-ink-soft mt-0.5">Mobile: +91 {phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-300 hover:bg-emerald-50 active:scale-95 transition"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* Demo OTP Helper Badge (for instant sandbox testing) */}
              {demoOtp && (
                <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-300">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span>
                      Demo OTP: <strong className="font-mono text-sm tracking-widest">{demoOtp}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoOtp}
                    className="rounded bg-amber-200/70 px-2 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-300 transition"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              {/* 6 Digit OTP Inputs */}
              <div>
                <label className="block text-center text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      className="h-12 w-11 sm:h-14 sm:w-13 rounded-2xl bg-[#F4F6F5] text-center font-mono text-lg font-black text-ink outline-none ring-1 ring-black/10 focus:bg-white focus:ring-2 focus:ring-[#169443] transition shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Resend Countdown Timer */}
              <div className="flex items-center justify-between pt-1 text-xs text-ink-soft">
                {countdown > 0 ? (
                  <span className="text-ink-soft">
                    Resend code in <strong className="text-ink font-mono">00:{countdown.toString().padStart(2, "0")}</strong>
                  </span>
                ) : (
                  <span className="text-ink-soft">Didn&apos;t get the code?</span>
                )}

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || resending}
                  className="font-bold text-[#169443] hover:underline disabled:text-ink-soft/50 disabled:no-underline flex items-center gap-1 transition"
                >
                  <RotateCcw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                  <span>{resending ? "Sending..." : "Resend OTP"}</span>
                </button>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || success || otpDigits.join("").length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified!</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Switch to Login */}
          <div className="mt-6 text-center text-xs text-ink-soft">
            Already have an account?{" "}
            <Link
              href={`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
              className="font-bold text-[#169443] hover:underline"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
