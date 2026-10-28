import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { shortUrlFor } from "@/lib/affiliateConfig";
import { convertWithCuelinks } from "@/lib/cuelinks";
import { extractUrl, detectStore } from "@/lib/linkConverter";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortcode";
import { estimateProfitPaise } from "@/lib/profit";
import {
  isDatabaseConfigured,
  MOCK_STORES,
  MOCK_DEALS,
  saveMockLink,
  getMockLinks,
  type MockLink,
} from "@/lib/mockData";

export const runtime = "nodejs";

const Body = z.object({
  url: z.string().min(1).max(4000),
  dealId: z.string().optional(),
  subId: z.string().optional(),
});

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

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please provide JSON with { url: string }" },
      { status: 400 }
    );
  }

  const rawUrl = body.url.trim();
  const extracted = extractUrl(rawUrl);
  if (!extracted) {
    return NextResponse.json(
      { error: "No valid product link detected. Please check your URL." },
      { status: 422 }
    );
  }

  // Detect store rule or hostname
  const detected = detectStore(extracted);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(extracted);
  } catch {
    return NextResponse.json({ error: "Invalid URL format." }, { status: 422 });
  }

  // Get user context or fallback to demo affiliate user
  const user = await getApiUser().catch(() => null);
  const userId = user?.id || "00000000-0000-0000-0000-000000000001";
  const userPrefix = user?.subIdPrefix || "ek";
  const code = randomCode(8);
  // Requirement: Attach logged-in user's unique ID to the Cuelinks subid parameter
  const trackingSubId = body.subId || `${userId}_${code}`;

  // Call Cuelinks API to convert link
  const cuelinksResult = await convertWithCuelinks(extracted, {
    subId: trackingSubId,
  });

  const campaignName = cuelinksResult.campaignName || detected?.name || parsedUrl.hostname.replace(/^www\./, "");
  const storeSlug = detected?.slug || slugifyStore(campaignName);

  // Profit calculation if deal is linked
  let estimatedProfitPaise: number | null = null;
  const mockStore = MOCK_STORES.find((s) => s.slug === storeSlug) || MOCK_STORES[0]!;
  if (body.dealId) {
    const mockDeal = MOCK_DEALS.find((d) => d.id === body.dealId);
    if (mockDeal) {
      estimatedProfitPaise = estimateProfitPaise(mockDeal.pricePaise, mockStore);
    }
  }

  const urlHash = createHash("sha256").update(extracted).digest("hex");
  const appShortUrl = shortUrlFor(code);
  const finalShortUrl = cuelinksResult.shortUrl || appShortUrl;

  // Persist link in database if configured
  if (isDatabaseConfigured()) {
    try {
      // Ensure user exists for foreign key constraint
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: "partner@earnkaro.local",
          name: "EarnKaro Partner",
          referralCode: "EK" + code.slice(0, 6).toUpperCase(),
          subIdPrefix: userPrefix,
        },
      });

      let storeRecord = await prisma.partnerStore.findUnique({ where: { slug: storeSlug } });
      if (!storeRecord) {
        storeRecord = await prisma.partnerStore.create({
          data: {
            slug: storeSlug,
            name: campaignName,
            commissionRateBps: 400,
            userShareBps: 6000,
          },
        });
      }

      const link = await prisma.generatedLink.create({
        data: {
          userId,
          storeId: storeRecord.id,
          dealId: body.dealId || null,
          code,
          subId: trackingSubId,
          originalUrl: extracted,
          canonicalUrl: extracted,
          urlHash: `${urlHash}-${Date.now()}`,
          destinationUrl: cuelinksResult.trackingUrl,
        },
      });

      return NextResponse.json({
        success: true,
        cuelinksUrl: cuelinksResult.trackingUrl,
        shortUrl: finalShortUrl,
        appShortUrl,
        code: link.code,
        campaign: campaignName,
        store: { name: storeRecord.name, slug: storeRecord.slug },
        source: cuelinksResult.source,
        link: {
          code: link.code,
          shortUrl: finalShortUrl,
          appShortUrl,
          cuelinksUrl: cuelinksResult.trackingUrl,
          destinationUrl: cuelinksResult.trackingUrl,
          canonicalUrl: extracted,
          createdAt: link.createdAt.toISOString(),
          clickCount: 0,
          store: { name: storeRecord.name, slug: storeRecord.slug },
        },
        estimatedProfitPaise,
      });
    } catch (dbErr) {
      console.warn("DB save error in convert-link, saving mock link:", dbErr);
    }
  }

  // Fallback in-memory save with valid UUID
  const mockLinkId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");

  const mockLink: MockLink = {
    id: mockLinkId,
    userId,
    storeId: mockStore.id,
    dealId: body.dealId || null,
    code,
    subId: trackingSubId,
    originalUrl: extracted,
    canonicalUrl: extracted,
    urlHash,
    destinationUrl: cuelinksResult.trackingUrl,
    clickCount: 0,
    lastClickedAt: null,
    createdAt: new Date(),
    store: { name: campaignName, slug: storeSlug },
    deal: null,
  };
  saveMockLink(mockLink);

  return NextResponse.json({
    success: true,
    cuelinksUrl: cuelinksResult.trackingUrl,
    shortUrl: finalShortUrl,
    appShortUrl,
    code,
    campaign: campaignName,
    store: { name: campaignName, slug: storeSlug },
    source: cuelinksResult.source,
    link: {
      code,
      shortUrl: finalShortUrl,
      appShortUrl,
      cuelinksUrl: cuelinksResult.trackingUrl,
      destinationUrl: cuelinksResult.trackingUrl,
      canonicalUrl: extracted,
      createdAt: mockLink.createdAt.toISOString(),
      clickCount: 0,
      store: { name: campaignName, slug: storeSlug },
    },
    estimatedProfitPaise,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({
      service: "Cuelinks Conversion API",
      status: "active",
      usage: "POST /api/convert-link with { url: 'https://...' }",
    });
  }

  const result = await convertWithCuelinks(url, {
    subId: searchParams.get("subid") || "demo",
  });
  return NextResponse.json(result);
}
