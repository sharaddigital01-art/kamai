"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ShieldCheck } from "lucide-react";
import { MIN_WITHDRAWAL_PAISE } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { WithdrawModal } from "./WithdrawModal";

interface WithdrawButtonProps {
  availablePaise: number;
  hasPayout: boolean;
  inProgress: boolean;
  userEmail?: string;
  userName?: string;
  defaultUpiId?: string;
}

export function WithdrawButton({
  availablePaise,
  hasPayout,
  inProgress,
  userEmail = "",
  userName,
  defaultUpiId,
}: WithdrawButtonProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const blocked = inProgress
    ? "A withdrawal is already being processed."
    : availablePaise < MIN_WITHDRAWAL_PAISE
      ? `Minimum withdrawal is ${formatINR(MIN_WITHDRAWAL_PAISE)}.`
      : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={blocked !== null}
        className="inline-flex items-center gap-2 rounded-full bg-saffron-500 px-6 py-3 text-sm font-bold text-ink transition hover:bg-saffron-400 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm active:scale-95"
      >
        <ShieldCheck className="h-4 w-4 text-ink" />
        <span>Withdraw with Email OTP ({formatINR(availablePaise)})</span>
      </button>

      {blocked && (
        <p role="status" className="mt-2 text-xs text-ink-soft">
          {blocked}
        </p>
      )}

      <WithdrawModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        availablePaise={availablePaise}
        userEmail={userEmail}
        userName={userName}
        defaultUpiId={defaultUpiId}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
