"use client";

import { useState } from "react";
import { CheckCircle2, X, CreditCard, Sparkles, LoaderCircle } from "lucide-react";
import { formatINR } from "@/lib/money";

interface MarkPaidModalProps {
  withdrawal: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, utr: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function MarkPaidModal({
  withdrawal,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: MarkPaidModalProps) {
  const [utr, setUtr] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !withdrawal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim()) {
      setError("Please provide a valid UTR or Bank Transaction Reference number.");
      return;
    }
    setError(null);
    await onConfirm(withdrawal.id, utr.trim());
  };

  const handleGenerateMockUtr = () => {
    const randomUtr = `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    setUtr(randomUtr);
    setError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#134024] to-[#169443] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-200" />
            </span>
            <div>
              <h3 className="font-display font-black text-lg text-white">
                Mark Payout as Paid
              </h3>
              <p className="text-xs text-emerald-100">
                Record UPI settlement & notify partner
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
          {/* Summary Card */}
          <div className="rounded-2xl bg-canvas p-4 border border-black/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">Partner:</span>
              <span className="font-bold text-ink">
                {withdrawal.userName || withdrawal.userEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">UPI ID:</span>
              <span className="font-mono font-bold text-ink bg-white px-2 py-0.5 rounded-lg border border-black/5">
                {withdrawal.upiId || "No UPI set"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-black/5">
              <span className="text-ink-soft font-semibold">Amount to Pay:</span>
              <span className="font-display font-black text-base text-[#169443]">
                {formatINR(withdrawal.amountPaise || 0)}
              </span>
            </div>
          </div>

          {/* UTR Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="utr-input" className="font-bold text-ink">
                Bank UTR / Transaction ID <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateMockUtr}
                className="text-[11px] font-semibold text-[#169443] hover:underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Fill Sample UTR
              </button>
            </div>
            <input
              id="utr-input"
              type="text"
              value={utr}
              onChange={(e) => {
                setUtr(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 412389104821 or UPI/412803..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30 focus:border-[#169443] font-mono transition"
              autoFocus
            />
            {error && <p className="text-red-600 font-semibold">{error}</p>}
            <p className="text-[11px] text-ink-muted">
              Entering the UTR confirms the funds have reached the partner's UPI account.
            </p>
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#169443] hover:bg-[#134024] transition disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm as Paid
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
