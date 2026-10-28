import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { LedgerError, requestWithdrawal } from "@/lib/ledger";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const STATUS: Record<LedgerError["code"], number> = {
  NO_PAYOUT_ACCOUNT: 409,
  WITHDRAWAL_IN_PROGRESS: 409,
  BELOW_MINIMUM: 422,
  NOT_FOUND: 404,
  BAD_TRANSITION: 409,
};

export async function POST() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Log in first." } }, { status: 401 });
  if (!rateLimit(`wd:${user.id}`, 5, 60_000).ok) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Slow down." } }, { status: 429 });

  try {
    const w = await requestWithdrawal(user.id);
    return NextResponse.json({ withdrawal: { id: w.id, amountPaise: w.amountPaise, status: w.status } }, { status: 201 });
  } catch (e) {
    if (e instanceof LedgerError) return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: STATUS[e.code] });
    throw e;
  }
}
