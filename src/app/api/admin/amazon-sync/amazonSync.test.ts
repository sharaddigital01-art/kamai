import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST as amazonSyncPost } from "./route";
import * as auth from "@/lib/auth";
import {
  saveMockLink,
  getLiveLedger,
  getUserBalances,
  getAdminPlatformOverview,
  type MockLink,
} from "@/lib/mockData";

describe("Amazon CSV Sync Parser & Reconciler", () => {
  const adminUser = {
    id: "admin-uuid-0000-0000-000000000001",
    email: "admin@gmail.com",
    name: "Admin User",
    role: "ADMIN" as const,
    referralCode: "ADMINREF",
    subIdPrefix: "adm",
    createdAt: new Date(),
    updatedAt: new Date(),
    referredById: null,
    phone: null,
  };

  const normalUser = {
    ...adminUser,
    id: "user-test-7777-8888-999900000000",
    email: "user@example.com",
    role: "USER" as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-admin users with 403 Access Denied", async () => {
    vi.spyOn(auth, "getApiUser").mockResolvedValue(normalUser as any);

    const req = new Request("http://localhost:3000/api/admin/amazon-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: "Tracking Tag,Item Price,Commission\namz_1,100,10" }),
    });

    const res = await amazonSyncPost(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Admin authorization required");
  });

  it("parses Amazon CSV rows, matches ascsubtag to userId, and computes 70/30 commission split", async () => {
    vi.spyOn(auth, "getApiUser").mockResolvedValue(adminUser as any);

    const targetUserId = "user-affiliate-target-1234";
    const clickRefId = "amz_target12_abc789";

    // Setup an internal link record matching clickRefId with userId
    const testLink: MockLink = {
      id: "link-amz-1",
      userId: targetUserId,
      storeId: "store-amazon",
      dealId: null,
      code: "abc789",
      subId: clickRefId,
      clickRefId: clickRefId,
      provider: "amazon_direct",
      originalUrl: "https://www.amazon.in/dp/B08N5WRWNW",
      canonicalUrl: "https://www.amazon.in/dp/B08N5WRWNW",
      urlHash: "hash123",
      destinationUrl: `https://www.amazon.in/dp/B08N5WRWNW?tag=kamaikaro-21&ascsubtag=${clickRefId}`,
      clickCount: 1,
      lastClickedAt: new Date(),
      createdAt: new Date(),
      store: { name: "Amazon", slug: "amazon" },
      deal: null,
    };
    saveMockLink(testLink);

    // Amazon CSV format with specified headers:
    // Tracking Tag / ascsubtag, Item Price, Advertising Fee (Commission), Date
    const csvContent = [
      "Order ID,Tracking Tag / ascsubtag,Item Price,Advertising Fee (Commission),Date,Status",
      `402-1234567-0000001,${clickRefId},"₹1,499.00","₹100.00",2026-11-01,Shipped`,
      `402-1234567-0000002,${clickRefId},"₹2,000.00","₹200.00",2026-11-02,Pending`,
    ].join("\n");

    const req = new Request("http://localhost:3000/api/admin/amazon-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: csvContent }),
    });

    const res = await amazonSyncPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.processedCount).toBe(2);

    // Total gross commission: ₹100 + ₹200 = ₹300
    // Total User Profit (70%): ₹300 * 0.70 = ₹210.00
    // Total Admin Cut (30%): ₹300 * 0.30 = ₹90.00
    expect(data.totalCommission).toBe(300);
    expect(data.totalUserProfit).toBe(210);
    expect(data.totalAdminCut).toBe(90);

    // Verify summary message matches the required format
    expect(data.message).toContain("Processed 2 orders");
    expect(data.message).toContain("Total User Profit: ₹210.00");
    expect(data.message).toContain("Admin Cut: ₹90.00");

    // Verify EarningsLedger was updated with Amazon records
    const ledger = getLiveLedger();
    const amazonRows = ledger.filter((l) => l.store?.name === "Amazon");
    expect(amazonRows.length).toBeGreaterThanOrEqual(2);

    const firstOrder = amazonRows.find((r) => r.externalOrderId === "402-1234567-0000001");
    expect(firstOrder).toBeDefined();
    // Order 1 was "Shipped" -> status CONFIRMED, 70% of 100 = 70.00 (7000 paise)
    expect(firstOrder?.userAmountPaise).toBe(7000);
    expect(firstOrder?.status).toBe("CONFIRMED");

    const secondOrder = amazonRows.find((r) => r.externalOrderId === "402-1234567-0000002");
    expect(secondOrder).toBeDefined();
    // Order 2 was "Pending" -> status PENDING, 70% of 200 = 140.00 (14000 paise)
    expect(secondOrder?.userAmountPaise).toBe(14000);
    expect(secondOrder?.status).toBe("PENDING");

    // Verify Admin Platform Metrics calculation is updated
    const overview = getAdminPlatformOverview();
    expect(overview.totalPlatformRevenuePaise).toBeGreaterThan(0);
  });
});
