/**
 * Affiliate link engine.
 *
 * Isomorphic on purpose (no Node-only imports) so the browser can use
 * `extractUrl` / `detectStore` for instant feedback while the server runs the
 * authoritative conversion.
 *
 * Pipeline:  paste → extractUrl → validate → (expand short link) → canonicalise
 *            → buildAffiliateUrl(subId) → short code is minted by the caller.
 *
 * Security stance: allow-list only. A URL is accepted only if its hostname IS or
 * is a subdomain of a partner domain. That makes the stored destination safe to
 * redirect to (no open redirect) and keeps short-link expansion from becoming SSRF.
 */

export const MAX_URL_LENGTH = 2048;
export const MAX_SUBID_LENGTH = 32;

export type StoreSlug =
  | "flipkart"
  | "amazon"
  | "myntra"
  | "ajio"
  | "shopsy"
  | "nykaa"
  | "tatacliq"
  | "croma"
  | "jiomart";

export type LinkErrorCode =
  | "EMPTY_INPUT"
  | "NO_URL_FOUND"
  | "URL_TOO_LONG"
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "SUSPICIOUS_URL"
  | "UNSUPPORTED_STORE"
  | "SHORT_LINK_UNRESOLVED"
  | "INVALID_SUBID"
  | "STORE_NOT_CONFIGURED";

export interface LinkError {
  ok: false;
  code: LinkErrorCode;
  message: string;
}

export interface StoreRule {
  slug: StoreSlug;
  name: string;
  /** Registrable domains. Subdomains match too (www., m., dl., ...). */
  domains: readonly string[];
  /** Exact redirector hosts we are allowed to expand. VERIFY against the live shorteners you see. */
  shortDomains: readonly string[];
  canonicalHost: string;
  /** "params": append affiliate params directly. "network": wrap in an affiliate network deeplink. */
  strategy: "params" | "network";
  paramNames?: { affiliateId: string; subId: string };
  /** Query params removed during canonicalisation (on top of GLOBAL_STRIP). */
  stripParams: readonly (string | RegExp)[];
}

export const STORE_RULES: Readonly<Record<StoreSlug, StoreRule>> = {
  flipkart: {
    slug: "flipkart",
    name: "Flipkart",
    domains: ["flipkart.com"],
    shortDomains: ["fkrt.it"],
    canonicalHost: "www.flipkart.com",
    strategy: "params",
    // Verify these names against your Flipkart Affiliate dashboard before launch.
    paramNames: { affiliateId: "affid", subId: "affExtParam1" },
    stripParams: [/^otracker/i, "iid", "ssid", "srno", "fm", "ppt", "ppn", "cid"],
  },
  myntra: {
    slug: "myntra",
    name: "Myntra",
    domains: ["myntra.com"],
    shortDomains: ["myntr.it"],
    canonicalHost: "www.myntra.com",
    strategy: "network",
    stripParams: ["referer", "rf"],
  },
  ajio: {
    slug: "ajio",
    name: "Ajio",
    domains: ["ajio.com"],
    shortDomains: [],
    canonicalHost: "www.ajio.com",
    strategy: "network",
    stripParams: [],
  },
  amazon: {
    slug: "amazon",
    name: "Amazon",
    domains: ["amazon.in", "amazon.com"],
    shortDomains: ["amzn.to", "amzn.in"],
    canonicalHost: "www.amazon.in",
    strategy: "network",
    stripParams: ["tag", "ascsubtag", "linkCode", "ref", "ref_"],
  },
  shopsy: {
    slug: "shopsy",
    name: "Shopsy",
    domains: ["shopsy.in"],
    shortDomains: [],
    canonicalHost: "www.shopsy.in",
    strategy: "network",
    stripParams: [],
  },
  nykaa: {
    slug: "nykaa",
    name: "Nykaa",
    domains: ["nykaa.com"],
    shortDomains: [],
    canonicalHost: "www.nykaa.com",
    strategy: "network",
    stripParams: [],
  },
  tatacliq: {
    slug: "tatacliq",
    name: "Tata CLiQ",
    domains: ["tatacliq.com"],
    shortDomains: [],
    canonicalHost: "www.tatacliq.com",
    strategy: "network",
    stripParams: [],
  },
  croma: {
    slug: "croma",
    name: "Croma",
    domains: ["croma.com"],
    shortDomains: [],
    canonicalHost: "www.croma.com",
    strategy: "network",
    stripParams: [],
  },
  jiomart: {
    slug: "jiomart",
    name: "JioMart",
    domains: ["jiomart.com"],
    shortDomains: [],
    canonicalHost: "www.jiomart.com",
    strategy: "network",
    stripParams: [],
  },
};

/** Tracking / foreign-affiliate params removed from every URL so nobody else's tag survives. */
const GLOBAL_STRIP: readonly RegExp[] = [
  /^utm_/i,
  /^(fbclid|gclid|msclkid|dclid|igshid|yclid|mc_cid|mc_eid)$/i,
  /^aff/i, // affid, affExtParam1, affiliate_id, aff_sub ...
  /^(irclickid|ranmid|raneaid|ransiteid|clickid|click_id|subid|sub_id|pub_id|publisher_id|cmpid)$/i,
];

export function shouldStripParam(name: string, rule: StoreRule): boolean {
  if (GLOBAL_STRIP.some((re) => re.test(name))) return true;
  return rule.stripParams.some((p) => (typeof p === "string" ? p.toLowerCase() === name.toLowerCase() : p.test(name)));
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`]+/i;
const KNOWN_DOMAINS = Object.values(STORE_RULES)
  .flatMap((r) => [...r.domains, ...r.shortDomains])
  .map((d) => d.replace(/\./g, "\\."))
  .join("|");
const BARE_RE = new RegExp(`\\b(?:[a-z0-9-]+\\.)*(?:${KNOWN_DOMAINS})\\/[^\\s<>"'\`]*`, "i");

/** Pull the first URL out of whatever the user pasted ("Great deal!! https://… 🔥"). */
export function extractUrl(text: string): string | null {
  const m = text.match(URL_RE) ?? text.match(BARE_RE);
  if (!m) return null;
  let u = m[0].replace(/[)\]}>.,;:!?'"]+$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

// ---------------------------------------------------------------------------
// Store matching
// ---------------------------------------------------------------------------

const hostMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function matchStore(host: string): { rule: StoreRule; short: boolean } | null {
  for (const rule of Object.values(STORE_RULES)) {
    if (rule.domains.some((d) => hostMatches(host, d))) return { rule, short: false };
    if (rule.shortDomains.includes(host)) return { rule, short: true };
  }
  return null;
}

/** UI hint only ("Flipkart link detected"). The server never trusts this. */
export function detectStore(input: string): StoreRule | null {
  const u = extractUrl(input);
  if (!u) return null;
  try {
    return matchStore(new URL(u).hostname.toLowerCase())?.rule ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse + canonicalise
// ---------------------------------------------------------------------------

export interface ParsedProductUrl {
  ok: true;
  store: StoreSlug;
  storeName: string;
  originalUrl: string;
  /** https, normalised host, sorted params, no tracking/affiliate params, no fragment. */
  canonicalUrl: string;
}

const err = (code: LinkErrorCode, message: string): LinkError => ({ ok: false, code, message });

function canonicalHostFor(host: string, rule: StoreRule): string {
  const apex = rule.canonicalHost.replace(/^www\./, "");
  return host === apex || host === `www.${apex}` || host === `m.${apex}` ? rule.canonicalHost : host;
}

export function parseProductUrl(input: string): ParsedProductUrl | LinkError {
  const raw = (input ?? "").trim();
  if (!raw) return err("EMPTY_INPUT", "Paste a product link to get started.");

  const extracted = extractUrl(raw);
  if (!extracted) return err("NO_URL_FOUND", "We couldn't find a link in that text.");
  if (extracted.length > MAX_URL_LENGTH) return err("URL_TOO_LONG", "That link is too long to convert.");

  let url: URL;
  try {
    url = new URL(extracted);
  } catch {
    return err("INVALID_URL", "That doesn't look like a valid link.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return err("UNSUPPORTED_PROTOCOL", "Only http and https links can be converted.");
  }
  if (url.username || url.password) return err("SUSPICIOUS_URL", "Links with embedded logins aren't allowed.");
  if (url.port && url.port !== "80" && url.port !== "443") return err("SUSPICIOUS_URL", "Links with custom ports aren't allowed.");

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // new URL() punycodes IDNs: anything non-ASCII shows up as xn--. Reject look-alike domains outright.
  if (!/^[a-z0-9.-]+$/.test(host) || host.split(".").some((l) => l.startsWith("xn--"))) {
    return err("SUSPICIOUS_URL", "That link's domain looks unusual, so we can't convert it.");
  }

  const match = matchStore(host);
  if (!match) return err("UNSUPPORTED_STORE", "We don't support that store yet. Try Flipkart, Myntra or Ajio.");
  if (match.short) return err("SHORT_LINK_UNRESOLVED", "Short link needs to be expanded first.");

  const { rule } = match;
  const kept = [...url.searchParams.entries()]
    .filter(([k]) => !shouldStripParam(k, rule))
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : av > bv ? 1 : 0) : a < b ? -1 : 1));
  const qs = new URLSearchParams(kept).toString();

  let path = url.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/$/, "");

  return {
    ok: true,
    store: rule.slug,
    storeName: rule.name,
    originalUrl: extracted,
    canonicalUrl: `https://${canonicalHostFor(host, rule)}${path}${qs ? `?${qs}` : ""}`,
  };
}

// ---------------------------------------------------------------------------
// Short-link expansion (SSRF-safe: only ever fetches allow-listed redirector hosts)
// ---------------------------------------------------------------------------

export interface ExpandOptions {
  fetchImpl?: typeof fetch;
  maxHops?: number;
  timeoutMs?: number;
}

export async function parseProductUrlAsync(input: string, opts: ExpandOptions = {}): Promise<ParsedProductUrl | LinkError> {
  const first = parseProductUrl(input);
  if (first.ok || first.code !== "SHORT_LINK_UNRESOLVED") return first;

  const doFetch = opts.fetchImpl ?? fetch;
  const maxHops = opts.maxHops ?? 3;
  const original = extractUrl(input)!;
  let current = original;

  for (let hop = 0; hop < maxHops; hop++) {
    const u = new URL(current);
    const m = matchStore(u.hostname.toLowerCase());
    // Hard stop: never request anything that isn't a known redirector, over https only.
    if (!m?.short || u.protocol !== "https:") return err("SHORT_LINK_UNRESOLVED", "We couldn't expand that short link.");

    let res: Response;
    try {
      res = await doFetch(u.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 4000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; KamaiLinkBot/1.0)" },
      });
    } catch {
      return err("SHORT_LINK_UNRESOLVED", "We couldn't expand that short link.");
    }
    await res.body?.cancel().catch(() => undefined);

    const location = res.headers.get("location");
    if (!location) return err("SHORT_LINK_UNRESOLVED", "We couldn't expand that short link.");

    current = new URL(location, u).toString();
    const parsed = parseProductUrl(current);
    if (parsed.ok) return { ...parsed, originalUrl: original };
    if (parsed.code !== "SHORT_LINK_UNRESOLVED") return parsed; // e.g. redirected off the allow-list → reject
  }
  return err("SHORT_LINK_UNRESOLVED", "That short link redirected too many times.");
}

// ---------------------------------------------------------------------------
// Affiliate URL construction
// ---------------------------------------------------------------------------

export interface StoreCredentials {
  /** strategy "params": your affiliate id */
  affiliateId?: string;
  /** strategy "network": https URL containing {url} and optionally {subid} */
  deeplinkTemplate?: string;
}
export type AffiliateConfig = Partial<Record<StoreSlug, StoreCredentials>>;

export interface AffiliateLink {
  ok: true;
  store: StoreSlug;
  canonicalUrl: string;
  destinationUrl: string;
  subId: string;
}

export function sanitizeSubId(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_SUBID_LENGTH);
}

/** sub-id = user's opaque prefix + link code → resolves to exactly one GeneratedLink (and so one user). */
export function makeSubId(userPrefix: string, linkCode: string): string {
  return sanitizeSubId(`${userPrefix}${linkCode}`);
}

export function buildAffiliateUrl(parsed: ParsedProductUrl, subId: string, config: AffiliateConfig): AffiliateLink | LinkError {
  const rule = STORE_RULES[parsed.store];
  const cleanSub = sanitizeSubId(subId);
  if (!cleanSub) return err("INVALID_SUBID", "Missing tracking id.");
  const creds = config[parsed.store];

  if (rule.strategy === "params") {
    if (!creds?.affiliateId || !rule.paramNames) {
      return err("STORE_NOT_CONFIGURED", `${rule.name} isn't configured yet.`);
    }
    const u = new URL(parsed.canonicalUrl);
    u.searchParams.set(rule.paramNames.affiliateId, creds.affiliateId);
    u.searchParams.set(rule.paramNames.subId, cleanSub);
    return { ok: true, store: parsed.store, canonicalUrl: parsed.canonicalUrl, destinationUrl: u.toString(), subId: cleanSub };
  }

  const tpl = creds?.deeplinkTemplate;
  if (!tpl || !/^https:\/\//i.test(tpl) || !tpl.includes("{url}")) {
    const channelId = typeof process !== "undefined" ? process.env?.CUELINKS_CHANNEL_ID : undefined;
    if (channelId) {
      const destinationUrl = `https://linksredirect.com/?cid=${channelId}&subid=${encodeURIComponent(cleanSub)}&source=api&url=${encodeURIComponent(parsed.canonicalUrl)}`;
      return { ok: true, store: parsed.store, canonicalUrl: parsed.canonicalUrl, destinationUrl, subId: cleanSub };
    }
    return err("STORE_NOT_CONFIGURED", `${rule.name} isn't configured yet.`);
  }
  const destinationUrl = tpl
    .replaceAll("{url}", encodeURIComponent(parsed.canonicalUrl))
    .replaceAll("{subid}", encodeURIComponent(cleanSub));
  try {
    new URL(destinationUrl);
  } catch {
    return err("STORE_NOT_CONFIGURED", `${rule.name}'s link template is invalid.`);
  }
  return { ok: true, store: parsed.store, canonicalUrl: parsed.canonicalUrl, destinationUrl, subId: cleanSub };
}

/** One-shot helper: paste → affiliate link. */
export async function convertLink(
  input: string,
  subId: string,
  config: AffiliateConfig,
  opts?: ExpandOptions,
): Promise<AffiliateLink | LinkError> {
  const parsed = await parseProductUrlAsync(input, opts);
  if (!parsed.ok) return parsed;
  return buildAffiliateUrl(parsed, subId, config);
}
