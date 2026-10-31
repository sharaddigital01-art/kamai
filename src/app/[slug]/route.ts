import { NextResponse, after, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedShortUrl, setCachedShortUrl } from "@/lib/linkCache";
import {
  isDatabaseConfigured,
  getMockShortLinkBySlug,
  incrementMockShortLinkClick,
  getMockLinkByCode,
  incrementMockLinkClick,
  getLiveDeals,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Routes and static assets that should never be treated as short slugs */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "earnings",
  "links",
  "login",
  "make-links",
  "partners",
  "profile",
  "r",
  "reports",
  "signup",
  "telegram-bot",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "_next",
]);

function normalizeDestination(raw: string): string {
  let clean = raw.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  // Strip leading and trailing slashes from params.slug
  const rawSlug = resolvedParams?.slug ?? "";
  const slug = rawSlug.replace(/^\/+|\/+$/g, "").trim();

  const home = new URL("/?link=not-found", req.url);

  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  // 1. Fast in-memory cache check
  const cachedUrl = getCachedShortUrl(slug);
  if (cachedUrl) {
    const dest = normalizeDestination(cachedUrl);
    try {
      after(async () => {
        if (!isDatabaseConfigured()) {
          incrementMockShortLinkClick(slug);
          return;
        }
        await prisma.shortLink.updateMany({
          where: { slug },
          data: { clickCount: { increment: 1 } },
        }).catch(() => null);
      });
    } catch {}

    const res = NextResponse.redirect(dest, 307);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    return res;
  }

  // 2. Find record in database
  let record: { originalUrl: string } | null = null;
  let isShortLink = false;

  if (isDatabaseConfigured()) {
    try {
      const shortRecord = await prisma.shortLink.findUnique({
        where: { slug },
        select: { id: true, originalUrl: true, targetUrl: true },
      });
      if (shortRecord) {
        record = { originalUrl: shortRecord.originalUrl || shortRecord.targetUrl || "" };
        isShortLink = true;
      }
    } catch (err) {
      console.warn("Database lookup error in [slug] for ShortLink:", err);
    }
  }

  if (!record) {
    const mockShort = getMockShortLinkBySlug(slug);
    if (mockShort) {
      record = { originalUrl: mockShort.originalUrl || mockShort.targetUrl };
      isShortLink = true;
    }
  }

  // 3. Fallback: Check GeneratedLink (code: slug)
  if (!record && isDatabaseConfigured()) {
    try {
      const genRecord = await prisma.generatedLink.findUnique({
        where: { code: slug },
        select: { id: true, destinationUrl: true, originalUrl: true },
      });
      if (genRecord) {
        record = { originalUrl: genRecord.destinationUrl || genRecord.originalUrl };
      }
    } catch (err) {
      console.warn("Database lookup error in [slug] for GeneratedLink:", err);
    }
  }

  if (!record) {
    const mockGen = getMockLinkByCode(slug);
    if (mockGen) {
      record = { originalUrl: mockGen.destinationUrl || mockGen.originalUrl };
    }
  }

  // 4. Fallback: Check Deal table (id: slug)
  if (!record && isDatabaseConfigured()) {
    try {
      const dealRecord = await prisma.deal.findUnique({
        where: { id: slug },
        select: { productUrl: true },
      });
      if (dealRecord?.productUrl) {
        record = { originalUrl: dealRecord.productUrl };
      }
    } catch {}
  }

  if (!record) {
    const mockDeal = getLiveDeals().find((d) => d.id === slug);
    if (mockDeal?.productUrl) {
      record = { originalUrl: mockDeal.productUrl };
    }
  }

  // 5. If found, immediately redirect to record.originalUrl with 307
  if (record && record.originalUrl) {
    const dest = normalizeDestination(record.originalUrl);

    // Save in fast cache
    setCachedShortUrl(slug, dest);

    // Click tracking in background
    try {
      after(async () => {
        if (isShortLink) {
          if (!isDatabaseConfigured()) {
            incrementMockShortLinkClick(slug);
            return;
          }
          await prisma.shortLink.updateMany({
            where: { slug },
            data: { clickCount: { increment: 1 } },
          }).catch(() => null);
        } else {
          if (!isDatabaseConfigured()) {
            incrementMockLinkClick(slug);
            return;
          }
          await prisma.generatedLink.updateMany({
            where: { code: slug },
            data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
          }).catch(() => null);
        }
      });
    } catch {}

    const response = NextResponse.redirect(dest, 307);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  // Not found
  return NextResponse.redirect(home, 302);
}
