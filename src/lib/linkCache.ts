/** Tiny TTL cache for the hot redirect path. Swap for Redis GET/SETEX when running >1 instance. */
export interface CachedLink {
  id: string;
  userId: string;
  storeId: string;
  dealId: string | null;
  destinationUrl: string;
}

const TTL_MS = 60_000;
const MAX = 5_000;
const cache = new Map<string, { value: CachedLink; expires: number }>();

export function getCachedLink(code: string): CachedLink | undefined {
  const hit = cache.get(code);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(code);
    return undefined;
  }
  return hit.value;
}

export function setCachedLink(code: string, value: CachedLink) {
  if (cache.size >= MAX) cache.delete(cache.keys().next().value as string);
  cache.set(code, { value, expires: Date.now() + TTL_MS });
}

const shortUrlCache = new Map<string, { targetUrl: string; expires: number }>();

export function getCachedShortUrl(slug: string): string | undefined {
  const hit = shortUrlCache.get(slug);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    shortUrlCache.delete(slug);
    return undefined;
  }
  return hit.targetUrl;
}

export function setCachedShortUrl(slug: string, targetUrl: string) {
  if (shortUrlCache.size >= MAX) shortUrlCache.delete(shortUrlCache.keys().next().value as string);
  shortUrlCache.set(slug, { targetUrl, expires: Date.now() + TTL_MS });
}
