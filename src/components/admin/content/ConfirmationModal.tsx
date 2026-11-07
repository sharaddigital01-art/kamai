"use client";

import { AlertTriangle, X, LoaderCircle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isSubmitting?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isSubmitting = false,
  onConfirm,
  onClose,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
        {/* Header */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            isDestructive
              ? "bg-gradient-to-r from-red-600 to-rose-700"
              : "bg-gradient-to-r from-[#134024] to-[#169443]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <AlertTriangle className="h-5 w-5 text-white" />
            </span>
            <div>
              <h3 className="font-display font-black text-lg text-white">
                {title}
              </h3>
              <p className="text-xs text-white/80">Confirmation Required</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/20 transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-sm text-ink-soft leading-relaxed">{message}</p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-canvas transition"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-xs disabled:opacity-50 ${
                isDestructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#169443] hover:bg-[#134024]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
