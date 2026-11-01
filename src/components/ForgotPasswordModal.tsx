"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  KeyRound,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => (c <= 1 ? 0 : c - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  if (!isOpen) return null;

  function resetState() {
    setStep(1);
    setOtpDigits(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccessMsg(null);
    setDemoOtp(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSendCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to send reset code. Please try again.");
        return;
      }

      setStep(2);
      setCountdown(data.resendAfterSeconds || 60);
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      setSuccessMsg(`We sent a 6-digit reset code to ${cleanEmail}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
        return;
      }

      setCountdown(data.resendAfterSeconds || 60);
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      setSuccessMsg("A new verification code has been sent!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError("Network error while resending code.");
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(index: number, val: string) {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = otpDigits.join("").trim();
    if (cleanOtp.length < 4) {
      setError("Please enter the complete verification code.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to reset password. Please check your OTP.");
        return;
      }

      setSuccessMsg("Password reset successfully! You can now log in with your new password.");
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 2000);
    } catch {
      setError("Network error while resetting password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="bg-gradient-to-tr from-[#134024] to-[#169443] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm ring-1 ring-white/30">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h3 id="forgot-password-title" className="font-display font-bold text-base text-white">
                  {step === 1 ? "Forgot Password" : "Reset Your Password"}
                </h3>
                <p className="text-[11px] text-emerald-100">
                  {step === 1
                    ? "Verify your email with Brevo OTP"
                    : `Enter code sent to ${email}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#169443]" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-ink-soft">
                  We will dispatch a 6-digit verification code from <strong>support@kamaikaro.in</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  6-Digit Verification Code
                </label>
                <div className="flex justify-between gap-1.5">
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
                      className="h-12 w-12 rounded-xl bg-[#F4F6F5] text-center text-lg font-black text-ink outline-none ring-1 ring-black/10 focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                    />
                  ))}
                </div>

                {/* Resend Action */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="font-medium hover:underline text-ink-soft"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || resending}
                    className="font-bold text-[#169443] hover:underline disabled:opacity-40 disabled:no-underline flex items-center gap-1"
                  >
                    {resending ? (
                      <LoaderCircle className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    <span>
                      {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                    </span>
                  </button>
                </div>

                {demoOtp && (
                  <div className="mt-2 rounded-xl bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200 flex items-center justify-between">
                    <span>Demo OTP: <strong>{demoOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = demoOtp.slice(0, 6).split("");
                        setOtpDigits(chars);
                      }}
                      className="text-[10px] font-bold text-amber-800 underline"
                    >
                      Fill Demo
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-2.5 pl-10 pr-10 text-sm text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
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
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-2.5 pl-10 pr-10 text-sm text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft hover:text-ink"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Reset Password</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
