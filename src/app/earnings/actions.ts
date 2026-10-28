"use server";

import { revalidatePath } from "next/cache";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, MOCK_PAYOUT } from "@/lib/mockData";

export interface PayoutState {
  ok?: boolean;
  error?: string;
}

const UPI_RE = /^[a-z0-9._-]{2,64}@[a-z][a-z0-9]{1,31}$/;

export async function savePayoutAccount(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const user = await getApiUser();
  if (!user) return { error: "Please log in again." };

  const upiId = String(formData.get("upiId") ?? "").trim().toLowerCase();
  if (!UPI_RE.test(upiId)) return { error: "Enter a valid UPI ID, like name@bank." };
  const accountHolder = String(formData.get("accountHolder") ?? "").trim().slice(0, 80) || null;

  if (!isDatabaseConfigured()) {
    MOCK_PAYOUT.upiId = upiId;
    MOCK_PAYOUT.accountHolder = accountHolder;
    revalidatePath("/earnings");
    return { ok: true };
  }

  try {
    // In-flight withdrawals keep the destination they were requested with (payoutSnapshot).
    await prisma.payoutAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, method: "UPI", upiId, accountHolder },
      update: { method: "UPI", upiId, accountHolder },
    });
  } catch (err) {
    console.warn("Database error in savePayoutAccount, saving to mock payout:", err);
    MOCK_PAYOUT.upiId = upiId;
    MOCK_PAYOUT.accountHolder = accountHolder;
  }
  revalidatePath("/earnings");
  return { ok: true };
}
