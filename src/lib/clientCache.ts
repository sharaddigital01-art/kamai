/**
 * Client-Side SWR In-Memory & Session Cache
 * Provides instantaneous tab switching (<100ms, effectively 0ms from cache)
 * with background stale-while-revalidate (SWR) and 60-second deduping.
 */

export interface CachedUserData {
  authenticated: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    role: "USER" | "ADMIN";
    referralCode: string;
    subIdPrefix?: string;
  } | null;
  isAdmin: boolean;
}

export interface CachedStatsData {
  balances: {
    lifetime: number;
    available: number;
    pending: number;
    inWithdrawal?: number;
    paid?: number;
  };
  stats: {
    totalProfitPaise: number;
    availablePaise: number;
    pendingPaise: number;
    paidPaise: number;
    inWithdrawalPaise: number;
    totalClicks: number;
    totalTransactions: number;
    convRate: string;
    registeredUsersCount?: number;
  };
  dailyStats?: any[];
  ledger?: any[];
  conversions?: any[];
  activeSubId?: string | null;
}

export interface CachedTelegramConfig {
  connected: boolean;
  config: {
    id?: string;
    telegramUserId: string | null;
    telegramUsername: string | null;
    sessionString: string | null;
    targetChannelId: string | null;
    targetChannelName: string | null;
    amazonTag?: string | null;
    targetChannels?: any[];
    sourceChannels: string[];
    isActive: boolean;
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache store (persists across client-side route navigations)
const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

const DEFAULT_DEDUPING_INTERVAL_MS = 60 * 1000; // 60 seconds

function safeSessionGet<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`kamai_cache_${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeSessionSet<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`kamai_cache_${key}`, JSON.stringify(entry));
  } catch {
    // sessionStorage quota or security restriction
  }
}

function safeSessionRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`kamai_cache_${key}`);
  } catch {}
}

/**
 * Synchronously retrieves cached data for immediate 0ms initial state.
 */
export function getCachedValue<T>(key: string): T | null {
  const mem = memoryCache.get(key);
  if (mem) return mem.data;

  const ses = safeSessionGet<T>(key);
  if (ses) {
    memoryCache.set(key, ses);
    return ses.data;
  }

  return null;
}

/**
 * Updates both in-memory cache and sessionStorage.
 */
export function setCachedValue<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache.set(key, entry);
  safeSessionSet(key, entry);
}

/**
 * Checks if the cached data is fresh (within deduping interval).
 */
export function isCacheFresh(key: string, maxAgeMs = DEFAULT_DEDUPING_INTERVAL_MS): boolean {
  let entry = memoryCache.get(key);
  if (!entry) {
    entry = safeSessionGet(key) ?? undefined;
    if (entry) memoryCache.set(key, entry);
  }
  if (!entry) return false;
  return Date.now() - entry.timestamp < maxAgeMs;
}

/**
 * Fetches data with Stale-While-Revalidate and concurrent request deduplication.
 * - If fresh (< maxAgeMs), returns cached data immediately without network request.
 * - If stale, returns cached data immediately and revalidates in the background.
 * - Deduplicates concurrent calls to the same endpoint.
 */
export async function fetchWithSwr<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    maxAgeMs?: number;
    force?: boolean;
    onBackgroundUpdate?: (freshData: T) => void;
  }
): Promise<T> {
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_DEDUPING_INTERVAL_MS;
  const isFresh = !options?.force && isCacheFresh(key, maxAgeMs);
  const cached = getCachedValue<T>(key);

  // If fresh and cached, return immediately (0ms)
  if (isFresh && cached !== null) {
    return cached;
  }

  // If in-flight request already exists for this key, reuse it
  if (pendingRequests.has(key)) {
    if (cached !== null && !options?.force) {
      // In SWR mode, return cached immediately while in-flight completes
      return cached;
    }
    return pendingRequests.get(key)!;
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      setCachedValue(key, data);
      if (options?.onBackgroundUpdate) {
        options.onBackgroundUpdate(data);
      }
      return data;
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);

  // SWR: If we have stale data and not forced, return stale data while background updates
  if (cached !== null && !options?.force) {
    return cached;
  }

  return promise;
}

/**
 * Helper: Invalidate cached items (e.g. on logout or after mutation)
 */
export function invalidateClientCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith("kamai_cache_")) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.sessionStorage.removeItem(k);
        }
      } catch {}
    }
    return;
  }

  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k);
      safeSessionRemove(k);
    }
  }
}

// Convenience accessors for User Profile
export const CACHE_KEY_USER = "auth_user";
export function getCachedUser(): CachedUserData | null {
  return getCachedValue<CachedUserData>(CACHE_KEY_USER);
}
export function setCachedUser(data: CachedUserData): void {
  setCachedValue(CACHE_KEY_USER, data);
}

// Convenience accessors for Stats & Balances
export const CACHE_KEY_STATS = "user_stats";
export function getCachedStats(): CachedStatsData | null {
  return getCachedValue<CachedStatsData>(CACHE_KEY_STATS);
}
export function setCachedStats(data: CachedStatsData): void {
  setCachedValue(CACHE_KEY_STATS, data);
}

// Convenience accessors for Reports
export const CACHE_KEY_REPORTS = "reports_data";
export function getCachedReportsData(): any | null {
  return getCachedValue<any>(CACHE_KEY_REPORTS);
}
export function setCachedReportsData(data: any): void {
  setCachedValue(CACHE_KEY_REPORTS, data);
}

// Convenience accessors for Telegram Automation Config
export const CACHE_KEY_TELEGRAM_CONFIG = "telegram_config";
export function getCachedTelegramConfig(): CachedTelegramConfig | null {
  return getCachedValue<CachedTelegramConfig>(CACHE_KEY_TELEGRAM_CONFIG);
}
export function setCachedTelegramConfig(data: CachedTelegramConfig): void {
  setCachedValue(CACHE_KEY_TELEGRAM_CONFIG, data);
}
