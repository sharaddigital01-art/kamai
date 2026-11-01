import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchCuelinksTransactions,
  syncCuelinksTransactions,
} from "./cuelinksSync";
import {
  createMockUser,
  saveMockShortLink,
  saveMockLink,
  getLiveTotalClicks,
  getLiveClicks,
} from "./mockData";
import { GET as reportsGet, POST as reportsPost } from "@/app/api/reports/route";
import { GET as userStatsGet } from "@/app/api/user/stats/route";
import { GET as syncGet, POST as syncPost } from "@/app/api/sync/cuelinks/route";
import { GET as slugGet } from "@/app/[slug]/route";
import { GET as rCodeGet } from "@/app/r/[code]/route";

describe("SubId Stats Fetching & Instant Click Tracking", () => {
  const testUserId = "user-subid-test-" + Date.now();
  const testSubId = "tgsub_" + Math.floor(1000 + Math.random() * 9000);

  beforeEach(() => {
    createMockUser({
      id: testUserId,
      email: "subiduser@kamaikaro.test",
      name: "SubID Test User",
      role: "USER",
      referralCode: "REF" + testSubId,
      subIdPrefix: testSubId,
    });
  });

  describe("1. External Affiliate Sync strictly by Active SubId", () => {
    it("constructs Cuelinks URL with user's exact subId and no static master subId", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (url: any) => {
        const urlStr = String(url);
        expect(urlStr).toContain(`subid=${encodeURIComponent(testSubId)}`);
        expect(urlStr).not.toContain("subid=master");
        expect(urlStr).not.toContain("subid=static");
        return new Response(
          JSON.stringify([
            {
              transaction_id: "tx-subid-101",
              store_name: "Amazon India",
              sale_amount: 1500,
              commission: 120,
              status: "approved",
              subid: testSubId,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const txs = await fetchCuelinksTransactions({
        subId: testSubId,
        channelId: "332862",
      });

      expect(txs.length).toBe(1);
      expect(txs[0]?.subid).toBe(testSubId);
      fetchSpy.mockRestore();
    });

    it("/api/sync/cuelinks queries external affiliate stats strictly using active subId", async () => {
      const req = new Request(
        `http://localhost:3000/api/sync/cuelinks?userId=${testUserId}&subid=${testSubId}&channel_id=332862`
      );
      const res = await syncGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.activeSubId).toBe(testSubId);
      expect(res.headers.get("cache-control")).toContain("no-store");
    });

    it("/api/reports and /api/user/stats return activeSubId and user-specific stats without caching", async () => {
      const repReq = new Request(
        `http://localhost:3000/api/reports?userId=${testUserId}&subid=${testSubId}`
      );
      const repRes = await reportsGet(repReq);
      expect(repRes.status).toBe(200);
      const repJson = await repRes.json();
      expect(repJson.authenticated).toBe(true);
      expect(repJson.activeSubId).toBe(testSubId);
      expect(repJson.stats).toBeDefined();
      expect(repRes.headers.get("cache-control")).toContain("no-store");

      const userStatsReq = new Request(
        `http://localhost:3000/api/user/stats?userId=${testUserId}&subid=${testSubId}`
      );
      const userStatsRes = await userStatsGet(userStatsReq);
      expect(userStatsRes.status).toBe(200);
      const userStatsJson = await userStatsRes.json();
      expect(userStatsJson.activeSubId).toBe(testSubId);
      expect(userStatsRes.headers.get("cache-control")).toContain("no-store");
    });
  });

  describe("2. Internal Live Click Logging (Instant Metrics)", () => {
    it("immediately logs live click on short link redirect before store redirect", async () => {
      const testSlug = "slug" + Math.floor(1000 + Math.random() * 9000);
      saveMockShortLink({
        slug: testSlug,
        originalUrl: "https://www.flipkart.com/deal-item",
        targetUrl: "https://www.flipkart.com/deal-item",
        userId: testUserId,
        subId: testSubId,
      });

      const initialTotalClicks = getLiveTotalClicks(testUserId);

      const req = new Request(`http://localhost:3000/${testSlug}`) as any;
      const res = await slugGet(req, {
        params: Promise.resolve({ slug: testSlug }),
      });

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://www.flipkart.com/deal-item");
      expect(res.headers.get("cache-control")).toContain("no-store");

      // Verify live clicks immediately incremented
      const updatedTotalClicks = getLiveTotalClicks(testUserId);
      expect(updatedTotalClicks).toBeGreaterThan(initialTotalClicks);

      const recent = getLiveClicks(testUserId);
      const matchingClick = recent.find((c) => c.code === testSlug);
      expect(matchingClick).toBeDefined();
      expect(matchingClick?.userId).toBe(testUserId);
    });

    it("immediately logs live click on /r/[code] converted affiliate link before redirecting", async () => {
      const testCode = "code" + Math.floor(1000 + Math.random() * 9000);
      saveMockLink({
        id: "link-" + testCode,
        code: testCode,
        userId: testUserId,
        storeId: "store-flipkart",
        dealId: null,
        subId: `${testSubId}_link`,
        originalUrl: "https://www.flipkart.com/sample-product",
        canonicalUrl: "https://www.flipkart.com/sample-product",
        urlHash: "hash-" + testCode,
        destinationUrl: "https://www.flipkart.com/sample-product?affid=cuelinks",
        clickCount: 0,
        lastClickedAt: null,
        createdAt: new Date(),
        store: { name: "Flipkart", slug: "flipkart" },
      });

      const initialClicks = getLiveTotalClicks(testUserId);

      const req = new Request(`http://localhost:3000/r/${testCode}`) as any;
      const res = await rCodeGet(req, {
        params: Promise.resolve({ code: testCode }),
      });

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("https://www.flipkart.com/sample-product?affid=cuelinks");
      expect(res.headers.get("cache-control")).toContain("no-store");

      const afterClicks = getLiveTotalClicks(testUserId);
      expect(afterClicks).toBeGreaterThan(initialClicks);
    });
  });

  describe("3. Refresh Sync Button cache-bypassing", () => {
    it("handles cache-busting timestamp parameter and returns fresh data", async () => {
      const timestamp = Date.now();
      const req = new Request(
        `http://localhost:3000/api/reports?userId=${testUserId}&subid=${testSubId}&_t=${timestamp}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }
      );

      const res = await reportsGet(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toContain("no-store");
      expect(res.headers.get("pragma")).toBe("no-cache");
      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.activeSubId).toBe(testSubId);
    });
  });
});
