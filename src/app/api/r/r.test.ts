import { describe, expect, it, beforeEach, vi } from "vitest";
import { GET as rGet, POST as rPost } from "./route";
import { NextRequest } from "next/server";
import {
  getLiveClicks,
  getLiveTotalClicks,
  findMockUserById,
} from "@/lib/mockData";

describe("Open Redirect & Click Logging Endpoint: /api/r", () => {
  const testUserId = "user-r-test-112233";
  const testSubId = "dgu4Ci_tg";

  beforeEach(() => {
    vi.restoreAllMocks();

    const g = globalThis as any;
    if (!g.mockUsers) g.mockUsers = new Map();
    g.mockUsers.set(testUserId, {
      id: testUserId,
      email: "rtest@example.com",
      name: "R Test Partner",
      role: "USER",
      subIdPrefix: "dgu4Ci",
      referralCode: "DGU4CI",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("redirects immediately (302) to affiliate URL and logs click asynchronously with subId", async () => {
    const initialClicks = getLiveTotalClicks();
    const destination = "https://www.flipkart.com/product-deal-12345?affid=test";

    const req = new NextRequest(
      `http://localhost:3000/api/r?url=${encodeURIComponent(destination)}&subid=${testSubId}`
    );

    const res = await rGet(req);

    // Verify 302 redirect
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(destination);
    expect(res.headers.get("cache-control")).toContain("no-store");

    // Allow async microtask promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Verify click was registered
    const totalClicksAfter = getLiveTotalClicks();
    expect(totalClicksAfter).toBeGreaterThanOrEqual(initialClicks + 1);

    const clicks = getLiveClicks();
    const matchedClick = clicks.find((c) => c.subId === testSubId);
    expect(matchedClick).toBeDefined();
    expect(matchedClick?.userId).toBe(testUserId);
    expect(matchedClick?.store).toBe("Flipkart");
  });

  it("supports POST and handles raw unencoded or double-encoded target URLs", async () => {
    const destination = "https://www.amazon.in/dp/B08N5WRWNW";
    const encoded = encodeURIComponent(destination);

    const req = new NextRequest(
      `http://localhost:3000/api/r?url=${encoded}&subid=tg_amazon_user`
    );

    const res = await rPost(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(destination);
  });

  it("redirects safely to home if url parameter is missing or non-web scheme", async () => {
    const reqMissing = new NextRequest("http://localhost:3000/api/r");
    const resMissing = await rGet(reqMissing);
    expect(resMissing.status).toBe(302);
    expect(resMissing.headers.get("location")).toContain("/");

    const reqBad = new NextRequest("http://localhost:3000/api/r?url=javascript:alert(1)");
    const resBad = await rGet(reqBad);
    expect(resBad.status).toBe(302);
    expect(resBad.headers.get("location")).toContain("/");
  });
});
