import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadAffiliateConfig, shortUrlFor } from "@/lib/affiliateConfig";
import { getApiUser } from "@/lib/auth";
import { buildAffiliateUrl, makeSubId, parseProductUrlAsync, type LinkErrorCode } from "@/lib/linkConverter";
import { estimateProfitPaise } from "@/lib/profit";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { randomCode } from "@/lib/shortcode";
import { isDatabaseConfigured, MOCK_STORES, MOCK_DEALS, saveMockLink, getMockLinks, type MockLink } from "@/lib/mockData";

export const runtime = "nodejs";

const Body = z.object({ url: z.string().min(1).max(4000), dealId: z.uuid().optional() });

const fail = (status: number, code: string, message: string, headers?: Record<string, string>) =>
  NextResponse.json({ error: { code, message } }, { status, headers });

const STATUS_FOR: Partial<Record<LinkErrorCode, number>> = { STORE_NOT_CONFIGURED: 503 };

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return fail(401, "UNAUTHENTICATED", "Log in to make profit links.");

  const rl = rateLimit(`links:${user.id}`, 30, 60_000);
  if (!rl.ok) return fail(429, "RATE_LIMITED", "Too many links. Try again shortly.", { "Retry-After": String(rl.retryAfterSec) });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return fail(400, "BAD_REQUEST", "Send JSON like { url: string }.");
  }

  const parsed = await parseProductUrlAsync(body.url);
  if (!parsed.ok) return fail(STATUS_FOR[parsed.code] ?? 422, parsed.code, parsed.message);

  const urlHash = createHash("sha256").update(parsed.canonicalUrl).digest("hex");
  const config = loadAffiliateConfig();

  // If database is not configured, generate link using mock data & in-memory cache
  if (!isDatabaseConfigured()) {
    const store = MOCK_STORES.find((s) => s.slug === parsed.store);
    if (!store || store.status !== "ACTIVE") return fail(422, "UNSUPPORTED_STORE", `${parsed.storeName} is paused right now.`);
    const deal = body.dealId ? MOCK_DEALS.find((d) => d.id === body.dealId) : null;

    const existing = getMockLinks(user.id).find((l) => l.urlHash === urlHash);
    if (existing) {
      return NextResponse.json({
        link: {
          code: existing.code,
          shortUrl: shortUrlFor(existing.code),
          store: { slug: store.slug, name: store.name },
          canonicalUrl: parsed.canonicalUrl,
          createdAt: existing.createdAt.toISOString(),
          clickCount: existing.clickCount,
        },
        estimatedProfitPaise: deal ? estimateProfitPaise(deal.pricePaise, store) : null,
      });
    }

    const code = randomCode(8);
    const built = buildAffiliateUrl(parsed, makeSubId(user.subIdPrefix, code), config);
    if (!built.ok) return fail(STATUS_FOR[built.code] ?? 422, built.code, built.message);

    const mockLink: MockLink = {
      id: "mock-link-" + Date.now(),
      userId: user.id,
      storeId: store.id,
      dealId: deal?.id ?? null,
      code,
      subId: built.subId,
      originalUrl: parsed.originalUrl,
      canonicalUrl: parsed.canonicalUrl,
      urlHash,
      destinationUrl: built.destinationUrl,
      clickCount: 0,
      lastClickedAt: null,
      createdAt: new Date(),
      store: { name: store.name, slug: store.slug },
      deal: deal ? { title: deal.title } : null,
    };
    saveMockLink(mockLink);

    return NextResponse.json(
      {
        link: {
          code: mockLink.code,
          shortUrl: shortUrlFor(mockLink.code),
          store: { slug: store.slug, name: store.name },
          canonicalUrl: parsed.canonicalUrl,
          createdAt: mockLink.createdAt.toISOString(),
          clickCount: mockLink.clickCount,
        },
        estimatedProfitPaise: deal ? estimateProfitPaise(deal.pricePaise, store) : null,
      },
      { status: 201 },
    );
  }

  try {
    const store = await prisma.partnerStore.findUnique({ where: { slug: parsed.store } });
    if (!store || store.status !== "ACTIVE") return fail(422, "UNSUPPORTED_STORE", `${parsed.storeName} is paused right now.`);

    const deal = body.dealId ? await prisma.deal.findUnique({ where: { id: body.dealId }, select: { id: true, pricePaise: true } }) : null;

    const respond = (link: { code: string; createdAt: Date; clickCount: number }, created: boolean) =>
      NextResponse.json(
        {
          link: {
            code: link.code,
            shortUrl: shortUrlFor(link.code),
            store: { slug: store.slug, name: store.name },
            canonicalUrl: parsed.canonicalUrl,
            createdAt: link.createdAt.toISOString(),
            clickCount: link.clickCount,
          },
          estimatedProfitPaise: deal ? estimateProfitPaise(deal.pricePaise, store) : null,
        },
        { status: created ? 201 : 200 },
      );

    // Idempotent: same user + same product → same short link.
    const existing = await prisma.generatedLink.findUnique({ where: { userId_urlHash: { userId: user.id, urlHash } } });
    if (existing) return respond(existing, false);

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(8);
      const built = buildAffiliateUrl(parsed, makeSubId(user.subIdPrefix, code), config);
      if (!built.ok) return fail(STATUS_FOR[built.code] ?? 422, built.code, built.message);

      try {
        const link = await prisma.generatedLink.create({
          data: {
            userId: user.id,
            storeId: store.id,
            dealId: deal?.id ?? null,
            code,
            subId: built.subId,
            originalUrl: parsed.originalUrl,
            canonicalUrl: parsed.canonicalUrl,
            urlHash,
            destinationUrl: built.destinationUrl,
          },
        });
        if (deal) void prisma.deal.update({ where: { id: deal.id }, data: { shareCount: { increment: 1 } } }).catch(() => undefined);
        return respond(link, true);
      } catch (e) {
        if ((e as { code?: string }).code !== "P2002") throw e;
        const raced = await prisma.generatedLink.findUnique({ where: { userId_urlHash: { userId: user.id, urlHash } } });
        if (raced) return respond(raced, false);
      }
    }
    return fail(500, "CODE_COLLISION", "Couldn't allocate a short link. Please retry.");
  } catch (err) {
    console.warn("Database error in links route, falling back to mock link:", err);
    const store = MOCK_STORES.find((s) => s.slug === parsed.store) ?? MOCK_STORES[0]!;
    const code = randomCode(8);
    const built = buildAffiliateUrl(parsed, makeSubId(user.subIdPrefix, code), config);
    if (!built.ok) return fail(STATUS_FOR[built.code] ?? 422, built.code, built.message);

    const mockLink: MockLink = {
      id: "mock-link-" + Date.now(),
      userId: user.id,
      storeId: store.id,
      dealId: null,
      code,
      subId: built.subId,
      originalUrl: parsed.originalUrl,
      canonicalUrl: parsed.canonicalUrl,
      urlHash,
      destinationUrl: built.destinationUrl,
      clickCount: 0,
      lastClickedAt: null,
      createdAt: new Date(),
      store: { name: store.name, slug: store.slug },
      deal: null,
    };
    saveMockLink(mockLink);

    return NextResponse.json(
      {
        link: {
          code: mockLink.code,
          shortUrl: shortUrlFor(mockLink.code),
          store: { slug: store.slug, name: store.name },
          canonicalUrl: parsed.canonicalUrl,
          createdAt: mockLink.createdAt.toISOString(),
          clickCount: mockLink.clickCount,
        },
        estimatedProfitPaise: null,
      },
      { status: 201 },
    );
  }
}
