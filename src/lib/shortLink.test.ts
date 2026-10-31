import { describe, it, expect, beforeAll } from "vitest";
import { POST as shortenPost, GET as shortenGet } from "@/app/api/links/shorten/route";
import { GET as slugRedirectGet } from "@/app/[slug]/route";
import { NextRequest } from "next/server";
import {
  saveMockShortLink,
  getMockShortLinkBySlug,
  saveMockTelegramConfig,
  getMockTelegramConfigByUserId,
} from "./mockData";
import { generateShortSlug } from "./shortcode";

describe("Custom URL Shortener & Dynamic Slug Redirects", () => {
  it("generates a 6-character short slug", () => {
    const slug = generateShortSlug(6);
    expect(slug).toHaveLength(6);
    expect(/^[0-9a-zA-Z]{6}$/.test(slug)).toBe(true);
  });

  it("POST /api/links/shorten creates a short link and returns shortUrl format", async () => {
    const originalUrl = "https://www.flipkart.com/apple-iphone-15/p/itm123456";
    const req = new NextRequest("http://localhost:3000/api/links/shorten", {
      method: "POST",
      body: JSON.stringify({
        originalUrl,
        userId: "test-user-shortener",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await shortenPost(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.slug).toBeDefined();
    expect(data.slug.length).toBeGreaterThanOrEqual(6);
    expect(data.shortUrl).toBe(`https://kamaikaro.in/${data.slug}`);
    expect(data.targetUrl).toBe(originalUrl);

    // Verify it is retrievable
    const saved = getMockShortLinkBySlug(data.slug);
    expect(saved).not.toBeNull();
    expect(saved?.targetUrl).toBe(originalUrl);
  });

  it("GET /[slug] performs an immediate 307 redirect to target URL", async () => {
    const testSlug = "tgt307";
    const targetUrl = "https://www.amazon.in/dp/B0CX234XYZ?tag=kamaikaro-21";
    saveMockShortLink({
      slug: testSlug,
      originalUrl: targetUrl,
      targetUrl,
      userId: "test-user-307",
    });

    const req = new NextRequest(`http://localhost:3000/${testSlug}`);
    const res = await slugRedirectGet(req, {
      params: Promise.resolve({ slug: testSlug }),
    });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(targetUrl);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("GET /[slug] increments click count on short link before redirecting", async () => {
    const testSlug = "clktest";
    const targetUrl = "https://www.flipkart.com/item/xyz";
    const link = saveMockShortLink({
      slug: testSlug,
      originalUrl: targetUrl,
      targetUrl,
      userId: "test-user-clk",
    });
    const initialClicks = link.clickCount || 0;

    const req = new NextRequest(`http://localhost:3000/${testSlug}`, {
      headers: { "user-agent": "Mozilla/5.0" },
    });
    const res = await slugRedirectGet(req, {
      params: Promise.resolve({ slug: testSlug }),
    });

    expect(res.status).toBe(307);
    const updated = getMockShortLinkBySlug(testSlug);
    expect(updated?.clickCount).toBe(initialClicks + 1);
  });

  it("GET /[slug] strips leading and trailing slashes from params.slug", async () => {
    const testSlug = "slashdeal";
    const targetUrl = "https://www.ajio.com/s/shoes-deal";
    saveMockShortLink({
      slug: testSlug,
      originalUrl: targetUrl,
      targetUrl,
    });

    const req = new NextRequest(`http://localhost:3000//${testSlug}/`);
    const res = await slugRedirectGet(req, {
      params: Promise.resolve({ slug: `//${testSlug}//` }),
    });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(targetUrl);
  });

  it("POST /api/links/shorten handles anonymous creation without userId", async () => {
    const originalUrl = "https://www.myntra.com/sale/deal123";
    const req = new NextRequest("http://localhost:3000/api/links/shorten", {
      method: "POST",
      body: JSON.stringify({
        originalUrl,
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await shortenPost(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.slug).toBeDefined();
    expect(data.shortUrl).toBe(`https://kamaikaro.in/${data.slug}`);
    expect(data.userId).toBeNull();
  });

  it("GET /[slug] redirects unknown slugs to home with link=not-found", async () => {
    const nonExistentSlug = "nonexistent999";
    const req = new NextRequest(`http://localhost:3000/${nonExistentSlug}`);
    const res = await slugRedirectGet(req, {
      params: Promise.resolve({ slug: nonExistentSlug }),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/?link=not-found");
  });

  it("GET /[slug] does not hijack reserved application slugs like login or api", async () => {
    const req = new NextRequest("http://localhost:3000/login");
    const res = await slugRedirectGet(req, {
      params: Promise.resolve({ slug: "login" }),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });
});

describe("Default Source Channels Initialization", () => {
  it("initializes sourceChannels as empty array by default for new accounts", () => {
    const newUserId = "user-new-channels-" + Date.now();
    const config = saveMockTelegramConfig({
      userId: newUserId,
      telegramUserId: "555666777",
      targetChannelId: "@my_channel",
      // Not providing sourceChannels
    });

    expect(config.sourceChannels).toEqual([]);
    expect(config.sourceChannels.length).toBe(0);
  });
});
