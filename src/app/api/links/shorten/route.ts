import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateShortSlug } from "@/lib/shortcode";
import { setCachedShortUrl } from "@/lib/linkCache";
import {
  isDatabaseConfigured,
  saveMockShortLink,
  getMockShortLinkBySlug,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ShortenSchema = z.object({
  originalUrl: z.string().trim().min(1, "originalUrl is required"),
  userId: z.string().trim().optional(),
  slug: z.string().trim().min(3).max(32).optional(),
});

function normalizeTargetUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = ShortenSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { originalUrl: rawUrl, userId: directUserId, slug: customSlug } = parseResult.data;
    const originalUrl = normalizeTargetUrl(rawUrl);

    // Validate URL syntax
    try {
      new URL(originalUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format. Please provide a valid web URL." },
        { status: 400 }
      );
    }

    // Resolve userId: directUserId or authenticated session user
    const sessionUser = await getApiUser().catch(() => null);
    const candidateUserId = directUserId || sessionUser?.id || null;

    // Check if candidateUserId is a valid UUID and exists in DB
    let validUserId: string | null = null;
    if (candidateUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateUserId)) {
      if (isDatabaseConfigured()) {
        try {
          const userExists = await prisma.user.findUnique({
            where: { id: candidateUserId },
            select: { id: true },
          });
          if (userExists) validUserId = userExists.id;
        } catch {}
      } else {
        validUserId = candidateUserId;
      }
    }

    // Generate or use custom 6-character slug
    let slug = customSlug || "";
    if (!slug) {
      // Generate unique 6-character slug
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateShortSlug(6);
        let exists = false;

        if (isDatabaseConfigured()) {
          try {
            const found = await prisma.shortLink.findUnique({
              where: { slug: candidate },
              select: { id: true },
            });
            if (found) exists = true;
          } catch {
            // DB fallback
          }
        }

        if (!exists && getMockShortLinkBySlug(candidate)) {
          exists = true;
        }

        if (!exists) {
          slug = candidate;
          break;
        }
      }

      if (!slug) {
        slug = generateShortSlug(7);
      }
    }

    let savedRecord: any = null;

    if (isDatabaseConfigured()) {
      try {
        savedRecord = await prisma.shortLink.create({
          data: {
            slug,
            originalUrl,
            targetUrl: originalUrl,
            userId: validUserId,
          },
        });
      } catch (dbErr: any) {
        // If unique constraint violated on custom slug
        if (dbErr?.code === "P2002") {
          return NextResponse.json(
            { error: `Slug '${slug}' is already in use. Please choose another or omit to generate automatically.` },
            { status: 409 }
          );
        }
        console.warn("Database error saving short link, falling back to in-memory store:", dbErr);
      }
    }

    if (!savedRecord) {
      savedRecord = saveMockShortLink({
        slug,
        originalUrl,
        targetUrl: originalUrl,
        userId: validUserId,
      });
    }

    // Pre-populate fast memory cache
    setCachedShortUrl(slug, originalUrl);

    const shortUrl = `https://kamaikaro.in/${slug}`;

    return NextResponse.json(
      {
        success: true,
        shortUrl,
        slug,
        originalUrl,
        targetUrl: originalUrl,
        userId: validUserId,
        id: savedRecord.id,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Shorten API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error shortening URL." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim();
    const userId = searchParams.get("userId")?.trim();

    if (slug) {
      let found: any = null;
      if (isDatabaseConfigured()) {
        try {
          found = await prisma.shortLink.findUnique({ where: { slug } });
        } catch {
          // fallback
        }
      }
      if (!found) {
        found = getMockShortLinkBySlug(slug);
      }

      if (!found) {
        return NextResponse.json({ error: "Short link not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        slug: found.slug,
        targetUrl: found.targetUrl,
        shortUrl: `https://kamaikaro.in/${found.slug}`,
        clickCount: found.clickCount,
        createdAt: found.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: "POST /api/links/shorten with { originalUrl, userId? } to create short links.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
