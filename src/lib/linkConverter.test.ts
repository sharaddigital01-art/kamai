import { describe, expect, it } from "vitest";
import {
  buildAffiliateUrl,
  convertLink,
  detectStore,
  extractUrl,
  makeSubId,
  parseProductUrl,
  parseProductUrlAsync,
  type AffiliateConfig,
  type ParsedProductUrl,
} from "./linkConverter";

const config: AffiliateConfig = {
  flipkart: { affiliateId: "myaff" },
  myntra: { deeplinkTemplate: "https://net.example/click?pub=1&url={url}&subid={subid}" },
  ajio: { deeplinkTemplate: "https://net.example/click?pub=2&url={url}&subid={subid}" },
};

const ok = (r: ReturnType<typeof parseProductUrl>): ParsedProductUrl => {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
  return r;
};

describe("extractUrl", () => {
  it("finds a URL inside chatty text and trims trailing punctuation", () => {
    expect(extractUrl("Steal deal!! https://www.flipkart.com/p/itm1?pid=A. so good")).toBe("https://www.flipkart.com/p/itm1?pid=A");
  });
  it("accepts www. and bare store domains", () => {
    expect(extractUrl("www.myntra.com/shoes/1/buy")).toBe("https://www.myntra.com/shoes/1/buy");
    expect(extractUrl("see ajio.com/p/123 now")).toBe("https://ajio.com/p/123");
  });
  it("returns null when there is no link", () => {
    expect(extractUrl("hello there")).toBeNull();
  });
});

describe("parseProductUrl", () => {
  it("canonicalises Flipkart: https, www host, tracking removed, params sorted", () => {
    const p = ok(
      parseProductUrl("http://flipkart.com/phone/p/itm9/?pid=MOB1&utm_source=wa&otracker=foo&lid=LST1&affid=someoneelse#frag"),
    );
    expect(p.store).toBe("flipkart");
    expect(p.canonicalUrl).toBe("https://www.flipkart.com/phone/p/itm9?lid=LST1&pid=MOB1");
  });
  it("is stable: same product, different tracking noise → identical canonical URL", () => {
    const a = ok(parseProductUrl("https://www.flipkart.com/x/p/i?pid=1&lid=2&utm_medium=a"));
    const b = ok(parseProductUrl("https://m.flipkart.com/x/p/i/?lid=2&pid=1&affExtParam1=zzz"));
    expect(a.canonicalUrl).toBe(b.canonicalUrl);
  });
  it("keeps dl.flipkart.com deep-link host", () => {
    expect(ok(parseProductUrl("https://dl.flipkart.com/dl/x/p/i?pid=1")).canonicalUrl).toBe("https://dl.flipkart.com/dl/x/p/i?pid=1");
  });
  it("handles Myntra and Ajio", () => {
    expect(ok(parseProductUrl("https://myntra.com/tshirts/roadster/12345/buy?utm_campaign=x")).canonicalUrl).toBe(
      "https://www.myntra.com/tshirts/roadster/12345/buy",
    );
    expect(ok(parseProductUrl("https://www.ajio.com/p/469")).store).toBe("ajio");
  });

  it.each([
    ["flipkart.com.evil.com", "https://flipkart.com.evil.com/p/1"],
    ["suffix trick", "https://evilflipkart.com/p/1"],
    ["userinfo trick", "https://www.flipkart.com@evil.com/p/1"],
    ["custom port", "https://www.flipkart.com:8443/p/1"],
    ["punycode look-alike", "https://www.flipk\u0430rt.com/p/1"],
  ])("rejects %s", (_n, url) => {
    expect(parseProductUrl(url).ok).toBe(false);
  });

  it("rejects unsupported protocols and unsupported stores with specific codes", () => {
    expect(parseProductUrl("javascript:alert(1)")).toMatchObject({ ok: false });
    expect(parseProductUrl("https://example.com/x")).toMatchObject({ ok: false, code: "UNSUPPORTED_STORE" });
    expect(parseProductUrl("")).toMatchObject({ ok: false, code: "EMPTY_INPUT" });
    expect(parseProductUrl("no link here")).toMatchObject({ ok: false, code: "NO_URL_FOUND" });
  });

  it("flags short links for expansion", () => {
    expect(parseProductUrl("https://fkrt.it/abc123")).toMatchObject({ ok: false, code: "SHORT_LINK_UNRESOLVED" });
  });
});

describe("buildAffiliateUrl", () => {
  const flip = ok(parseProductUrl("https://www.flipkart.com/x/p/i?pid=1"));
  it("Flipkart: injects affiliate id and sub-id, keeps product params", () => {
    const r = buildAffiliateUrl(flip, "u1abc-123", config);
    if (!r.ok) throw new Error(r.code);
    const u = new URL(r.destinationUrl);
    expect(u.searchParams.get("affid")).toBe("myaff");
    expect(u.searchParams.get("affExtParam1")).toBe("u1abc123");
    expect(u.searchParams.get("pid")).toBe("1");
  });
  it("network stores: wraps the encoded canonical URL and sub-id into the template", () => {
    const m = ok(parseProductUrl("https://www.myntra.com/a/1/buy?size=M"));
    const r = buildAffiliateUrl(m, "AAA111BBB222", config);
    if (!r.ok) throw new Error(r.code);
    const u = new URL(r.destinationUrl);
    expect(u.host).toBe("net.example");
    expect(u.searchParams.get("url")).toBe("https://www.myntra.com/a/1/buy?size=M");
    expect(u.searchParams.get("subid")).toBe("AAA111BBB222");
  });
  it("fails closed when a store has no credentials or a bad template", () => {
    expect(buildAffiliateUrl(flip, "x1", {})).toMatchObject({ ok: false, code: "STORE_NOT_CONFIGURED" });
    const m = ok(parseProductUrl("https://www.myntra.com/a/1/buy"));
    expect(buildAffiliateUrl(m, "x1", { myntra: { deeplinkTemplate: "http://insecure/{url}" } })).toMatchObject({ ok: false });
    expect(buildAffiliateUrl(m, "x1", { myntra: { deeplinkTemplate: "https://n.example/no-placeholder" } })).toMatchObject({ ok: false });
  });
  it("rejects an empty sub-id and truncates long ones", () => {
    expect(buildAffiliateUrl(flip, "---", config)).toMatchObject({ ok: false, code: "INVALID_SUBID" });
    expect(makeSubId("p".repeat(20), "c".repeat(20))).toHaveLength(32);
  });
});

describe("short link expansion", () => {
  const fakeFetch = (map: Record<string, string>) =>
    (async (url: string) => {
      const loc = map[url];
      return new Response(null, { status: loc ? 302 : 404, headers: loc ? { location: loc } : {} });
    }) as unknown as typeof fetch;

  it("follows an allow-listed redirector to a product URL", async () => {
    const r = await parseProductUrlAsync("https://fkrt.it/abc", {
      fetchImpl: fakeFetch({ "https://fkrt.it/abc": "https://www.flipkart.com/x/p/i?pid=9&utm_source=s" }),
    });
    expect(r).toMatchObject({ ok: true, store: "flipkart", canonicalUrl: "https://www.flipkart.com/x/p/i?pid=9" });
  });
  it("rejects a redirect that leaves the allow-list", async () => {
    const r = await parseProductUrlAsync("https://fkrt.it/abc", { fetchImpl: fakeFetch({ "https://fkrt.it/abc": "https://evil.example/x" }) });
    expect(r).toMatchObject({ ok: false, code: "UNSUPPORTED_STORE" });
  });
  it("never fetches non-redirector hosts", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response(null);
    }) as unknown as typeof fetch;
    await parseProductUrlAsync("https://example.com/x", { fetchImpl: spy });
    expect(called).toBe(false);
  });
});

describe("convertLink + detectStore", () => {
  it("end to end", async () => {
    const r = await convertLink("check https://www.flipkart.com/x/p/i?pid=1 😍", "usr1code1", config);
    expect(r).toMatchObject({ ok: true, store: "flipkart" });
  });
  it("detectStore is a UI hint", () => {
    expect(detectStore("https://www.ajio.com/p/1")?.slug).toBe("ajio");
    expect(detectStore("https://example.com")).toBeNull();
  });
});
