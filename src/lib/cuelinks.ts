/**
 * Cuelinks Monetization API v3 Client
 *
 * Converts plain product URLs into tracked Cuelinks affiliate links.
 */

export interface CuelinksConvertOptions {
  apiKey?: string;
  channelId?: string;
  subId?: string;
  shorten?: boolean;
}

export interface CuelinksConvertResult {
  ok: boolean;
  trackingUrl: string;
  shortUrl: string;
  originalUrl: string;
  campaignName?: string;
  campaignId?: number;
  affiliated?: boolean;
  source: "cuelinks_api" | "cuelinks_redirect";
  error?: string;
}

/**
 * Builds a deterministic Cuelinks redirect URL using linksredirect.com
 */
export function buildCuelinksRedirectUrl(
  destinationUrl: string,
  channelId: string = process.env.CUELINKS_CHANNEL_ID || "332051",
  subId: string = ""
): string {
  const cleanSub = subId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 50);
  const params = new URLSearchParams({
    cid: channelId,
    ...(cleanSub ? { subid: cleanSub } : {}),
    source: "api",
    url: destinationUrl,
  });
  return `https://linksredirect.com/?${params.toString()}`;
}

/**
 * Converts a merchant product URL using the Cuelinks API v3.
 * Falls back to deterministic linksredirect.com if the API call fails or times out.
 */
export async function convertWithCuelinks(
  url: string,
  opts: CuelinksConvertOptions = {}
): Promise<CuelinksConvertResult> {
  const apiKey = opts.apiKey || process.env.CUELINKS_API_KEY || "8ir_BIfBqgKif2bcVsjbPeihyADLwkEoYTvwYqUB174";
  const channelId = opts.channelId || process.env.CUELINKS_CHANNEL_ID || "332051";
  const subId = opts.subId || "";
  const shorten = opts.shorten !== false;

  const fallbackUrl = buildCuelinksRedirectUrl(url, channelId, subId);

  // If no API key configured, use the direct redirect URL
  if (!apiKey) {
    return {
      ok: true,
      trackingUrl: fallbackUrl,
      shortUrl: fallbackUrl,
      originalUrl: url,
      source: "cuelinks_redirect",
    };
  }

  try {
    const res = await fetch("https://developers.cuelinks.com/pub_api/v3/links/convert", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        channel_id: Number(channelId) || channelId,
        subid: subId,
        shorten,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const json = await res.json();
      const data = json?.data || json;

      const trackingUrl = data.tracking_url || data.affiliate_url || fallbackUrl;
      const shortUrl = data.short_url || data.shorten_url || trackingUrl;

      return {
        ok: true,
        trackingUrl,
        shortUrl,
        originalUrl: data.original_url || url,
        campaignName: data.campaign?.name,
        campaignId: data.campaign?.id,
        affiliated: data.affiliated ?? true,
        source: "cuelinks_api",
      };
    }

    console.warn(`Cuelinks API returned status ${res.status}, using redirect URL fallback`);
    return {
      ok: true,
      trackingUrl: fallbackUrl,
      shortUrl: fallbackUrl,
      originalUrl: url,
      source: "cuelinks_redirect",
    };
  } catch (err: any) {
    console.warn("Cuelinks API fetch error, using redirect URL fallback:", err?.message);
    return {
      ok: true,
      trackingUrl: fallbackUrl,
      shortUrl: fallbackUrl,
      originalUrl: url,
      source: "cuelinks_redirect",
    };
  }
}
