"use client";

import { useActionState } from "react";
import { savePayoutAccount, type PayoutState } from "@/app/earnings/actions";

export function PayoutForm({ upiId, accountHolder }: { upiId: string | null; accountHolder: string | null }) {
  const [state, action, pending] = useActionState<PayoutState, FormData>(savePayoutAccount, {});

  return (
    <form action={action} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <h3 className="font-display text-lg font-bold">Payout account</h3>
      <div>
        <label htmlFor="upiId" className="mb-1 block text-xs font-semibold text-ink-soft">
          UPI ID
        </label>
        <input
          id="upiId"
          name="upiId"
          defaultValue={upiId ?? ""}
          placeholder="name@bank"
          autoComplete="off"
          required
          className="w-full rounded-xl bg-canvas px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ink/30"
        />
      </div>
      <div>
        <label htmlFor="accountHolder" className="mb-1 block text-xs font-semibold text-ink-soft">
          Name on account (optional)
        </label>
        <input
          id="accountHolder"
          name="accountHolder"
          defaultValue={accountHolder ?? ""}
          autoComplete="name"
          className="w-full rounded-xl bg-canvas px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ink/30"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-soft disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-saffron-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-leaf-700">
          Saved.
        </p>
      )}
    </form>
  );
}
