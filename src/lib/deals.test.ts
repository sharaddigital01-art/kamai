import { describe, expect, it } from "vitest";
import { getStores, getDeals, parseDealFilters } from "./deals";
import { isDatabaseConfigured, filterMockDeals, MOCK_STORES, MOCK_DEALS } from "./mockData";

describe("deals and stores fallback logic", () => {
  it("detects database is not configured with default placeholder env", () => {
    const orig = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://postgres.YOUR-REF:PASSWORD@host:6543/postgres";
    expect(isDatabaseConfigured()).toBe(false);
    process.env.DATABASE_URL = orig;
  });

  it("getStores returns fallback stores when DB is not configured", async () => {
    const stores = await getStores();
    expect(stores.length).toBeGreaterThanOrEqual(3);
    const slugs = stores.map((s) => s.slug);
    expect(slugs).toContain("flipkart");
    expect(slugs).toContain("myntra");
    expect(slugs).toContain("ajio");
    expect(stores.find((s) => s.slug === "flipkart")?.profitPct).toBeGreaterThan(0);
  });

  it("getDeals returns fallback deals and pagination", async () => {
    const filters = parseDealFilters({});
    const page = await getDeals(filters);
    expect(page.total).toBe(MOCK_DEALS.length);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items[0]?.store).toBeDefined();
    expect(page.items[0]?.title).toBeDefined();
  });

  it("filters mock deals by store", () => {
    const res = filterMockDeals(parseDealFilters({ store: "flipkart" }));
    expect(res.items.every((d) => d.store.slug === "flipkart")).toBe(true);
    expect(res.total).toBeGreaterThan(0);
  });

  it("filters mock deals by category", () => {
    const res = filterMockDeals(parseDealFilters({ category: "electronics" }));
    expect(res.items.every((d) => d.category === "electronics")).toBe(true);
  });

  it("filters mock deals by search query", () => {
    const res = filterMockDeals(parseDealFilters({ q: "earbuds" }));
    expect(res.items.length).toBeGreaterThanOrEqual(1);
    expect(res.items[0]?.title.toLowerCase()).toContain("earbuds");
  });

  it("sorts mock deals by discount", () => {
    const res = filterMockDeals(parseDealFilters({ sort: "discount" }));
    for (let i = 1; i < res.items.length; i++) {
      expect(res.items[i - 1]!.discountPct).toBeGreaterThanOrEqual(res.items[i]!.discountPct);
    }
  });

  it("sorts mock deals by profit", () => {
    const res = filterMockDeals(parseDealFilters({ sort: "profit" }));
    for (let i = 1; i < res.items.length; i++) {
      expect(res.items[i - 1]!.estimatedProfitPaise).toBeGreaterThanOrEqual(res.items[i]!.estimatedProfitPaise);
    }
  });
});
