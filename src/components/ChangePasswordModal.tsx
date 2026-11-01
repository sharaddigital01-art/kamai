"use client";

import { useState } from "react";
import {
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  userEmail,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccessMsg(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please verify.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password cannot be the same as your current password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to update password. Please check your current password.");
        return;
      }

      setSuccessMsg("Password changed successfully!");
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
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
                  <h3 id="change-password-title" className="font-display font-bold text-base text-white">
                    Change Password
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    Account: {userEmail || "Your Account"}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-ink uppercase tracking-wide">
                    Current Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-[#169443] hover:underline"
                  >
                    Forgot current password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-2.5 pl-10 pr-10 text-sm text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft hover:text-ink"
                    aria-label="Toggle current password visibility"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl bg-[#F4F6F5] py-2.5 pl-10 pr-10 text-sm text-ink outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft hover:text-ink"
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Flow Modal fallback */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={userEmail}
        onSuccess={() => {
          setForgotModalOpen(false);
          handleClose();
        }}
      />
    </>
  );
}
