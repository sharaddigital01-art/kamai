import { describe, it, expect, beforeEach } from "vitest";
import {
  slugifyStore,
  normalizeConversionStatus,
  resolveUserBySubId,
  syncCuelinksTransactions,
  RawCuelinksTransaction,
} from "./cuelinksSync";
import {
  createMockUser,
  getUserBalances,
  getMockConversions,
  DEMO_USER,
} from "./mockData";

describe("Cuelinks Conversion Sync Engine", () => {
  const testUserId = "user-conv-" + Date.now();
  const testSubIdPrefix = "SYNC" + Math.floor(1000 + Math.random() * 9000);
  const testReferralCode = "REF" + Math.floor(1000 + Math.random() * 9000);

  beforeEach(() => {
    createMockUser({
      id: testUserId,
      email: "syncuser@earnkaro.test",
      name: "Sync Test User",
      role: "USER",
      referralCode: testReferralCode,
      subIdPrefix: testSubIdPrefix,
    });
  });

  describe("slugifyStore", () => {
    it("normalizes known brand names accurately", () => {
      expect(slugifyStore("Flipkart India")).toBe("flipkart");
      expect(slugifyStore("Amazon.in Online Store")).toBe("amazon");
      expect(slugifyStore("Myntra Design Pvt Ltd")).toBe("myntra");
      expect(slugifyStore("Ajio Fashion")).toBe("ajio");
      expect(slugifyStore("Shopsy Wholesale")).toBe("shopsy");
      expect(slugifyStore("Nykaa E-retail")).toBe("nykaa");
      expect(slugifyStore("TataCLiQ Store")).toBe("tatacliq");
    });

    it("handles generic fallback cleanly", () => {
      expect(slugifyStore("Unknown Brand XYZ")).toBe("unknownbrandxyz");
      expect(slugifyStore("")).toBe("general");
    });
  });

  describe("normalizeConversionStatus", () => {
    it("maps confirmed / approved statuses correctly", () => {
      expect(normalizeConversionStatus("approved")).toBe("confirmed");
      expect(normalizeConversionStatus("CONFIRMED")).toBe("confirmed");
      expect(normalizeConversionStatus("validated")).toBe("confirmed");
      expect(normalizeConversionStatus("paid")).toBe("confirmed");
      expect(normalizeConversionStatus("1")).toBe("confirmed");
    });

    it("maps rejected / cancelled statuses correctly", () => {
      expect(normalizeConversionStatus("rejected")).toBe("rejected");
      expect(normalizeConversionStatus("cancelled")).toBe("rejected");
      expect(normalizeConversionStatus("declined")).toBe("rejected");
      expect(normalizeConversionStatus("failed")).toBe("rejected");
      expect(normalizeConversionStatus("2")).toBe("rejected");
    });

    it("defaults to pending for unrecognized or null statuses", () => {
      expect(normalizeConversionStatus("pending")).toBe("pending");
      expect(normalizeConversionStatus("open")).toBe("pending");
      expect(normalizeConversionStatus(null)).toBe("pending");
      expect(normalizeConversionStatus(undefined)).toBe("pending");
    });
  });

  describe("resolveUserBySubId", () => {
    it("resolves user by subIdPrefix", async () => {
      const resolved = await resolveUserBySubId(testSubIdPrefix);
      expect(resolved).toBe(testUserId);
    });

    it("resolves user by referralCode", async () => {
      const resolved = await resolveUserBySubId(testReferralCode);
      expect(resolved).toBe(testUserId);
    });

    it("resolves user with telegram suffix", async () => {
      const resolved = await resolveUserBySubId(`${testSubIdPrefix}_tg`);
      expect(resolved).toBe(testUserId);
    });

    it("returns null or fallback for unknown subids", async () => {
      const resolved = await resolveUserBySubId("non_existent_subid_xyz");
      expect(resolved).toBeNull();
    });
  });

  describe("syncCuelinksTransactions", () => {
    it("correctly syncs pending and confirmed transactions with 70% commission split", async () => {
      const initialBalances = getUserBalances(testUserId);
      const initialAvailable = initialBalances.available;
      const initialPending = initialBalances.pending;

      const mockBatch: RawCuelinksTransaction[] = [
        {
          transaction_id: "tx-test-conf-1",
          store_name: "Flipkart",
          sale_amount: 1000,
          commission: 100, // ₹100 total commission
          status: "approved",
          subid: testSubIdPrefix,
        },
        {
          transaction_id: "tx-test-pend-1",
          store_name: "Amazon",
          sale_amount: 2000,
          commission: 200, // ₹200 total commission
          status: "pending",
          subid: testSubIdPrefix,
        },
      ];

      const { stats, results } = await syncCuelinksTransactions(mockBatch, {
        userCommissionPercent: 70,
      });

      expect(stats.totalFetched).toBe(2);
      expect(stats.synced).toBe(2);
      expect(stats.skipped).toBe(0);
      expect(results.length).toBe(2);

      // Verify User Balances
      // ₹100 commission * 70% = ₹70 = 7000 paise confirmed
      // ₹200 commission * 70% = ₹140 = 14000 paise pending
      const updatedBalances = getUserBalances(testUserId);
      expect(updatedBalances.available - initialAvailable).toBe(7000);
      expect(updatedBalances.pending - initialPending).toBe(14000);

      // Verify recorded conversions
      const userConversions = getMockConversions(testUserId);
      const confConv = userConversions.find((c) => c.transactionId === "tx-test-conf-1");
      const pendConv = userConversions.find((c) => c.transactionId === "tx-test-pend-1");

      expect(confConv).toBeDefined();
      expect(confConv?.status).toBe("confirmed");
      expect(confConv?.storeName).toBe("Flipkart");
      expect(confConv?.commission).toBe(100);

      expect(pendConv).toBeDefined();
      expect(pendConv?.status).toBe("pending");
      expect(pendConv?.storeName).toBe("Amazon");
      expect(pendConv?.commission).toBe(200);
    });

    it("skips transactions without an ID", async () => {
      const invalidBatch: RawCuelinksTransaction[] = [
        {
          store_name: "Flipkart",
          commission: 50,
          status: "approved",
        },
      ];

      const { stats } = await syncCuelinksTransactions(invalidBatch);
      expect(stats.skipped).toBe(1);
      expect(stats.synced).toBe(0);
    });

    it("updates pending transaction to confirmed when re-synced", async () => {
      const txId = "tx-update-test-" + Date.now();
      const initialBalances = getUserBalances(testUserId);

      // 1. Initial pending sync: ₹100 commission -> ₹70 pending
      await syncCuelinksTransactions([
        {
          transaction_id: txId,
          store_name: "Myntra",
          sale_amount: 1500,
          commission: 100,
          status: "pending",
          subid: testSubIdPrefix,
        },
      ]);

      const pendBalances = getUserBalances(testUserId);
      expect(pendBalances.pending).toBeGreaterThanOrEqual(7000);

      // 2. Re-sync with confirmed status: ₹70 moved from pending to available
      await syncCuelinksTransactions([
        {
          transaction_id: txId,
          store_name: "Myntra",
          sale_amount: 1500,
          commission: 100,
          status: "confirmed",
          subid: testSubIdPrefix,
        },
      ]);

      const confBalances = getUserBalances(testUserId);
      expect(confBalances.available).toBeGreaterThanOrEqual(7000);
    });
  });

  describe("API Route: /api/cron/sync-conversions", () => {
    it("rejects unauthorized requests with 401", async () => {
      const { GET } = await import("@/app/api/cron/sync-conversions/route");
      const req = new Request("http://localhost:3000/api/cron/sync-conversions", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Unauthorized");
    });

    it("accepts authorized POST requests with transactions array and returns stats", async () => {
      const { POST } = await import("@/app/api/cron/sync-conversions/route");
      const req = new Request("http://localhost:3000/api/cron/sync-conversions", {
        method: "POST",
        headers: {
          Authorization: "Bearer kamaikaro-cron-secret-2026",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactions: [
            {
              transaction_id: "tx-route-test-1",
              store_name: "Ajio",
              sale_amount: 3000,
              commission: 300,
              status: "approved",
              subid: testSubIdPrefix,
            },
          ],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.stats.synced).toBe(1);
      expect(json.stats.skipped).toBe(0);
      expect(json.sampleSyncedIds).toContain("tx-route-test-1");
    });
  });

  describe("API Route: /api/sync/cuelinks", () => {
    it("normalizes status strictly to PAID, PENDING, CANCELLED", async () => {
      const { normalizeStatus } = await import("@/lib/cuelinksSync");
      expect(normalizeStatus("approved")).toBe("PAID");
      expect(normalizeStatus("confirmed")).toBe("PAID");
      expect(normalizeStatus("PAID")).toBe("PAID");
      expect(normalizeStatus("1")).toBe("PAID");
      expect(normalizeStatus("rejected")).toBe("CANCELLED");
      expect(normalizeStatus("cancelled")).toBe("CANCELLED");
      expect(normalizeStatus("2")).toBe("CANCELLED");
      expect(normalizeStatus("pending")).toBe("PENDING");
      expect(normalizeStatus(null)).toBe("PENDING");
    });

    it("handles GET and POST queries with channelId 332862 and returns non-cached responses", async () => {
      const { GET, POST } = await import("@/app/api/sync/cuelinks/route");
      const getReq = new Request("http://localhost:3000/api/sync/cuelinks?channel_id=332862");
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.channelId).toBe("332862");
      expect(getRes.headers.get("cache-control")).toContain("no-store");

      const postReq = new Request("http://localhost:3000/api/sync/cuelinks", { method: "POST" });
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);
      expect(postJson.channelId).toBe("332862");
    });
  });
});
