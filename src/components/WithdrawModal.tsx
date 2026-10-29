"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Wallet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/money";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePaise: number;
  userEmail: string;
  userName?: string;
  defaultUpiId?: string;
  onSuccess?: () => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  availablePaise,
  userEmail,
  userName = "EarnKaro Partner",
  defaultUpiId = "",
  onSuccess,
}: WithdrawModalProps) {
  // Step 1 = Amount & UPI, Step 2 = OTP Verification, Step 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [amountRupees, setAmountRupees] = useState<string>("100");
  const [upiId, setUpiId] = useState<string>(defaultUpiId || "");
  const [accountHolder, setAccountHolder] = useState<string>(userName);

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState<number>(60);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmedAmountPaise, setConfirmedAmountPaise] = useState<number>(0);
  const [confirmedUpi, setConfirmedUpi] = useState<string>("");

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setOtpDigits(["", "", "", "", "", ""]);
      setDemoOtp(null);
      if (defaultUpiId) setUpiId(defaultUpiId);
      // Default amount to min 100 or available if smaller
      const defaultAmt = Math.min(Math.max(100, Math.floor(availablePaise / 100)), 500);
      setAmountRupees(defaultAmt > 0 ? String(defaultAmt) : "100");
    }
  }, [isOpen, availablePaise, defaultUpiId]);

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

  // Focus first OTP box on entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  if (!isOpen) return null;

  const availableRupees = Math.floor(availablePaise / 100);
  const parsedAmount = parseInt(amountRupees, 10) || 0;
  const parsedAmountPaise = parsedAmount * 100;

  // Step 1: Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (parsedAmount < 100) {
      setError("Minimum withdrawal amount is ₹100.");
      return;
    }
    if (parsedAmountPaise > availablePaise) {
      setError(`Amount exceeds your available balance (${formatINR(availablePaise)}).`);
      return;
    }
    if (!upiId.trim() || !upiId.includes("@")) {
      setError("Please enter a valid UPI ID (e.g. mobile@upi, name@oksbi).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/withdraw/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amountPaise: parsedAmountPaise,
          upiId: upiId.trim(),
          accountHolder: accountHolder.trim() || userName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send withdrawal OTP. Please try again.");
        setLoading(false);
        return;
      }

      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      setConfirmedAmountPaise(parsedAmountPaise);
      setConfirmedUpi(upiId.trim());
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
      const res = await fetch("/api/withdraw/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amountPaise: confirmedAmountPaise || parsedAmountPaise,
          upiId: confirmedUpi || upiId.trim(),
          accountHolder: accountHolder.trim() || userName,
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

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

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

  function fillDemoOtp() {
    if (!demoOtp || demoOtp.length !== 6) return;
    setOtpDigits(demoOtp.split(""));
    otpInputRefs.current[5]?.focus();
  }

  // Step 2: Confirm OTP & finalize withdrawal
  async function handleConfirmWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter all 6 digits of the OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/withdraw/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          otp: fullOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid verification code.");
        setLoading(false);
        return;
      }

      setStep(3);
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch {
      setError("Network error while confirming withdrawal.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 bg-[#F9FAF9] px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#169443]">
              <Wallet className="h-4 w-4" />
            </span>
            <h2 className="font-display text-base font-extrabold text-ink">
              {step === 1 && "Withdraw to UPI"}
              {step === 2 && "Confirm with OTP"}
              {step === 3 && "Withdrawal Requested"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-soft hover:bg-black/5 hover:text-ink transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-700 ring-1 ring-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STAGE 1: Amount & UPI Form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Balance Indicator */}
              <div className="flex items-center justify-between rounded-2xl bg-[#134024] p-3.5 text-white shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                    Available Balance
                  </span>
                  <p className="font-display text-xl font-black text-white">
                    {formatINR(availablePaise)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/30">
                  Min: ₹100
                </span>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-ink mb-1.5">
                  Withdrawal Amount (₹)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-soft">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={100}
                    max={availableRupees > 0 ? availableRupees : 100}
                    step={1}
                    required
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-8 pr-4 text-base font-bold text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition font-mono"
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[100, 500, 1000].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={chip * 100 > availablePaise}
                      onClick={() => setAmountRupees(String(chip))}
                      className="rounded-lg bg-black/5 px-2.5 py-1 text-xs font-bold text-ink hover:bg-emerald-50 hover:text-[#169443] disabled:opacity-40 transition"
                    >
                      ₹{chip}
                    </button>
                  ))}
                  {availableRupees >= 100 && (
                    <button
                      type="button"
                      onClick={() => setAmountRupees(String(availableRupees))}
                      className="rounded-lg bg-emerald-100/70 px-2.5 py-1 text-xs font-black text-[#134024] hover:bg-emerald-200 transition"
                    >
                      Max (₹{availableRupees})
                    </button>
                  )}
                </div>
              </div>

              {/* UPI ID Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-ink mb-1.5">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mobile@upi or name@oksbi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-2xl bg-[#F4F6F5] py-3 px-3.5 text-sm font-medium text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                />
                <p className="mt-1 text-[11px] text-ink-soft">
                  Money is sent directly to Google Pay, PhonePe, Paytm, or BHIM.
                </p>
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-ink mb-1.5">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full rounded-2xl bg-[#F4F6F5] py-2.5 px-3.5 text-sm text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || availablePaise < 10000}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Request Withdrawal OTP</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STAGE 2: OTP Verification Form */}
          {step === 2 && (
            <form onSubmit={handleConfirmWithdrawal} className="space-y-4">
              {/* Intent Summary */}
              <div className="rounded-2xl bg-emerald-50/70 p-3.5 text-xs text-emerald-950 ring-1 ring-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-700">Authorizing Payout</span>
                    <p className="font-display text-lg font-black text-ink">
                      {formatINR(confirmedAmountPaise)}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-0.5">UPI: {confirmedUpi}</p>
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

              <p className="text-center text-xs text-ink-soft">
                Enter the 6-digit OTP sent to <strong className="text-ink">{userEmail}</strong> to confirm your withdrawal.
              </p>

              {/* Demo OTP Helper Badge */}
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
              <div className="flex justify-between gap-1.5 sm:gap-2 pt-1">
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

              {/* Countdown & Resend */}
              <div className="flex items-center justify-between pt-1 text-xs text-ink-soft">
                {countdown > 0 ? (
                  <span>
                    Resend code in <strong className="text-ink font-mono">00:{countdown.toString().padStart(2, "0")}</strong>
                  </span>
                ) : (
                  <span>Didn&apos;t get the code?</span>
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

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={loading || otpDigits.join("").length !== 6}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Authorizing Withdrawal...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Confirm & Withdraw {formatINR(confirmedAmountPaise)}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STAGE 3: Success Confirmation */}
          {step === 3 && (
            <div className="py-4 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-[#169443] ring-8 ring-emerald-50">
                <CheckCircle2 className="h-9 w-9 text-[#169443]" />
              </div>

              <div>
                <h3 className="font-display text-xl font-black text-ink">
                  Withdrawal Requested!
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Your payout of <strong className="text-ink font-bold">{formatINR(confirmedAmountPaise)}</strong> has been submitted.
                </p>
              </div>

              <div className="rounded-2xl bg-[#F4F6F5] p-3.5 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Destination:</span>
                  <span className="font-mono font-bold text-ink">{confirmedUpi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Status:</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    REQUESTED (Processing)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Expected:</span>
                  <span className="text-ink font-medium">Within 24-48 hours</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full bg-[#169443] py-3 text-sm font-bold text-white hover:bg-[#13803a] transition shadow-md"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
