import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import { shortUrlFor } from "@/lib/affiliateConfig";
import {
  isDatabaseConfigured,
  MOCK_STORES,
  saveMockLink,
  type MockLink,
} from "@/lib/mockData";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Domain patterns recognizing Amazon domains & Amazon URL shorteners
 */
const AMAZON_HOST_REGEX =
  /(^|\.)(amazon\.(in|com|co\.uk|de|fr|es|it|ca|com\.au|co\.jp|ae)|amzn\.(to|in|com))$/i;

/**
 * Checks if the given URL belongs to Amazon.
 */
export function isAmazonUrl(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  try {
    const raw = input.trim();
    const candidate = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    const parsed = new URL(candidate);
    return AMAZON_HOST_REGEX.test(parsed.hostname);
  } catch {
    return /amazon\.(in|com)|amzn\.(to|in)/i.test(input);
  }
}

/**
 * Strips tracking, affiliate tags, and noise query parameters from an Amazon URL.
 * Preserves the clean canonical product or store path.
 */
export function cleanAmazonUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  try {
    const trimmed = rawUrl.trim();
    const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(candidate);

    // Standardize hostname for Indian marketplace if applicable
    if (u.hostname.endsWith("amazon.in") || u.hostname === "amzn.in") {
      u.hostname = "www.amazon.in";
    }

    // Try matching product ASIN pattern: /dp/B0... or /gp/product/B0...
    const asinMatch = u.pathname.match(/\/(?:dp|gp\/product|product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
    if (asinMatch && asinMatch[1]) {
      const asin = asinMatch[1].toUpperCase();
      return `https://${u.hostname}/dp/${asin}`;
    }

    // Otherwise, strip known affiliate/tracking params
    const stripParams = [
      "tag",
      "ascsubtag",
      "linkCode",
      "ref",
      "ref_",
      "keywords",
      "qid",
      "sr",
      "crid",
      "sprefix",
      "th",
      "psc",
      "smid",
      "pf_rd_r",
      "pf_rd_p",
      "pf_rd_m",
      "pf_rd_s",
      "pf_rd_t",
      "pf_rd_i",
    ];

    for (const p of stripParams) {
      u.searchParams.delete(p);
    }

    // Remove empty query string if no params left
    const search = u.searchParams.toString();
    const base = `${u.protocol}//${u.host}${u.pathname}`;
    return search ? `${base}?${search}` : base;
  } catch {
    // Basic regex fallback
    const parts = rawUrl.split("?");
    return (parts[0] || "").replace(/\/ref=.*$/i, "").trim();
  }
}

/**
 * Generates a unique tracking click reference ID for ascsubtag tracking.
 */
export function generateClickRefId(userId: string, code?: string): string {
  const shortCode = code || randomCode(8);
  const userSegment = (userId || "anon").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "ek";
  return `amz_${userSegment}_${shortCode}`;
}

/**
 * Formats the final destination URL with the Master Amazon Tag and ascsubtag tracking parameter.
 * Strictly adheres to format: `${cleanedUrl}?tag=${process.env.AMAZON_ASSOCIATE_TAG}&ascsubtag=${clickRefId}`
 */
export function formatAmazonAffiliateUrl(
  cleanedUrl: string,
  clickRefId: string,
  customTag?: string
): string {
  const base = cleanedUrl.includes("?") ? cleanedUrl.split("?")[0] : cleanedUrl;
  if (customTag && customTag.trim()) {
    return `${base}?tag=${customTag.trim()}`;
  }
  const masterTag =
    (typeof process !== "undefined" && process.env?.AMAZON_ASSOCIATE_TAG) ||
    "kamaikaro02-21";
  return `${base}?tag=${masterTag}&ascsubtag=${clickRefId}`;
}

export interface AmazonAffiliateResult {
  success: boolean;
  provider: "amazon_direct";
  clickRefId: string;
  code: string;
  shortUrl: string;
  appShortUrl: string;
  destinationUrl: string;
  originalUrl: string;
  canonicalUrl: string;
  store: { name: string; slug: string };
  estimatedProfitPaise?: number | null;
}

/**
 * Creates and persists a native Amazon Associates link with ascsubtag tracking.
 */
export async function createAmazonAffiliateLink(
  rawUrl: string,
  userId: string,
  options: { dealId?: string; subId?: string; customTag?: string } = {}
): Promise<AmazonAffiliateResult> {
  const cleanedUrl = cleanAmazonUrl(rawUrl);
  const code = randomCode(8);
  const clickRefId = options.subId || generateClickRefId(userId, code);

  let userCustomTag = options.customTag;
  if (!userCustomTag && isDatabaseConfigured()) {
    try {
      const cfg = await prisma.telegramChannelConfig.findUnique({
        where: { userId },
        select: { amazonTag: true },
      });
      if (cfg?.amazonTag) userCustomTag = cfg.amazonTag;
    } catch {}
  }

  const destinationUrl = formatAmazonAffiliateUrl(cleanedUrl, clickRefId, userCustomTag);
  const appShortUrl = shortUrlFor(code);
  const urlHash = createHash("sha256").update(cleanedUrl).digest("hex");

  const storeInfo = { name: "Amazon", slug: "amazon" };

  // 1. Database persistence
  if (isDatabaseConfigured()) {
    try {
      // Ensure user exists for foreign key
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: "partner@kamaikaro.local",
          name: "Kamai Karo Partner",
          referralCode: "EK" + code.slice(0, 6).toUpperCase(),
          subIdPrefix: "amz",
        },
      });

      // Ensure Amazon store exists
      let storeRecord = await prisma.partnerStore.findUnique({ where: { slug: "amazon" } });
      if (!storeRecord) {
        storeRecord = await prisma.partnerStore.create({
          data: {
            slug: "amazon",
            name: "Amazon",
            commissionRateBps: 500, // 5% base affiliate rate
            userShareBps: 7000,     // 70% user cut
          },
        });
      }

      await prisma.generatedLink.create({
        data: {
          userId,
          storeId: storeRecord.id,
          dealId: options.dealId || null,
          code,
          subId: clickRefId, // link clickRefId to subId for ascsubtag lookup
          originalUrl: rawUrl,
          canonicalUrl: cleanedUrl,
          urlHash: `${urlHash}-${Date.now()}`,
          destinationUrl,
        },
      });

      // Also persist to Supabase links table if present
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          await (supabase as any).from("links").insert({
            user_id: userId,
            click_ref_id: clickRefId,
            provider: "amazon_direct",
            code,
            original_url: rawUrl,
            destination_url: destinationUrl,
            created_at: new Date().toISOString(),
          });
        } catch {}
      }

      return {
        success: true,
        provider: "amazon_direct",
        clickRefId,
        code,
        shortUrl: appShortUrl,
        appShortUrl,
        destinationUrl,
        originalUrl: rawUrl,
        canonicalUrl: cleanedUrl,
        store: storeInfo,
      };
    } catch (dbErr) {
      console.warn("DB save error in Amazon link generator, saving mock link:", dbErr);
    }
  }

  // 2. In-memory / Mock link fallback
  const mockStore =
    MOCK_STORES.find((s) => s.slug === "amazon") || { id: "store-amazon", name: "Amazon", slug: "amazon" };

  const mockLink: MockLink & { provider?: string; clickRefId?: string } = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0"),
    userId,
    storeId: mockStore.id,
    dealId: options.dealId || null,
    code,
    subId: clickRefId,
    clickRefId,
    provider: "amazon_direct",
    originalUrl: rawUrl,
    canonicalUrl: cleanedUrl,
    urlHash,
    destinationUrl,
    clickCount: 0,
    lastClickedAt: null,
    createdAt: new Date(),
    store: storeInfo,
    deal: null,
  };

  saveMockLink(mockLink);

  return {
    success: true,
    provider: "amazon_direct",
    clickRefId,
    code,
    shortUrl: appShortUrl,
    appShortUrl,
    destinationUrl,
    originalUrl: rawUrl,
    canonicalUrl: cleanedUrl,
    store: storeInfo,
  };
}
