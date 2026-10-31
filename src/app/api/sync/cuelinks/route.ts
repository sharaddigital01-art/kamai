import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/auth";
import {
  isDatabaseConfigured,
  DEMO_USER,
  upsertMockConversion,
} from "@/lib/mockData";
import {
  resolveUserBySubId,
  slugifyStore,
  normalizeStatus,
  RawCuelinksTransaction,
} from "@/lib/cuelinksSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleSync(req: Request) {
  const reqUrl = new URL(req.url);
  const channelId =
    reqUrl.searchParams.get("channel_id") ||
    reqUrl.searchParams.get("channelId") ||
    process.env.CUELINKS_CHANNEL_ID ||
    "332862";
  const apiKey =
    process.env.CUELINKS_API_KEY ||
    "8ir_BIfBqgKif2bcVsjbPeihyADLwkEoYTvwYqUB174";

  // Optional query params for date filtering
  const startDate =
    reqUrl.searchParams.get("start_date") ||
    reqUrl.searchParams.get("startDate");
  const endDate =
    reqUrl.searchParams.get("end_date") || reqUrl.searchParams.get("endDate");
  const filterUserId = reqUrl.searchParams.get("userId");

  const cuelinksUrl = new URL(
    "https://www.cuelinks.com/api/v2/transactions.json"
  );
  cuelinksUrl.searchParams.set("channel_id", channelId);
  if (startDate) cuelinksUrl.searchParams.set("start_date", startDate);
  if (endDate) cuelinksUrl.searchParams.set("end_date", endDate);

  let rawTransactions: RawCuelinksTransaction[] = [];

  try {
    const res = await fetch(cuelinksUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Token token=${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) rawTransactions = json;
      else if (Array.isArray(json.transactions)) rawTransactions = json.transactions;
      else if (Array.isArray(json.data)) rawTransactions = json.data;
    } else {
      const errText = await res.text().catch(() => "");
      console.warn(
        `Cuelinks API returned status ${res.status} for channel ${channelId}:`,
        errText
      );
    }
  } catch (err: any) {
    console.warn("Cuelinks transactions fetch error:", err?.message || err);
  }

  // Get current logged-in user if available to associate subids when matching
  const authUser = await getApiUser().catch(() => null);

  let synced = 0;
  let updated = 0;
  let skipped = 0;
  const results: any[] = [];
  const now = new Date();

  for (const tx of rawTransactions) {
    const rawTxId =
      tx.transaction_id ??
      tx.id ??
      tx.txid ??
      tx.tx_id ??
      tx.order_id ??
      tx.reference_id;

    if (!rawTxId) {
      skipped++;
      continue;
    }

    const txId = String(rawTxId).trim();
    const subId = String(
      tx.subid ||
        tx.sub_id ||
        tx.sub_id1 ||
        tx.subid1 ||
        tx.affsub ||
        tx.s1 ||
        tx.custom_id ||
        ""
    ).trim();

    const storeName = String(
      tx.merchant_name ||
        tx.campaign_name ||
        tx.store_name ||
        tx.advertiser_name ||
        tx.store ||
        "Partner Store"
    ).trim();

    const saleAmount = Number(
      tx.sale_amount ??
        tx.order_amount ??
        tx.amount ??
        tx.order_value ??
        0
    );

    const commission = Number(
      tx.commission ??
        tx.payout ??
        tx.affiliate_commission ??
        tx.pub_commission ??
        0
    );

    const status = normalizeStatus(
      tx.status ?? tx.validation_status ?? tx.state
    );

    // Resolve user by subId (e.g. dgu4Ci_tg -> user)
    let resolvedUserId: string | null = null;
    if (subId) {
      resolvedUserId = await resolveUserBySubId(subId);
    }

    if (!resolvedUserId && filterUserId) {
      resolvedUserId = filterUserId;
    }

    if (!resolvedUserId && authUser) {
      resolvedUserId = authUser.id;
    }

    const effectiveUserId = resolvedUserId || DEMO_USER.id;
    const userCommissionPercent = Number(
      process.env.USER_COMMISSION_PERCENT || 70
    );
    const userRatio = Math.max(0, Math.min(100, userCommissionPercent)) / 100;
    const totalCommissionPaise = Math.round(commission * 100);
    const userEarningsPaise = Math.round(totalCommissionPaise * userRatio);
    const orderAmountPaise = Math.round(saleAmount * 100);

    // 1. Database upsert if configured
    if (isDatabaseConfigured()) {
      try {
        await prisma.conversion.upsert({
          where: { transactionId: txId },
          create: {
            transactionId: txId,
            storeName,
            saleAmount,
            commission,
            status, // 'PAID' | 'PENDING' | 'CANCELLED'
            subid: subId || null,
            userId: effectiveUserId,
          },
          update: {
            storeName,
            saleAmount,
            commission,
            status,
            subid: subId || null,
            userId: effectiveUserId,
            updatedAt: now,
          },
        });

        // Upsert into PartnerStore & EarningsLedger
        const storeSlug = slugifyStore(storeName);
        let storeRecord = await prisma.partnerStore.findUnique({
          where: { slug: storeSlug },
        });

        if (!storeRecord) {
          storeRecord = await prisma.partnerStore.create({
            data: {
              slug: storeSlug,
              name: storeName,
              commissionRateBps: 400,
              userShareBps: userCommissionPercent * 100,
            },
          });
        }

        const ledgerStatus: "PENDING" | "CONFIRMED" | "REJECTED" =
          status === "PAID"
            ? "CONFIRMED"
            : status === "PENDING"
            ? "PENDING"
            : "REJECTED";

        if (effectiveUserId) {
          await prisma.earningsLedger.upsert({
            where: {
              storeId_externalOrderId_externalItemId: {
                storeId: storeRecord.id,
                externalOrderId: txId,
                externalItemId: "",
              },
            },
            create: {
              userId: effectiveUserId,
              storeId: storeRecord.id,
              kind: "COMMISSION",
              status: ledgerStatus,
              externalOrderId: txId,
              externalItemId: "",
              orderAmountPaise,
              commissionPaise: totalCommissionPaise,
              userAmountPaise: userEarningsPaise,
              pendingAt: now,
              confirmedAt: ledgerStatus === "CONFIRMED" ? now : null,
              rejectedAt: ledgerStatus === "REJECTED" ? now : null,
            },
            update: {
              status: ledgerStatus,
              orderAmountPaise,
              commissionPaise: totalCommissionPaise,
              userAmountPaise: userEarningsPaise,
              confirmedAt: ledgerStatus === "CONFIRMED" ? now : undefined,
              rejectedAt: ledgerStatus === "REJECTED" ? now : undefined,
            },
          });

          if (status === "PAID") {
            await (prisma as any)
              .$executeRawUnsafe(
                `UPDATE "User" SET "confirmed_balance" = COALESCE("confirmed_balance", 0) + $1 WHERE "id" = $2::uuid`,
                commission,
                effectiveUserId
              )
              .catch(() => {});
          } else if (status === "PENDING") {
            await (prisma as any)
              .$executeRawUnsafe(
                `UPDATE "User" SET "pending_balance" = COALESCE("pending_balance", 0) + $1 WHERE "id" = $2::uuid`,
                commission,
                effectiveUserId
              )
              .catch(() => {});
          }
        }
      } catch (dbErr) {
        console.warn("Database upsert error in /api/sync/cuelinks:", dbErr);
      }
    }

    // 2. Mock fallback upsert
    upsertMockConversion({
      transactionId: txId,
      storeName,
      saleAmount,
      commission,
      status,
      subid: subId || null,
      userId: effectiveUserId,
    });

    synced++;
    updated++;
    results.push({
      transactionId: txId,
      storeName,
      saleAmount,
      commission,
      status,
      subid: subId || null,
      userId: effectiveUserId,
    });
  }

  const response = NextResponse.json({
    success: true,
    channelId,
    totalFetched: rawTransactions.length,
    synced,
    updated,
    skipped,
    transactions: results,
  });

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}
