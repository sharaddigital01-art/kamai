import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { advanceWithdrawal, LedgerError } from "@/lib/ledger";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("process") }),
  z.object({ action: z.literal("paid"), utr: z.string().min(6).max(40) }),
  z.object({ action: z.literal("failed"), reason: z.string().min(3).max(200) }),
]);

/** Payout operator endpoint: REQUESTED → PROCESSING → PAID | FAILED. ADMIN role only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const w = await advanceWithdrawal(id, body);
    return NextResponse.json({ withdrawal: { id: w.id, status: w.status } });
  } catch (e) {
    if (e instanceof LedgerError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    throw e;
  }
}
