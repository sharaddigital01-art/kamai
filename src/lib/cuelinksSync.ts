import { prisma } from "./prisma";
import {
  isDatabaseConfigured,
  findMockUserById,
  upsertMockConversion,
  DEMO_USER,
} from "./mockData";

export interface RawCuelinksTransaction {
  id?: string | number;
  transaction_id?: string | number;
  txid?: string | number;
  tx_id?: string | number;
  order_id?: string | number;
  reference_id?: string | number;
  subid?: string;
  sub_id?: string;
  sub_id1?: string;
  subid1?: string;
  affsub?: string;
  s1?: string;
  custom_id?: string;
  merchant_name?: string;
  campaign_name?: string;
  store_name?: string;
  advertiser_name?: string;
  store?: string;
  sale_amount?: string | number;
  order_amount?: string | number;
  amount?: string | number;
  order_value?: string | number;
  commission?: string | number;
  payout?: string | number;
  affiliate_commission?: string | number;
  pub_commission?: string | number;
  status?: string | number;
  validation_status?: string | number;
  state?: string | number;
  created_at?: string;
  transaction_date?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface SyncStats {
  totalFetched: number;
  synced: number;
  updated: number;
  skipped: number;
}

export function slugifyStore(name: string): string {
  const lower = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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

export function normalizeStatus(
  rawStatus?: string | number | null
): "PAID" | "PENDING" | "CANCELLED" {
  if (rawStatus === undefined || rawStatus === null) return "PENDING";
  const s = String(rawStatus).toLowerCase().trim();

  if (
    s === "paid" ||
    s === "approved" ||
    s === "confirmed" ||
    s === "validated" ||
    s === "1" ||
    s.includes("approve") ||
    s.includes("confirm") ||
    s.includes("paid")
  ) {
    return "PAID";
  }

  if (
    s === "rejected" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "declined" ||
    s === "failed" ||
    s === "2" ||
    s.includes("reject") ||
    s.includes("cancel")
  ) {
    return "CANCELLED";
  }

  return "PENDING";
}

export function normalizeConversionStatus(
  rawStatus?: string | number | null
): "confirmed" | "pending" | "rejected" {
  if (rawStatus === undefined || rawStatus === null) return "pending";
  const s = String(rawStatus).toLowerCase().trim();

  if (
    s === "approved" ||
    s === "confirmed" ||
    s === "validated" ||
    s === "1" ||
    s === "paid" ||
    s.includes("approve") ||
    s.includes("confirm")
  ) {
    return "confirmed";
  }

  if (
    s === "rejected" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "declined" ||
    s === "failed" ||
    s === "2" ||
    s.includes("reject") ||
    s.includes("cancel")
  ) {
    return "rejected";
  }

  return "pending";
}

export async function resolveUserBySubId(subId: string): Promise<string | null> {
  const cleanSub = (subId || "").trim();
  if (!cleanSub) return null;
  const lowerSub = cleanSub.toLowerCase();

  if (isDatabaseConfigured()) {
    try {
      // 1. Direct match on GeneratedLink (subId or code)
      const link = await prisma.generatedLink.findFirst({
        where: {
          OR: [
            { subId: { equals: cleanSub, mode: "insensitive" } },
            { code: { equals: cleanSub, mode: "insensitive" } },
          ],
        },
        select: { userId: true },
      });
      if (link?.userId) return link.userId;

      // 1b. Direct match on ShortLink (subId or slug)
      const shortLink = await prisma.shortLink.findFirst({
        where: {
          OR: [
            { subId: { equals: cleanSub, mode: "insensitive" } },
            { slug: { equals: cleanSub, mode: "insensitive" } },
          ],
        },
        select: { userId: true },
      });
      if (shortLink?.userId) return shortLink.userId;

      // 1c. Match on TelegramChannelConfig
      const tgConfig = await prisma.telegramChannelConfig.findFirst({
        where: {
          telegramUserId: { equals: cleanSub, mode: "insensitive" },
        },
        select: { userId: true },
      });
      if (tgConfig?.userId) return tgConfig.userId;

      // 2. Format: `${userId}_${code}`
      if (cleanSub.includes("_")) {
        const potentialId = cleanSub.split("_")[0];
        if (
          potentialId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialId)
        ) {
          const u = await prisma.user.findUnique({
            where: { id: potentialId },
            select: { id: true },
          });
          if (u) return u.id;
        }
      }

      // 3. User UUID directly
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSub)
      ) {
        const u = await prisma.user.findUnique({
          where: { id: cleanSub },
          select: { id: true },
        });
        if (u) return u.id;
      }

      // 4. SubIdPrefix or referralCode or prefix before underscore / tg suffix
      const stripped = cleanSub.replace(/_tg$|-tg$|_web$|_link$/i, "");
      const prefix = stripped.includes("_") ? stripped.split("_")[0] : (stripped.slice(0, 8) || cleanSub);
      const userByPrefix = await prisma.user.findFirst({
        where: {
          OR: [
            { subIdPrefix: { equals: cleanSub, mode: "insensitive" } },
            { subIdPrefix: { equals: stripped, mode: "insensitive" } },
            { subIdPrefix: { equals: prefix, mode: "insensitive" } },
            { referralCode: { equals: cleanSub, mode: "insensitive" } },
            { referralCode: { equals: stripped, mode: "insensitive" } },
            { referralCode: { equals: prefix, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (userByPrefix) return userByPrefix.id;
    } catch (dbErr) {
      console.warn("DB lookup error in resolveUserBySubId:", dbErr);
    }
  }

  // Fallback to in-memory mock store
  const mockUser = findMockUserById(cleanSub);
  if (mockUser) return mockUser.id;

  const g = globalThis as any;
  if (g.mockUsers) {
    const strippedLower = cleanSub.replace(/_tg$|-tg$|_web$|_link$/i, "").toLowerCase();
    const prefixLower = strippedLower.includes("_")
      ? strippedLower.split("_")[0]
      : (strippedLower.slice(0, 8) || lowerSub);

    for (const u of g.mockUsers.values()) {
      const uId = (u.id || "").toLowerCase();
      const uPrefix = (u.subIdPrefix || "").toLowerCase();
      const uRef = (u.referralCode || "").toLowerCase();

      if (uId === lowerSub || lowerSub.startsWith(uId)) return u.id;

      if (
        uPrefix &&
        (lowerSub === uPrefix ||
          lowerSub.startsWith(uPrefix) ||
          lowerSub === `${uPrefix}_tg` ||
          strippedLower === uPrefix ||
          prefixLower === uPrefix)
      ) {
        return u.id;
      }

      if (
        uRef &&
        (lowerSub === uRef ||
          lowerSub.startsWith(uRef) ||
          strippedLower === uRef ||
          prefixLower === uRef)
      ) {
        return u.id;
      }
    }
  }

  return null;
}

export async function fetchCuelinksTransactions(options: {
  startDate?: string;
  endDate?: string;
  apiKey?: string;
  channelId?: string;
  subId?: string | null;
}): Promise<RawCuelinksTransaction[]> {
  const apiKey =
    options.apiKey ||
    process.env.CUELINKS_API_KEY ||
    "8ir_BIfBqgKif2bcVsjbPeihyADLwkEoYTvwYqUB174";
  const channelId =
    options.channelId ||
    process.env.CUELINKS_CHANNEL_ID ||
    "332862";

  if (!apiKey) {
    console.warn("No CUELINKS_API_KEY configured for sync-conversions");
    return [];
  }

  const cleanSubId = (options.subId || "").trim();

  // Primary endpoint: https://api.cuelinks.com/v2/transactions.json?subid=<user_subid>
  const urlObj = new URL("https://api.cuelinks.com/v2/transactions.json");
  if (channelId) urlObj.searchParams.set("channel_id", channelId);
  if (options.startDate) urlObj.searchParams.set("start_date", options.startDate);
  if (options.endDate) urlObj.searchParams.set("end_date", options.endDate);
  if (cleanSubId) urlObj.searchParams.set("subid", cleanSubId);

  try {
    const res = await fetch(urlObj.toString(), {
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
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.transactions)) return json.transactions;
      if (Array.isArray(json.data)) return json.data;
      return [];
    }

    // Secondary fallback: https://www.cuelinks.com/api/v2/transactions.json
    const fallbackUrl = new URL("https://www.cuelinks.com/api/v2/transactions.json");
    if (channelId) fallbackUrl.searchParams.set("channel_id", channelId);
    if (options.startDate) fallbackUrl.searchParams.set("start_date", options.startDate);
    if (options.endDate) fallbackUrl.searchParams.set("end_date", options.endDate);
    if (cleanSubId) fallbackUrl.searchParams.set("subid", cleanSubId);

    const fallbackRes = await fetch(fallbackUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Token token=${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    if (fallbackRes && fallbackRes.ok) {
      const json = await fallbackRes.json();
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.transactions)) return json.transactions;
      if (Array.isArray(json.data)) return json.data;
      return [];
    }

    const errText = await res.text().catch(() => "");
    console.warn(`Cuelinks API v2 transactions returned ${res.status}: ${errText}`);
    return [];
  } catch (err: any) {
    console.warn("Error fetching Cuelinks transactions:", err?.message || err);
    return [];
  }
}

export async function syncCuelinksTransactions(
  transactions: RawCuelinksTransaction[],
  options: {
    userCommissionPercent?: number;
    filterUserId?: string;
    targetSubId?: string;
  } = {}
): Promise<{ stats: SyncStats; results: any[] }> {
  const userCommissionPercent =
    options.userCommissionPercent || Number(process.env.USER_COMMISSION_PERCENT || 70);
  const userRatio = Math.max(0, Math.min(100, userCommissionPercent)) / 100;

  let synced = 0;
  let updated = 0;
  let skipped = 0;
  const results: any[] = [];
  const now = new Date();

  for (const tx of transactions) {
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

    const status = normalizeConversionStatus(
      tx.status ?? tx.validation_status ?? tx.state
    );

    const resolvedUserId =
      (await resolveUserBySubId(subId)) ||
      options.filterUserId ||
      DEMO_USER.id;

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
            status,
            subid: subId || null,
            userId: resolvedUserId,
          },
          update: {
            storeName,
            saleAmount,
            commission,
            status,
            subid: subId || null,
            userId: resolvedUserId,
            updatedAt: now,
          },
        });

        // Also record in EarningsLedger for complete user balance tracking
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
          status === "confirmed"
            ? "CONFIRMED"
            : status === "pending"
            ? "PENDING"
            : "REJECTED";

        if (resolvedUserId) {
          await prisma.earningsLedger.upsert({
            where: {
              storeId_externalOrderId_externalItemId: {
                storeId: storeRecord.id,
                externalOrderId: txId,
                externalItemId: "",
              },
            },
            create: {
              userId: resolvedUserId,
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
          if (status === "confirmed") {
            await (prisma as any).$executeRawUnsafe(
              `UPDATE "User" SET "confirmed_balance" = COALESCE("confirmed_balance", 0) + $1 WHERE "id" = $2::uuid`,
              commission,
              resolvedUserId
            ).catch(() => {});
          } else if (status === "pending") {
            await (prisma as any).$executeRawUnsafe(
              `UPDATE "User" SET "pending_balance" = COALESCE("pending_balance", 0) + $1 WHERE "id" = $2::uuid`,
              commission,
              resolvedUserId
            ).catch(() => {});
          }
        }
      } catch (dbErr) {
        console.warn("Database upsert error in syncCuelinksTransactions:", dbErr);
      }
    }

    // 2. In-memory / fallback store upsert
    const mockSync = upsertMockConversion({
      transactionId: txId,
      storeName,
      saleAmount,
      commission,
      status,
      subid: subId || null,
      userId: resolvedUserId,
    });

    synced++;
    if (mockSync.isNew) {
      updated++;
    } else {
      updated++;
    }

    results.push({
      transactionId: txId,
      storeName,
      saleAmount,
      commission,
      status,
      subid: subId || null,
      userId: resolvedUserId,
    });
  }

  return {
    stats: {
      totalFetched: transactions.length,
      synced,
      updated,
      skipped,
    },
    results,
  };
}
