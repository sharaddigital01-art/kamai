import { createHash } from "node:crypto";
import { NextResponse, after, type NextRequest } from "next/server";
import { getCachedLink, setCachedLink, type CachedLink } from "@/lib/linkCache";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, getMockLinkByCode, incrementMockLinkClick } from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests|headless/i;

function deviceType(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Daily-rotating salt: we can de-duplicate within a day but can't track a person across days. */
function hashIp(ip: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${process.env.CLICK_HASH_SECRET ?? "dev"}:${day}:${ip}`).digest("hex");
}

export interface ExtendedCachedLink extends CachedLink {
  subId?: string | null;
}

async function resolveLink(code: string): Promise<ExtendedCachedLink | null> {
  const hit = getCachedLink(code) as ExtendedCachedLink | null;
  if (hit) return hit;

  const mock = getMockLinkByCode(code);
  if (mock) {
    const row: ExtendedCachedLink = {
      id: mock.id,
      userId: mock.userId,
      storeId: mock.storeId,
      dealId: mock.dealId,
      destinationUrl: mock.destinationUrl,
      subId: (mock as any).subId || null,
    };
    setCachedLink(code, row);
    return row;
  }

  if (!isDatabaseConfigured()) return null;

  try {
    const row = await prisma.generatedLink.findUnique({
      where: { code },
      select: {
        id: true,
        userId: true,
        storeId: true,
        dealId: true,
        destinationUrl: true,
        subId: true,
      },
    });
    if (row) setCachedLink(code, row as any);
    return row;
  } catch (err) {
    console.warn("Database error in resolveLink:", err);
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const home = new URL("/?link=not-found", req.url);
  if (!/^[0-9A-Za-z]{6,12}$/.test(code)) return NextResponse.redirect(home, 302);

  const link = await resolveLink(code);
  if (!link) return NextResponse.redirect(home, 302);

  // Defence in depth: the destination was built from an allow-listed host, but re-check the scheme.
  let dest: URL;
  try {
    dest = new URL(link.destinationUrl);
    if (dest.protocol !== "https:") throw new Error("non-https");
  } catch {
    return NextResponse.redirect(home, 302);
  }

  const ua = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const referer = req.headers.get("referer")?.slice(0, 300) ?? null;
  const isBot = !ua || BOT_RE.test(ua);
  const clickedAt = new Date();
  const ipHash = hashIp(ip);
  const devType = deviceType(ua);

  // Record live click row in database immediately before redirecting
  if (isDatabaseConfigured()) {
    try {
      await prisma.$transaction([
        prisma.click.create({
          data: {
            linkId: link.id,
            userId: link.userId || undefined,
            subId: link.subId || undefined,
            storeId: link.storeId || undefined,
            ipHash,
            userAgent: ua.slice(0, 300) || null,
            referer,
            deviceType: devType,
            isBot,
            createdAt: clickedAt,
          },
        }),
        ...(isBot
          ? []
          : [
              prisma.generatedLink.update({
                where: { id: link.id },
                data: { clickCount: { increment: 1 }, lastClickedAt: clickedAt },
              }),
              ...(link.dealId
                ? [
                    prisma.deal.update({
                      where: { id: link.dealId },
                      data: { clickCount: { increment: 1 } },
                    }),
                  ]
                : []),
            ]),
      ]);
    } catch (e) {
      console.warn("Live click tracking failed in /r/[code]:", e);
    }
  }

  // Always sync live click into mock tracker for real-time local display
  incrementMockLinkClick(code, link.userId, link.subId);

  return NextResponse.redirect(dest, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
    },
  });
}
