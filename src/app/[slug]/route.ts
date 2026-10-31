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

function normalizeDestination(raw: string): URL | null {
  try {
    let clean = raw.trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    const parsed = new URL(clean);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const home = new URL("/?link=not-found", req.url);

  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  // 1. Fast in-memory TTL cache lookup
  const cached = getCachedShortUrl(slug);
  if (cached) {
    const dest = normalizeDestination(cached);
    if (dest) {
      try {
        after(async () => {
          if (!isDatabaseConfigured()) {
            incrementMockShortLinkClick(slug);
            return;
          }
          try {
            await prisma.shortLink.update({
              where: { slug },
              data: { clickCount: { increment: 1 } },
            });
          } catch {
            // ignore tracking failure
          }
        });
      } catch {
        // Outside request lifecycle (e.g. tests)
      }
      return NextResponse.redirect(dest, {
        status: 307,
        headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer-when-downgrade" },
      });
    }
  }

  // 2. Lookup in ShortLink table / mock
  let targetUrl: string | null = null;
  let isShortLink = false;

  if (isDatabaseConfigured()) {
    try {
      const shortRecord = await prisma.shortLink.findUnique({
        where: { slug },
        select: { id: true, targetUrl: true },
      });
      if (shortRecord) {
        targetUrl = shortRecord.targetUrl;
        isShortLink = true;
      }
    } catch (err) {
      console.warn("DB lookup error in [slug] for ShortLink:", err);
    }
  }

  if (!targetUrl) {
    const mockShort = getMockShortLinkBySlug(slug);
    if (mockShort) {
      targetUrl = mockShort.targetUrl;
      isShortLink = true;
    }
  }

  // 3. Fallback: Lookup in GeneratedLink table / mock (by code)
  let isGeneratedLink = false;
  let genLinkId: string | null = null;

  if (!targetUrl) {
    if (isDatabaseConfigured()) {
      try {
        const genRecord = await prisma.generatedLink.findUnique({
          where: { code: slug },
          select: { id: true, destinationUrl: true },
        });
        if (genRecord) {
          targetUrl = genRecord.destinationUrl;
          isGeneratedLink = true;
          genLinkId = genRecord.id;
        }
      } catch (err) {
        console.warn("DB lookup error in [slug] for GeneratedLink:", err);
      }
    }

    if (!targetUrl) {
      const mockGen = getMockLinkByCode(slug);
      if (mockGen) {
        targetUrl = mockGen.destinationUrl;
        isGeneratedLink = true;
        genLinkId = mockGen.id;
      }
    }
  }

  // 4. Fallback: Lookup in Deal table / mock (by id)
  if (!targetUrl) {
    if (isDatabaseConfigured()) {
      try {
        const dealRecord = await prisma.deal.findUnique({
          where: { id: slug },
          select: { productUrl: true },
        });
        if (dealRecord) {
          targetUrl = dealRecord.productUrl;
        }
      } catch {
        // ignore
      }
    }

    if (!targetUrl) {
      const mockDeal = getLiveDeals().find((d) => d.id === slug);
      if (mockDeal) {
        targetUrl = mockDeal.productUrl;
      }
    }
  }

  // If still not found, redirect to home with not-found query
  if (!targetUrl) {
    return NextResponse.redirect(home, 302);
  }

  const dest = normalizeDestination(targetUrl);
  if (!dest) {
    return NextResponse.redirect(home, 302);
  }

  // Cache for future instant redirects
  setCachedShortUrl(slug, dest.toString());

  // Record click count asynchronously without slowing down redirect
  try {
    after(async () => {
      if (isShortLink) {
        if (!isDatabaseConfigured()) {
          incrementMockShortLinkClick(slug);
          return;
        }
        try {
          await prisma.shortLink.update({
            where: { slug },
            data: { clickCount: { increment: 1 } },
          });
        } catch {
          // ignore
        }
      } else if (isGeneratedLink) {
        if (!isDatabaseConfigured()) {
          incrementMockLinkClick(slug);
          return;
        }
        if (genLinkId) {
          try {
            await prisma.generatedLink.update({
              where: { id: genLinkId },
              data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
            });
          } catch {
            // ignore
          }
        }
      }
    });
  } catch {
    // Outside request lifecycle (e.g. tests)
  }

  return NextResponse.redirect(dest, {
    status: 307,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}
