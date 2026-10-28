"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_WITHDRAWAL_PAISE } from "@/lib/constants";
import { formatINR } from "@/lib/money";

export function WithdrawButton({ availablePaise, hasPayout, inProgress }: { availablePaise: number; hasPayout: boolean; inProgress: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const blocked = inProgress
    ? "A withdrawal is already being processed."
    : !hasPayout
      ? "Add your UPI ID below to withdraw."
      : availablePaise < MIN_WITHDRAWAL_PAISE
        ? `Minimum withdrawal is ${formatINR(MIN_WITHDRAWAL_PAISE)}.`
        : null;

  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/withdrawals", { method: "POST" });
      const json = await res.json();
      if (!res.ok) setMsg({ ok: false, text: json.error?.message ?? "Couldn't start the withdrawal." });
      else {
        setMsg({ ok: true, text: `Withdrawal of ${formatINR(json.withdrawal.amountPaise)} requested.` });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Network problem. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={busy || blocked !== null}
        className="inline-flex items-center gap-2 rounded-full bg-saffron-500 px-6 py-3 text-sm font-bold text-ink transition hover:bg-saffron-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        Withdraw {formatINR(availablePaise)}
      </button>
      {(blocked || msg) && (
        <p role="status" className={`mt-2 text-sm ${msg ? (msg.ok ? "text-leaf-700" : "text-saffron-700") : "text-ink-soft"}`}>
          {msg?.text ?? blocked}
        </p>
      )}
    </div>
  );
}
