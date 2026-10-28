import type { AffiliateConfig } from "./linkConverter";

/** Server-only: your affiliate credentials come from env, never from the database or client. */
export function loadAffiliateConfig(env: NodeJS.ProcessEnv = process.env): AffiliateConfig {
  return {
    flipkart: { affiliateId: env.FLIPKART_AFFID || "demo_affid" },
    myntra: { deeplinkTemplate: env.MYNTRA_DEEPLINK_TEMPLATE || "https://myntra.com/deeplink?url={url}&subid={subid}" },
    ajio: { deeplinkTemplate: env.AJIO_DEEPLINK_TEMPLATE || "https://ajio.com/deeplink?url={url}&subid={subid}" },
  };
}

export function shortUrlFor(code: string): string {
  const base = (process.env.SHORT_URL_BASE || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/r/${code}`;
}
