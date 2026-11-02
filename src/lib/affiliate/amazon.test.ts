import { describe, expect, it, beforeEach } from "vitest";
import {
  isAmazonUrl,
  cleanAmazonUrl,
  generateClickRefId,
  formatAmazonAffiliateUrl,
  createAmazonAffiliateLink,
} from "./amazon";
import { getMockLinkByClickRefId } from "@/lib/mockData";

describe("Native Amazon Associates Engine", () => {
  const originalTag = process.env.AMAZON_ASSOCIATE_TAG;

  beforeEach(() => {
    process.env.AMAZON_ASSOCIATE_TAG = "kamaikaro-21";
  });

  describe("isAmazonUrl", () => {
    it("recognizes Amazon India and global URLs", () => {
      expect(isAmazonUrl("https://www.amazon.in/dp/B08N5WRWNW")).toBe(true);
      expect(isAmazonUrl("http://amazon.com/gp/product/B09XYZ1234")).toBe(true);
      expect(isAmazonUrl("amazon.in/echo-dot")).toBe(true);
      expect(isAmazonUrl("https://amzn.to/3xyz123")).toBe(true);
      expect(isAmazonUrl("https://amzn.in/d/4abc123")).toBe(true);
    });

    it("rejects non-Amazon URLs", () => {
      expect(isAmazonUrl("https://www.flipkart.com/item/123")).toBe(false);
      expect(isAmazonUrl("https://myntra.com/tshirts/123")).toBe(false);
      expect(isAmazonUrl("https://example.com/amazon-review")).toBe(false);
    });
  });

  describe("cleanAmazonUrl", () => {
    it("strips third-party tracking tags, ascsubtags, and search queries", () => {
      const dirtyUrl =
        "https://www.amazon.in/Apple-iPhone-15-128-GB/dp/B0CHX1W1XY?tag=foreignaff-21&ascsubtag=oldtag123&ref=sr_1_1&keywords=iphone&qid=1700000000";
      const cleaned = cleanAmazonUrl(dirtyUrl);

      expect(cleaned).toBe("https://www.amazon.in/dp/B0CHX1W1XY");
      expect(cleaned).not.toContain("tag=foreignaff-21");
      expect(cleaned).not.toContain("ascsubtag=");
      expect(cleaned).not.toContain("keywords=");
    });

    it("handles short amazon product links and normalizes to standard product URL", () => {
      const productUrl = "https://www.amazon.in/gp/product/B08L5WHFT9/ref=as_li_ss_tl";
      const cleaned = cleanAmazonUrl(productUrl);
      expect(cleaned).toBe("https://www.amazon.in/dp/B08L5WHFT9");
    });
  });

  describe("generateClickRefId", () => {
    it("generates unique click reference ID containing user identifier", () => {
      const userId = "c1a2b3c4-0000-0000-0000-000000000001";
      const clickRefId = generateClickRefId(userId, "testcode");
      expect(clickRefId).toContain("amz_");
      expect(clickRefId).toContain("testcode");
    });
  });

  describe("formatAmazonAffiliateUrl", () => {
    it("formats destination URL strictly using Master Amazon Tag and ascsubtag tracking parameter", () => {
      const cleanedUrl = "https://www.amazon.in/dp/B0CHX1W1XY";
      const clickRefId = "amz_user123_click456";
      const result = formatAmazonAffiliateUrl(cleanedUrl, clickRefId);

      // Expected format: `${cleanedUrl}?tag=${process.env.AMAZON_ASSOCIATE_TAG}&ascsubtag=${clickRefId}`
      expect(result).toBe("https://www.amazon.in/dp/B0CHX1W1XY?tag=kamaikaro-21&ascsubtag=amz_user123_click456");
      expect(result).toContain("tag=kamaikaro-21");
      expect(result).toContain("ascsubtag=amz_user123_click456");
    });
  });

  describe("createAmazonAffiliateLink", () => {
    it("creates an Amazon direct affiliate link and saves in link registry with provider amazon_direct", async () => {
      const userId = "11111111-2222-3333-4444-555555555555";
      const rawUrl = "https://www.amazon.in/dp/B08N5WRWNW?tag=other-21";

      const result = await createAmazonAffiliateLink(rawUrl, userId);

      expect(result.success).toBe(true);
      expect(result.provider).toBe("amazon_direct");
      expect(result.destinationUrl).toContain("tag=kamaikaro-21");
      expect(result.destinationUrl).toContain(`ascsubtag=${result.clickRefId}`);
      expect(result.store.slug).toBe("amazon");

      // Verify link can be retrieved by clickRefId
      const savedLink = getMockLinkByClickRefId(result.clickRefId);
      expect(savedLink).toBeDefined();
      expect(savedLink?.userId).toBe(userId);
      expect(savedLink?.provider).toBe("amazon_direct");
    });
  });
});
