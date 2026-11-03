import { createHash } from "node:crypto";
import { NextResponse, after, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUserBySubId } from "@/lib/cuelinksSync";
import { isDatabaseConfigured, recordMockClick } from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function handleRedirect(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Extract destination URL from query parameters
  const rawUrl =
    searchParams.get("url") ||
    searchParams.get("u") ||
    searchParams.get("target") ||
    searchParams.get("dest") ||
    searchParams.get("link") ||
    searchParams.get("destination");

  // Extract tracking subId
  const rawSubId =
    searchParams.get("subid") ||
    searchParams.get("subId") ||
    searchParams.get("sub_id") ||
    searchParams.get("s");

  const home = new URL("/", req.url);

  if (!rawUrl || !rawUrl.trim()) {
    return NextResponse.redirect(home, 302);
  }

  let targetUrl = rawUrl.trim();
  // Safe decode if double-encoded
  try {
    if (targetUrl.includes("%3A") || targetUrl.includes("%2F")) {
      targetUrl = decodeURIComponent(targetUrl);
    }
  } catch {}

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  // Validate scheme
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.redirect(home, 302);
    }
  } catch {
    return NextResponse.redirect(home, 302);
  }

  const cleanSub = (rawSubId || "").trim();
  const ua = req.headers.get("user-agent") ?? "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const referer = req.headers.get("referer")?.slice(0, 300) ?? null;
  const isBot = !ua || BOT_RE.test(ua);
  const clickedAt = new Date();
  const ipHash = hashIp(ip);
  const devType = deviceType(ua);

  // Asynchronous background click logging (non-blocking)
  const logClickPromise = (async () => {
    try {
      let resolvedUserId: string | null = null;
      if (cleanSub) {
        resolvedUserId = await resolveUserBySubId(cleanSub).catch(() => null);
      }

      if (isDatabaseConfigured()) {
        try {
          await prisma.click.create({
            data: {
              userId: resolvedUserId || undefined,
              subId: cleanSub || undefined,
              ipHash,
              userAgent: ua.slice(0, 300) || null,
              referer,
              deviceType: devType,
              isBot,
              createdAt: clickedAt,
            },
          });
        } catch (dbErr) {
          console.warn("Async prisma.click.create error in /api/r:", dbErr);
        }
      }

      // Record in mock tracking store for instant in-memory reporting
      recordMockClick(resolvedUserId, cleanSub, targetUrl);
    } catch (err) {
      console.warn("Async click logging error in /api/r:", err);
    }
  })();

  // Keep background task alive in serverless/edge environments
  try {
    if (typeof after === "function") {
      after(logClickPromise);
    } else {
      logClickPromise.catch(() => {});
    }
  } catch {
    // In test runners or non-Next.js request scope contexts, after() throws
    logClickPromise.catch(() => {});
  }

  // Return HTTP 302 redirect immediately without blocking
  return NextResponse.redirect(targetUrl, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}

export async function GET(req: NextRequest) {
  return handleRedirect(req);
}

export async function POST(req: NextRequest) {
  return handleRedirect(req);
}
