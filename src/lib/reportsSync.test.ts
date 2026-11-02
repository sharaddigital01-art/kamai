import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatINR, safePaise, safeCommissionPaise } from "./money";
import {
  fetchCuelinksTransactions,
  syncCuelinksTransactions,
  resolveUserBySubId,
} from "./cuelinksSync";
import {
  createMockUser,
  saveMockShortLink,
  saveMockLink,
  getLiveTotalClicks,
  getLiveClicks,
  upsertMockConversion,
} from "./mockData";
import { GET as reportsGet, POST as reportsPost } from "@/app/api/reports/route";
import { GET as userStatsGet } from "@/app/api/user/stats/route";
import { GET as syncGet, POST as syncPost } from "@/app/api/sync/cuelinks/route";
import { GET as slugGet } from "@/app/[slug]/route";
import { GET as rCodeGet } from "@/app/r/[code]/route";
import { GET as userConfigGet } from "@/app/api/telegram/user-config/route";

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

  describe("4. Dynamic Date Range Filter & Metric Cards", () => {
    it("returns filtered stats for today, yesterday, 7d, 30d, all", async () => {
      const ranges = ["today", "yesterday", "7d", "30d", "all"] as const;
      for (const r of ranges) {
        const req = new Request(
          `http://localhost:3000/api/reports?userId=${testUserId}&subid=${testSubId}&range=${r}`
        );
        const res = await reportsGet(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.range).toBe(r);
        expect(json.stats).toBeDefined();
        expect(Array.isArray(json.dailyStats)).toBe(true);
        expect(json.dailyStats.length).toBeGreaterThan(0);
      }
    });

    it("correctly sums up 2 successful orders in totalTransactions instead of 0", async () => {
      // Create 2 mock conversion orders for testUserId
      upsertMockConversion({
        transactionId: "tx-order-001",
        storeName: "Flipkart",
        saleAmount: 2500,
        commission: 200,
        status: "confirmed",
        subid: `${testSubId}_tg`,
        userId: testUserId,
      });

      upsertMockConversion({
        transactionId: "tx-order-002",
        storeName: "Myntra",
        saleAmount: 1800,
        commission: 150,
        status: "confirmed",
        subid: `${testSubId}_tg`,
        userId: testUserId,
      });

      const req = new Request(
        `http://localhost:3000/api/reports?userId=${testUserId}&subid=${testSubId}&range=all`
      );
      const res = await reportsGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.stats.totalTransactions).toBeGreaterThanOrEqual(2);
    });

    it("computes convRate with exact 2 decimal places: ((total_orders / total_clicks) * 100).toFixed(2) + '%'", async () => {
      const req = new Request(
        `http://localhost:3000/api/reports?userId=${testUserId}&subid=${testSubId}&range=all`
      );
      const res = await reportsGet(req);
      const json = await res.json();
      const clicks = json.stats.totalClicks;
      const orders = json.stats.totalTransactions;
      const expectedConv =
        clicks > 0 ? `${((orders / clicks) * 100).toFixed(2)}%` : "0.0%";
      expect(json.stats.convRate).toBe(expectedConv);
    });

    it("parses currency strings properly so ₹27.83 and numeric strings do not evaluate to 0 or NaN", () => {
      expect(safePaise("₹27.83")).toBe(2783);
      expect(safePaise("27.83")).toBe(2783);
      expect(safePaise("2783")).toBe(2783);
      expect(safePaise(2783)).toBe(2783);
      expect(safeCommissionPaise("₹27.83")).toBe(2783);
      expect(safeCommissionPaise("27.83")).toBe(2783);
      expect(safeCommissionPaise(27.83)).toBe(2783);
      expect(formatINR(2783)).toBe("₹27.83");
      expect(formatINR("₹27.83")).toBe("₹27.83");
    });
  });

  describe("5. Multi-Account Cuelinks SubID Sync & Case-Insensitive Matching", () => {
    it("matches subId case-insensitively and with trimmed whitespace", async () => {
      // Test matching uppercase, lowercase, mixed case, and with spaces
      const resolvedExact = await resolveUserBySubId(testSubId);
      expect(resolvedExact).toBe(testUserId);

      const resolvedUpper = await resolveUserBySubId(testSubId.toUpperCase());
      expect(resolvedUpper).toBe(testUserId);

      const resolvedLower = await resolveUserBySubId(testSubId.toLowerCase());
      expect(resolvedLower).toBe(testUserId);

      const resolvedTrim = await resolveUserBySubId(`  ${testSubId}_tg  `);
      expect(resolvedTrim).toBe(testUserId);

      const resolvedStripped = await resolveUserBySubId(`${testSubId}_tg`);
      expect(resolvedStripped).toBe(testUserId);
    });

    it("/api/telegram/user-config returns distinct subId for each user account without sharing static fallback", async () => {
      const userA = "user-multi-a-" + Date.now();
      const userB = "user-multi-b-" + Date.now();
      createMockUser({
        id: userA,
        email: "usera@test.local",
        name: "User A",
        role: "USER",
        referralCode: "REFA123",
        subIdPrefix: "usra99",
      });
      createMockUser({
        id: userB,
        email: "userb@test.local",
        name: "User B",
        role: "USER",
        referralCode: "REFB456",
        subIdPrefix: "usrb88",
      });

      const reqA = new Request(`http://localhost:3000/api/telegram/user-config?userId=${userA}`);
      const resA = await userConfigGet(reqA);
      const jsonA = await resA.json();

      const reqB = new Request(`http://localhost:3000/api/telegram/user-config?userId=${userB}`);
      const resB = await userConfigGet(reqB);
      const jsonB = await resB.json();

      expect(jsonA.trackingSubId).toBe("usra99_tg");
      expect(jsonB.trackingSubId).toBe("usrb88_tg");
      expect(jsonA.trackingSubId).not.toBe(jsonB.trackingSubId);
      expect(jsonA.trackingSubId).not.toBe("ek_tg");
      expect(jsonB.trackingSubId).not.toBe("ek_tg");
    });
  });
});
