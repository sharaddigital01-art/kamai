import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
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

const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests|headless/i;

function deviceType(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Daily-rotating salt: de-duplicates within a day without storing raw IPs */
function hashIp(ip: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${process.env.CLICK_HASH_SECRET ?? "dev"}:${day}:${ip}`)
    .digest("hex");
}

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

  const ua = req.headers.get("user-agent") ?? "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const referer = req.headers.get("referer")?.slice(0, 300) ?? null;
  const isBot = !ua || BOT_RE.test(ua);
  const ipHash = hashIp(ip);
  const devType = deviceType(ua);

  // 1. Fast in-memory cache check
  const cachedUrl = getCachedShortUrl(slug);
  if (cachedUrl) {
    const dest = normalizeDestination(cachedUrl);

    // Track click in database before redirecting
    let cachedTracked = false;
    if (isDatabaseConfigured()) {
      try {
        const shortRec = await prisma.shortLink.findUnique({
          where: { slug },
          select: { id: true, userId: true, subId: true },
        });

        if (shortRec) {
          await prisma.$transaction([
            prisma.shortLink.update({
              where: { id: shortRec.id },
              data: { clickCount: { increment: 1 } },
            }),
            prisma.click.create({
              data: {
                shortLinkId: shortRec.id,
                userId: shortRec.userId || undefined,
                subId: shortRec.subId || undefined,
                ipHash,
                userAgent: ua.slice(0, 300) || null,
                referer,
                deviceType: devType,
                isBot,
              },
            }),
          ]);
          cachedTracked = true;
        } else {
          const genRec = await prisma.generatedLink.findUnique({
            where: { code: slug },
            select: { id: true, userId: true, storeId: true, subId: true },
          });

          if (genRec) {
            await prisma.$transaction([
              prisma.generatedLink.update({
                where: { id: genRec.id },
                data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
              }),
              prisma.click.create({
                data: {
                  linkId: genRec.id,
                  userId: genRec.userId || undefined,
                  storeId: genRec.storeId || undefined,
                  subId: genRec.subId || undefined,
                  ipHash,
                  userAgent: ua.slice(0, 300) || null,
                  referer,
                  deviceType: devType,
                  isBot,
                },
              }),
            ]);
            cachedTracked = true;
          }
        }
      } catch (err) {
        console.warn("Click tracking error on cached short URL:", err);
      }
    }

    if (!cachedTracked) {
      incrementMockShortLinkClick(slug);
    }

    const res = NextResponse.redirect(dest, 307);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    return res;
  }

  // 2. Find record in database
  let record: { originalUrl: string } | null = null;
  let isShortLink = false;
  let shortRecord: {
    id: string;
    originalUrl: string;
    targetUrl: string | null;
    userId: string | null;
    subId: string | null;
  } | null = null;
  let genRecord: {
    id: string;
    destinationUrl: string;
    originalUrl: string;
    userId: string | null;
    storeId: string | null;
    subId: string | null;
  } | null = null;
  let dealRecord: {
    id: string;
    productUrl: string;
    storeId: string;
  } | null = null;

  if (isDatabaseConfigured()) {
    try {
      shortRecord = await prisma.shortLink.findUnique({
        where: { slug },
        select: { id: true, originalUrl: true, targetUrl: true, userId: true, subId: true },
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
      genRecord = await prisma.generatedLink.findUnique({
        where: { code: slug },
        select: {
          id: true,
          destinationUrl: true,
          originalUrl: true,
          userId: true,
          storeId: true,
          subId: true,
        },
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
      dealRecord = await prisma.deal.findUnique({
        where: { id: slug },
        select: { id: true, productUrl: true, storeId: true },
      });
      if (dealRecord?.productUrl) {
        record = { originalUrl: dealRecord.productUrl };
      }
    } catch (err) {
      console.warn("Database lookup error in [slug] for Deal:", err);
    }
  }

  if (!record) {
    const mockDeal = getLiveDeals().find((d) => d.id === slug);
    if (mockDeal?.productUrl) {
      record = { originalUrl: mockDeal.productUrl };
    }
  }

  // 5. If found, track click in database and immediately redirect to record.originalUrl with 307
  if (record && record.originalUrl) {
    const dest = normalizeDestination(record.originalUrl);

    // Save in fast cache
    setCachedShortUrl(slug, dest);

    // Real-time click tracking before redirecting
    let trackedInDb = false;
    if (isDatabaseConfigured()) {
      try {
        if (shortRecord) {
          await prisma.$transaction([
            prisma.shortLink.update({
              where: { id: shortRecord.id },
              data: { clickCount: { increment: 1 } },
            }),
            prisma.click.create({
              data: {
                shortLinkId: shortRecord.id,
                userId: shortRecord.userId || undefined,
                subId: shortRecord.subId || undefined,
                ipHash,
                userAgent: ua.slice(0, 300) || null,
                referer,
                deviceType: devType,
                isBot,
              },
            }),
          ]);
          trackedInDb = true;
        } else if (genRecord) {
          await prisma.$transaction([
            prisma.generatedLink.update({
              where: { id: genRecord.id },
              data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
            }),
            prisma.click.create({
              data: {
                linkId: genRecord.id,
                userId: genRecord.userId || undefined,
                storeId: genRecord.storeId || undefined,
                subId: genRecord.subId || undefined,
                ipHash,
                userAgent: ua.slice(0, 300) || null,
                referer,
                deviceType: devType,
                isBot,
              },
            }),
          ]);
          trackedInDb = true;
        } else if (dealRecord) {
          await prisma.$transaction([
            prisma.deal.update({
              where: { id: dealRecord.id },
              data: { clickCount: { increment: 1 } },
            }),
            prisma.click.create({
              data: {
                storeId: dealRecord.storeId,
                ipHash,
                userAgent: ua.slice(0, 300) || null,
                referer,
                deviceType: devType,
                isBot,
              },
            }),
          ]);
          trackedInDb = true;
        }
      } catch (trackErr) {
        console.warn("Click tracking error before redirect:", trackErr);
      }
    }

    if (!trackedInDb) {
      if (isShortLink) {
        incrementMockShortLinkClick(slug);
      } else {
        incrementMockLinkClick(slug);
      }
    }

    const response = NextResponse.redirect(dest, 307);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  // Not found
  return NextResponse.redirect(home, 302);
}
