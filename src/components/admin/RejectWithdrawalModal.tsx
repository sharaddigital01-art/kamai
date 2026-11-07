"use client";

import { useState } from "react";
import { AlertTriangle, X, RotateCcw, LoaderCircle } from "lucide-react";
import { formatINR } from "@/lib/money";

interface RejectWithdrawalModalProps {
  withdrawal: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function RejectWithdrawalModal({
  withdrawal,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: RejectWithdrawalModalProps) {
  const [reason, setReason] = useState("Invalid UPI ID or failed VPA verification");

  if (!isOpen || !withdrawal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(withdrawal.id, reason.trim() || "Rejected by administrator");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <AlertTriangle className="h-5 w-5 text-red-100" />
            </span>
            <div>
              <h3 className="font-display font-black text-lg text-white">
                Reject Withdrawal Request
              </h3>
              <p className="text-xs text-rose-100">
                Refunds balance back to partner wallet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Notice Banner */}
          <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <RotateCcw className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Automatic Balance Restoration:</strong> All {formatINR(withdrawal.amountPaise || 0)} associated with this payout will be unlocked and returned to the partner's available balance instantly.
            </p>
          </div>

          {/* Details */}
          <div className="rounded-2xl bg-canvas p-3.5 border border-black/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">Partner:</span>
              <span className="font-bold text-ink">
                {withdrawal.userName || withdrawal.userEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">UPI ID:</span>
              <span className="font-mono font-bold text-ink">
                {withdrawal.upiId || "No UPI"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">Requested Amount:</span>
              <span className="font-display font-black text-sm text-red-600">
                {formatINR(withdrawal.amountPaise || 0)}
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label htmlFor="rejection-reason" className="font-bold text-ink">
              Reason for Rejection
            </label>
            <input
              id="rejection-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Invalid UPI ID / Incorrect VPA / Name mismatch"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Invalid UPI ID",
                "UPI Account Inactive",
                "Name Mismatch",
                "Suspicious Activity",
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="rounded-lg bg-canvas hover:bg-neutral-200 px-2 py-0.5 text-[10px] text-ink-soft transition border border-black/5"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-canvas transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reject & Refund Balance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
