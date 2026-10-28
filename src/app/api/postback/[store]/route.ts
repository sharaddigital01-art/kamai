import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyConversion } from "@/lib/ledger";
import { STORE_RULES } from "@/lib/linkConverter";
import { rupeesToPaise } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Conversion postback. Body is JSON, signed with HMAC-SHA256(secret, rawBody) in `x-signature` (hex).
 * Networks that can't sign requests usually allow a fixed secret: put an adapter in front that signs
 * and forwards. Amounts are in rupees (decimals allowed) and converted to paise here.
 */
const Payload = z.object({
  order_id: z.string().min(1).max(100),
  item_id: z.string().max(100).optional(),
  sub_id: z.string().min(1).max(64),
  status: z.enum(["pending", "approved", "rejected"]),
  order_amount: z.coerce.number().min(0).max(100_000_000).default(0),
  commission: z.coerce.number().min(0).max(100_000_000).default(0),
});

function validSignature(secret: string, raw: string, header: string | null): boolean {
  if (!header) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const given = Buffer.from(header.trim().toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function POST(req: Request, { params }: { params: Promise<{ store: string }> }) {
  const { store } = await params;
  if (!(store in STORE_RULES)) return NextResponse.json({ error: "unknown_store" }, { status: 404 });

  const secret = process.env[`POSTBACK_SECRET_${store.toUpperCase()}`];
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const raw = await req.text();
  if (raw.length > 20_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (!validSignature(secret, raw, req.headers.get("x-signature"))) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  let payload: z.infer<typeof Payload>;
  try {
    payload = Payload.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  // Exact replays are acknowledged without reprocessing; unprocessed ones (earlier crash) are retried.
  const payloadHash = createHash("sha256").update(`${store}:${raw}`).digest("hex");
  const event = await prisma.webhookEvent.upsert({
    where: { payloadHash },
    create: { storeSlug: store, payloadHash, payload: payload as object },
    update: {},
  });
  if (event.processedAt) return NextResponse.json({ ok: true, duplicate: true });

  try {
    const result = await applyConversion({
      storeSlug: store,
      orderId: payload.order_id,
      itemId: payload.item_id,
      subId: payload.sub_id,
      status: payload.status,
      orderAmountPaise: rupeesToPaise(payload.order_amount),
      commissionPaise: rupeesToPaise(payload.commission),
    });
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: result.result === "ignored" ? result.reason : null } });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { error: String(e).slice(0, 500) } }).catch(() => undefined);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 }); // network will retry
  }
}
