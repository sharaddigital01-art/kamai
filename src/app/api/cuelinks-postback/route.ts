import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, DEMO_USER, recordCuelinksPostback } from "@/lib/mockData";

export const runtime = "nodejs";

const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Extracts and normalizes parameters from Cuelinks Global Postback.
 * Cuelinks macros support subid, txid, amount, commission, status, store_name.
 */
function extractPostbackParams(raw: Record<string, any>) {
  const map: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined && v !== null) {
      map[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = String(v).trim();
    }
  }

  // 1. subid mapping
  const subId =
    map["subid"] ||
    map["subid1"] ||
    map["subid2"] ||
    map["clickid"] ||
    map["affsub"] ||
    map["s1"] ||
    map["ref"] ||
    "";

  // 2. transaction id
  const txId =
    map["txid"] ||
    map["transactionid"] ||
    map["orderid"] ||
    map["referenceid"] ||
    map["id"] ||
    map["transid"] ||
    `tx-${Date.now()}`;

  // 3. order amount (in Rupees)
  const orderAmount = Number(
    map["amount"] ||
    map["orderamount"] ||
    map["saleamount"] ||
    map["ordervalue"] ||
    map["cartvalue"] ||
    map["total"] ||
    0
  );

  // 4. commission / payout (in Rupees)
  const totalCommission = Number(
    map["commission"] ||
    map["payout"] ||
    map["affiliatecommission"] ||
    map["commissionamount"] ||
    map["pubcommission"] ||
    map["earning"] ||
    0
  );

  // 5. status mapping
  const rawStatus = (map["status"] || map["validationstatus"] || map["state"] || "confirmed").toLowerCase();
  let status: "PENDING" | "CONFIRMED" | "REJECTED" = "CONFIRMED";
  if (
    rawStatus.includes("pending") ||
    rawStatus.includes("open") ||
    rawStatus === "0"
  ) {
    status = "PENDING";
  } else if (
    rawStatus.includes("reject") ||
    rawStatus.includes("cancel") ||
    rawStatus.includes("decline") ||
    rawStatus === "2" ||
    rawStatus === "failed"
  ) {
    status = "REJECTED";
  }

  // 6. store name / campaign
  const storeName =
    map["storename"] ||
    map["store"] ||
    map["merchant"] ||
    map["campaignname"] ||
    map["advertisername"] ||
    map["campaign"] ||
    "Flipkart";

  return { subId, txId, orderAmount, totalCommission, status, storeName, raw };
}

/**
 * Resolves the target userId from the subid passed by Cuelinks
 */
async function resolveUserId(subId: string): Promise<string> {
  if (!subId) return DEMO_USER.id;

  if (isDatabaseConfigured()) {
    try {
      // 1. Check if subId directly matches a GeneratedLink
      const link = await prisma.generatedLink.findFirst({
        where: { OR: [{ subId }, { code: subId }] },
        select: { userId: true },
      });
      if (link?.userId) return link.userId;

      // 2. Check if subId is formatted as `${userId}_${code}`
      if (subId.includes("_")) {
        const potentialId = subId.split("_")[0];
        if (potentialId) {
          // Full UUID format
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialId)) {
            const user = await prisma.user.findUnique({ where: { id: potentialId }, select: { id: true } });
            if (user) return user.id;
          }
          // 32-char compact hex UUID format
          if (/^[0-9a-f]{32}$/i.test(potentialId)) {
            const formatted = `${potentialId.slice(0, 8)}-${potentialId.slice(8, 12)}-${potentialId.slice(12, 16)}-${potentialId.slice(16, 20)}-${potentialId.slice(20)}`;
            const user = await prisma.user.findUnique({ where: { id: formatted }, select: { id: true } });
            if (user) return user.id;
          }
        }
      }

      // 3. Check if subId is directly a user UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subId)) {
        const user = await prisma.user.findUnique({ where: { id: subId }, select: { id: true } });
        if (user) return user.id;
      }

      // 4. Check if subId matches a subIdPrefix or referralCode
      const userByPrefix = await prisma.user.findFirst({
        where: {
          OR: [
            { subIdPrefix: { not: "", equals: subId.slice(0, 6) } },
            { referralCode: { not: "", equals: subId } },
          ],
        },
        select: { id: true },
      });
      if (userByPrefix) return userByPrefix.id;
    } catch (err) {
      console.warn("Database lookup error in resolveUserId:", err);
    }
  }

  return DEMO_USER.id;
}

function slugifyStore(name: string): string {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (lower.includes("flipkart")) return "flipkart";
  if (lower.includes("amazon")) return "amazon";
  if (lower.includes("myntra")) return "myntra";
  if (lower.includes("ajio")) return "ajio";
  if (lower.includes("shopsy")) return "shopsy";
  if (lower.includes("nykaa")) return "nykaa";
  if (lower.includes("tatacliq")) return "tatacliq";
  if (lower.includes("croma")) return "croma";
  if (lower.includes("jiomart")) return "jiomart";
  return lower.slice(0, 20) || "general";
}

async function handlePostback(rawParams: Record<string, any>) {
  const params = extractPostbackParams(rawParams);
  const { subId, txId, orderAmount, totalCommission, status, storeName, raw } = params;

  // Configurable commission split (Default: 70% to User, 30% to Platform Admin)
  const userCommissionPercent = Number(process.env.USER_COMMISSION_PERCENT || 70);
  const userRatio = Math.max(0, Math.min(100, userCommissionPercent)) / 100; // 0.70
  const adminRatio = (100 - userCommissionPercent) / 100; // 0.30

  // Amounts in paise
  const totalCommissionPaise = Math.round(totalCommission * 100);
  const orderAmountPaise = Math.round(orderAmount * 100);

  // 1. Calculate userEarnings = totalCommission * 0.70
  const userEarningsPaise = Math.round(totalCommissionPaise * userRatio);
  // 2. Calculate adminProfit = totalCommission * 0.30
  const adminProfitPaise = totalCommissionPaise - userEarningsPaise;

  const targetUserId = await resolveUserId(subId);
  const storeSlug = slugifyStore(storeName);
  const now = new Date();

  // If database is configured, persist in Supabase
  if (isDatabaseConfigured()) {
    try {
      // Ensure target user and admin user exist in User table
      await prisma.user.upsert({
        where: { id: targetUserId },
        update: {},
        create: {
          id: targetUserId,
          email: "partner@earnkaro.local",
          name: "EarnKaro Partner",
          referralCode: "EK" + txId.slice(-6).toUpperCase(),
          subIdPrefix: "ek",
        },
      });

      await prisma.user.upsert({
        where: { id: ADMIN_USER_ID },
        update: {},
        create: {
          id: ADMIN_USER_ID,
          email: "admin@earnkaro.local",
          name: "EarnKaro Platform Admin",
          role: "ADMIN",
          referralCode: "EKADMIN",
          subIdPrefix: "ekadm",
        },
      });

      // Find or create PartnerStore
      let storeRecord = await prisma.partnerStore.findUnique({ where: { slug: storeSlug } });
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

      // Find associated link if any
      const linkRecord = await prisma.generatedLink.findFirst({
        where: { OR: [{ subId }, { code: subId }] },
      });

      // 3. Credit ONLY userEarnings to user's EarningsLedger
      const userLedger = await prisma.earningsLedger.upsert({
        where: {
          storeId_externalOrderId_externalItemId: {
            storeId: storeRecord.id,
            externalOrderId: txId,
            externalItemId: "",
          },
        },
        create: {
          userId: targetUserId,
          storeId: storeRecord.id,
          linkId: linkRecord?.id ?? null,
          kind: "COMMISSION",
          status,
          externalOrderId: txId,
          externalItemId: "",
          orderAmountPaise,
          commissionPaise: totalCommissionPaise,
          userAmountPaise: userEarningsPaise, // strictly user's 70% share
          pendingAt: now,
          confirmedAt: status === "CONFIRMED" ? now : null,
          rejectedAt: status === "REJECTED" ? now : null,
        },
        update: {
          status,
          orderAmountPaise,
          commissionPaise: totalCommissionPaise,
          userAmountPaise: userEarningsPaise, // strictly user's 70% share
          confirmedAt: status === "CONFIRMED" ? now : undefined,
          rejectedAt: status === "REJECTED" ? now : undefined,
        },
      });

      // 4. Store adminProfit in a separate platform revenue record
      await prisma.earningsLedger.upsert({
        where: {
          storeId_externalOrderId_externalItemId: {
            storeId: storeRecord.id,
            externalOrderId: `${txId}-admin-profit`,
            externalItemId: "platform-cut",
          },
        },
        create: {
          userId: ADMIN_USER_ID,
          storeId: storeRecord.id,
          linkId: linkRecord?.id ?? null,
          kind: "COMMISSION",
          status,
          externalOrderId: `${txId}-admin-profit`,
          externalItemId: "platform-cut",
          orderAmountPaise: 0,
          commissionPaise: totalCommissionPaise,
          userAmountPaise: adminProfitPaise, // strictly platform's 30% cut
          pendingAt: now,
          confirmedAt: status === "CONFIRMED" ? now : null,
          rejectedAt: status === "REJECTED" ? now : null,
          rejectionReason: `Platform Share (${100 - userCommissionPercent}%) from Tx #${txId}`,
        },
        update: {
          status,
          commissionPaise: totalCommissionPaise,
          userAmountPaise: adminProfitPaise,
          confirmedAt: status === "CONFIRMED" ? now : undefined,
          rejectedAt: status === "REJECTED" ? now : undefined,
        },
      });

      // 5. Update WebhookEvent for audit trail and idempotency
      const payloadHash = createHash("sha256")
        .update(`cuelinks:${txId}:${status}:${totalCommissionPaise}`)
        .digest("hex");

      await prisma.webhookEvent.upsert({
        where: { payloadHash },
        create: {
          storeSlug: storeRecord.slug,
          payloadHash,
          payload: {
            txId,
            subId,
            userId: targetUserId,
            store: storeRecord.name,
            orderAmountRupees: (orderAmountPaise / 100).toFixed(2),
            totalCommissionRupees: (totalCommissionPaise / 100).toFixed(2),
            splitRatio: `${userCommissionPercent}% User / ${100 - userCommissionPercent}% Admin`,
            userEarningsRupees: (userEarningsPaise / 100).toFixed(2),
            adminProfitRupees: (adminProfitPaise / 100).toFixed(2),
            status,
            raw,
          },
          processedAt: now,
        },
        update: {
          processedAt: now,
        },
      });
    } catch (dbErr) {
      console.warn("Database error in cuelinks-postback, applying live memory fallback:", dbErr);
    }
  }

  // Also update live in-memory state for immediate reactive UI display
  const liveSync = recordCuelinksPostback({
    txId,
    subId,
    storeName,
    orderAmountPaise,
    totalCommissionPaise,
    userEarningsPaise,
    adminProfitPaise,
    status,
  });

  return {
    success: true,
    txId,
    subId,
    userId: targetUserId,
    storeName,
    status,
    financials: {
      orderAmount: (orderAmountPaise / 100).toFixed(2),
      totalCommission: (totalCommissionPaise / 100).toFixed(2),
      userSharePercent: `${userCommissionPercent}%`,
      userEarnings: (userEarningsPaise / 100).toFixed(2),
      adminProfit: (adminProfitPaise / 100).toFixed(2),
    },
    userBalances: {
      available: (liveSync.balances.available / 100).toFixed(2),
      pending: (liveSync.balances.pending / 100).toFixed(2),
      lifetime: (liveSync.balances.lifetime / 100).toFixed(2),
    },
  };
}

export async function POST(req: Request) {
  try {
    let body: Record<string, any> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        const sp = new URLSearchParams(text);
        sp.forEach((value, key) => {
          body[key] = value;
        });
      }
    }

    const result = await handlePostback(body);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Error processing Cuelinks POST postback:", err);
    return NextResponse.json(
      { error: "Internal processing error", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const result = await handlePostback(params);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Error processing Cuelinks GET postback:", err);
    return NextResponse.json(
      { error: "Internal processing error", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
