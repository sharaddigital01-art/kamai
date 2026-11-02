import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { isAmazonUrl, createAmazonAffiliateLink } from "@/lib/affiliate/amazon";
import { convertWithCuelinks } from "@/lib/cuelinks";
import { extractUrl, detectStore } from "@/lib/linkConverter";
import { randomCode } from "@/lib/shortcode";
import { shortUrlFor } from "@/lib/affiliateConfig";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, saveMockLink, type MockLink } from "@/lib/mockData";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

const RequestSchema = z.object({
  url: z.string().trim().min(1, "URL is required"),
  dealId: z.string().optional(),
  subId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = RequestSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { url: rawUrl, dealId, subId } = parseResult.data;
    const extracted = extractUrl(rawUrl) || rawUrl.trim();

    // Authenticated user or fallback
    const user = await getApiUser().catch(() => null);
    const userId = user?.id || "00000000-0000-0000-0000-000000000001";

    // 1. Native Amazon Associates Engine
    if (isAmazonUrl(extracted)) {
      const amazonResult = await createAmazonAffiliateLink(extracted, userId, {
        dealId,
        subId,
      });

      return NextResponse.json({
        success: true,
        provider: "amazon_direct",
        clickRefId: amazonResult.clickRefId,
        destinationUrl: amazonResult.destinationUrl,
        shortUrl: amazonResult.shortUrl,
        appShortUrl: amazonResult.appShortUrl,
        code: amazonResult.code,
        store: amazonResult.store,
        link: {
          code: amazonResult.code,
          shortUrl: amazonResult.shortUrl,
          destinationUrl: amazonResult.destinationUrl,
          canonicalUrl: amazonResult.canonicalUrl,
          clickRefId: amazonResult.clickRefId,
          provider: "amazon_direct",
          store: amazonResult.store,
        },
      });
    }

    // 2. Other stores via standard Cuelinks engine
    const detected = detectStore(extracted);
    const code = randomCode(8);
    const trackingSubId = subId || `${userId}_${code}`;
    const cuelinksResult = await convertWithCuelinks(extracted, { subId: trackingSubId });
    const appShortUrl = shortUrlFor(code);
    const finalShortUrl = cuelinksResult.shortUrl || appShortUrl;
    const campaignName = cuelinksResult.campaignName || detected?.name || "Partner Store";
    const storeSlug = detected?.slug || "general";
    const urlHash = createHash("sha256").update(extracted).digest("hex");

    if (isDatabaseConfigured()) {
      try {
        let storeRecord = await prisma.partnerStore.findUnique({ where: { slug: storeSlug } });
        if (!storeRecord) {
          storeRecord = await prisma.partnerStore.create({
            data: {
              slug: storeSlug,
              name: campaignName,
              commissionRateBps: 400,
              userShareBps: 7000,
            },
          });
        }

        const link = await prisma.generatedLink.create({
          data: {
            userId,
            storeId: storeRecord.id,
            dealId: dealId || null,
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
          provider: "cuelinks",
          shortUrl: finalShortUrl,
          appShortUrl,
          destinationUrl: cuelinksResult.trackingUrl,
          code: link.code,
          store: { name: storeRecord.name, slug: storeRecord.slug },
          link: {
            code: link.code,
            shortUrl: finalShortUrl,
            destinationUrl: cuelinksResult.trackingUrl,
            canonicalUrl: extracted,
            provider: "cuelinks",
            store: { name: storeRecord.name, slug: storeRecord.slug },
          },
        });
      } catch (err) {
        console.warn("DB save in links/generate fallback:", err);
      }
    }

    const mockLink: MockLink = {
      id: "mock-" + Date.now(),
      userId,
      storeId: "store-gen",
      dealId: dealId || null,
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
      provider: "cuelinks",
      shortUrl: finalShortUrl,
      appShortUrl,
      destinationUrl: cuelinksResult.trackingUrl,
      code,
      store: { name: campaignName, slug: storeSlug },
      link: {
        code,
        shortUrl: finalShortUrl,
        destinationUrl: cuelinksResult.trackingUrl,
        canonicalUrl: extracted,
        provider: "cuelinks",
        store: { name: campaignName, slug: storeSlug },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate link" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({
      status: "active",
      service: "Native Amazon & Affiliate Link Generator",
      usage: "POST /api/links/generate with { url: 'https://...' }",
    });
  }

  const reqObj = new Request(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return POST(reqObj);
}
