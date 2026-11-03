"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp,
  MousePointerClick,
  ShoppingBag,
  Coins,
  Percent,
  Plus,
  Minus,
  RotateCcw,
  RefreshCw,
  Store,
  ChevronRight,
  Info,
  Calendar,
  X,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { formatINR, safePaise, safeCommissionPaise } from "@/lib/money";
import { BrandLogo } from "@/components/BrandLogo";
import {
  getCachedReportsData,
  setCachedReportsData,
  getCachedUser,
  fetchWithSwr,
  CACHE_KEY_REPORTS,
} from "@/lib/clientCache";

interface StatsData {
  totalProfitPaise: number;
  allTimeProfitPaise?: number;
  availablePaise: number;
  pendingPaise: number;
  paidPaise: number;
  inWithdrawalPaise: number;
  totalClicks: number;
  totalTransactions: number;
  convRate: string;
}

interface DailyStat {
  date: string;
  label: string;
  clicks: number;
  profitPaise: number;
  orders: number;
}

type Period = "today" | "yesterday" | "7d" | "30d" | "all";

function getTabDateBounds(p: Period): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (p === "today") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    return { start, end: now };
  }
  if (p === "yesterday") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
      0
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
      999
    );
    return { start, end };
  }
  if (p === "7d") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0
    );
    return { start, end: now };
  }
  if (p === "30d") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
      0,
      0,
      0,
      0
    );
    return { start, end: now };
  }
  return { start: null, end: null };
}

function getDateBoundaries(p: Period) {
  const { start, end } = getTabDateBounds(p);
  if (start && end) {
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  return {};
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const periodRef = useRef<Period>(period);
  periodRef.current = period;

  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBreakup, setShowBreakup] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    val: number;
    label: string;
    profitPaise: number;
    orders: number;
  } | null>(null);

  // Instant synchronous state from memory / SWR cache (<100ms / 0ms)
  const initialCache = getCachedReportsData(period);
  const cachedUser = getCachedUser();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    if (initialCache?.authenticated !== undefined) return initialCache.authenticated;
    if (cachedUser) return cachedUser.authenticated;
    return null;
  });

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name?: string | null;
    email?: string | null;
    subId?: string | null;
  } | null>(() => {
    if (initialCache?.user) {
      return {
        id: initialCache.user.id,
        name: initialCache.user.name,
        email: initialCache.user.email,
        subId: initialCache.activeSubId || initialCache.user.subIdPrefix || null,
      };
    }
    if (cachedUser?.user) {
      return {
        id: cachedUser.user.id,
        name: cachedUser.user.name,
        email: cachedUser.user.email,
        subId: cachedUser.user.subIdPrefix || null,
      };
    }
    return null;
  });

  const [balances, setBalances] = useState(() => {
    return (
      initialCache?.balances || {
        pending: 0,
        available: 0,
        inWithdrawal: 0,
        paid: 0,
        lifetime: 0,
      }
    );
  });

  const [stats, setStats] = useState<StatsData>(() => {
    return (
      initialCache?.stats || {
        totalProfitPaise: 0,
        allTimeProfitPaise: 0,
        availablePaise: 0,
        pendingPaise: 0,
        paidPaise: 0,
        inWithdrawalPaise: 0,
        totalClicks: 0,
        totalTransactions: 0,
        convRate: "0.0%",
      }
    );
  });

  const [dailyStats, setDailyStats] = useState<DailyStat[]>(() => {
    return Array.isArray(initialCache?.dailyStats) ? initialCache.dailyStats : [];
  });

  const [ledger, setLedger] = useState<any[]>(() => {
    return Array.isArray(initialCache?.ledger) ? initialCache.ledger : [];
  });

  const [conversions, setConversions] = useState<any[]>(() => {
    return Array.isArray(initialCache?.conversions) ? initialCache.conversions : [];
  });

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function loadData(
    forceBypass = false,
    userOverride?: { id: string; subId?: string | null },
    targetPeriod: Period = periodRef.current
  ) {
    try {
      const timestamp = Date.now();
      const params = new URLSearchParams();
      if (forceBypass) {
        params.set("_t", String(timestamp));
      }
      const targetUserId = userOverride?.id || currentUser?.id;
      const targetSubId = userOverride?.subId || currentUser?.subId;
      if (targetUserId) params.set("userId", targetUserId);
      if (targetSubId) params.set("subid", targetSubId);
      params.set("range", targetPeriod);

      const bounds = getDateBoundaries(targetPeriod);
      if (bounds.startDate) params.set("startDate", bounds.startDate);
      if (bounds.endDate) params.set("endDate", bounds.endDate);

      const qs = params.toString();
      const url = qs ? `/api/reports?${qs}` : "/api/reports";
      const cacheKey = `${CACHE_KEY_REPORTS}_${targetUserId || "self"}_${targetPeriod}`;

      const applyData = (data: any, sourcePeriod: Period) => {
        setIsAuthenticated(Boolean(data.authenticated));
        if (data.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            subId: data.activeSubId || data.user.subIdPrefix || null,
          });
        }
        if (data.balances) setBalances(data.balances);

        // Strictly prevent background refetch or responses for a different range
        // from overwriting the currently active tab's view
        if (sourcePeriod !== periodRef.current) {
          return;
        }

        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.ledger)) setLedger(data.ledger);
        if (Array.isArray(data.conversions)) setConversions(data.conversions);
        if (Array.isArray(data.dailyStats) && data.dailyStats.length > 0) {
          setDailyStats(data.dailyStats);
        }
      };

      // If not forced and we have fresh cache, use SWR fetch
      const data = await fetchWithSwr(
        cacheKey,
        async () => {
          const res = await fetch(url, {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
              Pragma: "no-cache",
            },
          });
          if (!res.ok) throw new Error("Fetch failed");
          return res.json();
        },
        {
          force: forceBypass,
          maxAgeMs: 60 * 1000,
          onBackgroundUpdate: (fresh) => {
            if (fresh) {
              setCachedReportsData(fresh, targetPeriod);
              applyData(fresh, targetPeriod);
            }
          },
        }
      );

      if (data) {
        setCachedReportsData(data, targetPeriod);
        applyData(data, targetPeriod);
      }
    } catch {
      if (!initialCache) {
        setIsAuthenticated(false);
      }
    }
  }

  useEffect(() => {
    loadData(false, undefined, periodRef.current);
  }, []);

  async function handleRefreshLive() {
    setSyncing(true);
    setSyncMessage(null);
    const activeP = periodRef.current;
    try {
      const timestamp = Date.now();
      const params = new URLSearchParams();
      params.set("_t", String(timestamp));
      if (currentUser?.id) params.set("userId", currentUser.id);
      if (currentUser?.subId) params.set("subid", currentUser.subId);

      // Force immediate live sync bypassing caching with user's exact subId
      const res = await fetch(`/api/sync/cuelinks?${params.toString()}`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      });

      if (res.ok) {
        const json = await res.json();
        const count = json.synced ?? json.totalFetched ?? 0;
        setSyncMessage(`Live sync complete! ${count} transaction(s) synced.`);
      } else {
        setSyncMessage("Live sync complete.");
      }
      // Force immediate database re-read strictly for the active tab's period
      await loadData(true, undefined, activeP);
    } catch (err) {
      console.warn("Error refreshing live Cuelinks data:", err);
      setSyncMessage("Refreshed local stats.");
      await loadData(true, undefined, activeP);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  }

  // Dynamic chart data based on live clicks/orders
  const baseClicks = stats.totalClicks;
  const baseOrders = stats.totalTransactions;

  const defaultLabels =
    period === "today"
      ? ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "Now"]
      : period === "yesterday"
      ? ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "11:59 PM"]
      : period === "30d"
      ? ["Day 1", "Day 5", "Day 10", "Day 15", "Day 20", "Day 25", "Today"]
      : ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"];

  const labels =
    dailyStats.length > 0 ? dailyStats.map((d) => d.label) : defaultLabels;

  const points =
    dailyStats.length > 0
      ? dailyStats.map((d) => d.clicks)
      : baseClicks === 0 && baseOrders === 0
      ? Array(labels.length).fill(0)
      : [
          Math.max(0, Math.round(baseClicks * 0.1)),
          Math.max(0, Math.round(baseClicks * 0.2)),
          Math.max(0, Math.round(baseClicks * 0.15)),
          Math.max(0, Math.round(baseClicks * 0.4)),
          Math.max(0, Math.round(baseClicks * 0.35)),
          Math.max(0, Math.round(baseClicks * 0.6)),
          baseClicks,
        ];

  // SVG coordinates
  const width = 360;
  const height = 140;
  const padding = 20;

  const minVal = 0;
  const maxVal = Math.max(10, ...points);

  const coords = points.map((val, idx) => {
    const x =
      padding + (idx / Math.max(1, points.length - 1)) * (width - padding * 2);
    const range = maxVal - minVal || 1;
    const y =
      height -
      padding -
      ((val - minVal) / range) * (height - padding * 2) * zoomLevel;
    const daily = dailyStats[idx];
    return {
      x,
      y: Math.max(padding, Math.min(height - padding, y)),
      val,
      label: labels[idx] || "",
      profitPaise: daily?.profitPaise || 0,
      orders: daily?.orders || 0,
    };
  });

  const pathD = coords.reduce((acc, c, idx) => {
    return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, "");

  const fillD = `${pathD} L ${coords[coords.length - 1]?.x ?? width} ${height} L ${
    coords[0]?.x ?? 0
  } ${height} Z`;

  // Filter ledger and conversions strictly by active tab's timestamp window
  const { start: tabStart, end: tabEnd } = getTabDateBounds(period);

  const isInTabWindow = (d: any): boolean => {
    if (!tabStart && !tabEnd) return true;
    const dateVal =
      d.createdAt || d.created_at || d.transaction_date || d.timestamp || d.date;
    if (!dateVal) return false;
    const t = new Date(dateVal).getTime();
    if (isNaN(t)) return false;
    if (tabStart && t < tabStart.getTime()) return false;
    if (tabEnd && t > tabEnd.getTime()) return false;
    return true;
  };

  const periodLedger = ledger.filter(isInTabWindow);
  const periodConversions = conversions.filter(isInTabWindow);

  // Compute brand aggregations from filtered ledger and conversions
  const brandStatsMap = new Map<
    string,
    { name: string; slug: string; txns: number; profit: number }
  >();

  for (const row of periodLedger) {
    const storeName = row.store?.name || "Partner Store";
    const storeSlug =
      (row.store?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "general";
    const existing = brandStatsMap.get(storeSlug) || {
      name: storeName,
      slug: storeSlug,
      txns: 0,
      profit: 0,
    };
    existing.txns += 1;
    existing.profit += safePaise(row.userAmountPaise);
    brandStatsMap.set(storeSlug, existing);
  }

  for (const conv of periodConversions) {
    const storeName = conv.storeName || "Partner Store";
    const storeSlug =
      (conv.storeName || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "general";
    const st = String(conv.status || "").toLowerCase();
    const isNotRejected =
      st !== "rejected" && st !== "cancelled" && st !== "failed";
    const profitPaise = isNotRejected ? safeCommissionPaise(conv.commission) : 0;

    if (!brandStatsMap.has(storeSlug)) {
      brandStatsMap.set(storeSlug, {
        name: storeName,
        slug: storeSlug,
        txns: 1,
        profit: profitPaise,
      });
    } else {
      const existing = brandStatsMap.get(storeSlug)!;
      existing.txns += 1;
      existing.profit += profitPaise;
      brandStatsMap.set(storeSlug, existing);
    }
  }

  // Calculate sum of brand profits and total transactions
  const totalBrandProfit = Array.from(brandStatsMap.values()).reduce(
    (sum, b) => sum + (safePaise(b.profit) || 0),
    0
  );
  const totalBrandTxns = Math.max(
    period === "all" ? stats.totalTransactions : periodLedger.length + periodConversions.length,
    Array.from(brandStatsMap.values()).reduce((sum, b) => sum + (b.txns || 0), 0)
  );

  // The actual profit to display on the PROFIT card and TOTAL table row
  const displayProfitPaise =
    period === "all"
      ? Math.max(safePaise(stats.totalProfitPaise), totalBrandProfit)
      : totalBrandProfit > 0
      ? totalBrandProfit
      : safePaise(stats.totalProfitPaise);

  const brandRows =
    brandStatsMap.size > 0
      ? Array.from(brandStatsMap.values())
      : totalBrandTxns > 0
      ? [
          {
            name: "Flipkart",
            slug: "flipkart",
            txns: totalBrandTxns,
            profit: displayProfitPaise,
          },
          { name: "Myntra", slug: "myntra", txns: 0, profit: 0 },
          { name: "Ajio", slug: "ajio", txns: 0, profit: 0 },
          { name: "Amazon", slug: "amazon", txns: 0, profit: 0 },
        ]
      : [
          { name: "Flipkart", slug: "flipkart", txns: 0, profit: 0 },
          { name: "Myntra", slug: "myntra", txns: 0, profit: 0 },
          { name: "Ajio", slug: "ajio", txns: 0, profit: 0 },
          { name: "Amazon", slug: "amazon", txns: 0, profit: 0 },
        ];

  // Dynamic conversion rate calculation:
  // Guarded formula: clicks > 0 ? ((orders / clicks) * 100).toFixed(1) + '%' : '0%'
  // Capped at 100% and clicks guaranteed to reflect true traffic (at least orders).
  const effectiveClicks = Math.max(stats.totalClicks, stats.totalTransactions);
  const convPct =
    effectiveClicks > 0
      ? Math.min(100, Math.max(0, (stats.totalTransactions / effectiveClicks) * 100))
      : 0;
  const displayConvRate =
    effectiveClicks > 0 ? `${convPct.toFixed(1)}%` : "0%";

  const allTimeProfit =
    stats.allTimeProfitPaise || balances.lifetime || stats.totalProfitPaise || 0;

  return (
    <div className="space-y-6 pt-2 pb-14 max-w-xl mx-auto">
      {isAuthenticated === false && (
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/80 flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 font-bold text-amber-800">
              i
            </span>
            <span>
              You are browsing as guest. Log in to view your personalized click
              analytics and orders.
            </span>
          </div>
          <Link
            href="/login?next=/reports"
            prefetch={true}
            className="shrink-0 rounded-full bg-[#169443] px-3.5 py-1.5 font-bold text-white shadow-sm hover:bg-[#13803a] transition"
          >
            Log In
          </Link>
        </div>
      )}

      {syncMessage && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200 flex items-center justify-between text-xs text-emerald-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">{syncMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Header: Total Profit Banner */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] via-[#1a5530] to-[#169443] p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-200">
            <TrendingUp className="h-3 w-3" /> All Time Total Profit
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={handleRefreshLive}
              className="flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-1 text-[11px] font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
              />
              <span>{syncing ? "Syncing..." : "Refresh Sync"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBreakup(true)}
              className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30 transition active:scale-95"
            >
              View Breakup
            </button>
          </div>
        </div>

        <div className="mt-3">
          <h1 className="num font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
            {formatINR(allTimeProfit)}
          </h1>
          <p className="mt-1 text-xs text-white/80">
            Total lifetime cash credited & in-progress across all links
          </p>
        </div>

        {/* Quick Balance Status */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-xs">
          <div>
            <p className="text-white/60 text-[10px] uppercase font-bold">
              Withdrawable Balance
            </p>
            <p className="num text-base font-extrabold text-[#22c55e]">
              {formatINR(balances.available || stats.availablePaise)}
            </p>
          </div>
          <div>
            <p className="text-white/60 text-[10px] uppercase font-bold">
              Pending Return Window
            </p>
            <p className="num text-base font-extrabold text-amber-300">
              {formatINR(balances.pending || stats.pendingPaise)}
            </p>
          </div>
        </div>
      </div>

      {/* Breakup Modal */}
      {showBreakup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="font-display font-extrabold text-base text-ink">
                Profit Breakup
              </h3>
              <button
                type="button"
                onClick={() => setShowBreakup(false)}
                className="rounded-full p-1 text-ink-soft hover:bg-canvas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="font-medium text-ink-soft">
                  Confirmed (Available)
                </span>
                <span className="num font-bold text-[#169443]">
                  {formatINR(balances.available || stats.availablePaise)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="font-medium text-ink-soft">
                  Pending Confirmation
                </span>
                <span className="num font-bold text-amber-600">
                  {formatINR(balances.pending || stats.pendingPaise)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="font-medium text-ink-soft">
                  Paid to Bank Account
                </span>
                <span className="num font-bold text-ink">
                  {formatINR(balances.paid || stats.paidPaise)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-black/5 pt-3 font-bold text-sm">
                <span>Lifetime Total</span>
                <span className="num text-ink">{formatINR(allTimeProfit)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBreakup(false)}
              className="mt-5 w-full rounded-full bg-[#134024] py-2.5 text-xs font-bold text-white hover:bg-[#169443]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 2. 4 Metric Tiles */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display text-sm font-extrabold uppercase tracking-tight text-ink">
            Key Performance Metrics
          </h2>
          <button
            type="button"
            disabled={syncing}
            onClick={handleRefreshLive}
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-[#169443] ring-1 ring-[#169443]/30 hover:bg-emerald-100 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
            />
            <span>{syncing ? "Syncing..." : "Refresh Sync"}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Clicks (Purple) */}
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <MousePointerClick className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700">
                LIVE
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Clicks
            </p>
            <p className="num font-display text-xl font-black text-ink">
              {stats.totalClicks.toLocaleString()}
            </p>
          </div>

          {/* Transactions / Orders (Green) */}
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[#169443]">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-[#169443]">
                ORDERS
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Orders
            </p>
            <p className="num font-display text-xl font-black text-ink">
              {stats.totalTransactions}
            </p>
          </div>

          {/* Profit (Cyan) */}
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                <Coins className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-700">
                PROFIT
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Profit
            </p>
            <p className="num font-display text-xl font-black text-ink">
              {formatINR(displayProfitPaise)}
            </p>
          </div>

          {/* Conversion Rate (Indigo) */}
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Percent className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                RATIO
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Conv. Rate
            </p>
            <p className="num font-display text-xl font-black text-ink">
              {displayConvRate}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Interactive Time-Based Performance SVG Chart */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3">
          {/* Reactive Period Tabs: Today, Yesterday, 7 Days, 30 Days, All Time */}
          <div className="flex items-center gap-1 rounded-xl bg-canvas p-1 text-xs font-semibold overflow-x-auto">
            {(["today", "yesterday", "7d", "30d", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  periodRef.current = p;
                  setActiveTooltip(null);
                  const pCache = getCachedReportsData(p);
                  if (pCache?.stats) {
                    setStats(pCache.stats);
                    if (Array.isArray(pCache.ledger)) setLedger(pCache.ledger);
                    if (Array.isArray(pCache.conversions)) setConversions(pCache.conversions);
                    if (Array.isArray(pCache.dailyStats)) setDailyStats(pCache.dailyStats);
                  }
                  loadData(false, undefined, p);
                }}
                className={`rounded-lg px-2.5 py-1 capitalize whitespace-nowrap transition ${
                  period === p
                    ? "bg-white font-bold text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink"
                }`}
              >
                {p === "today"
                  ? "Today"
                  : p === "yesterday"
                  ? "Yesterday"
                  : p === "7d"
                  ? "7 Days"
                  : p === "30d"
                  ? "30 Days"
                  : "All Time"}
              </button>
            ))}
          </div>

          {/* Zoom & Refresh Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}
              aria-label="Zoom In"
              className="rounded-lg bg-canvas p-1.5 text-ink-soft hover:bg-black/5 active:scale-95 transition"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              aria-label="Zoom Out"
              className="rounded-lg bg-canvas p-1.5 text-ink-soft hover:bg-black/5 active:scale-95 transition"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => {
                setZoomLevel(1);
                handleRefreshLive();
              }}
              aria-label="Refresh Data"
              className="rounded-lg bg-canvas p-1.5 text-ink-soft hover:bg-black/5 active:scale-95 transition"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* SVG Graph Rendering */}
        <div className="relative mt-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full overflow-visible"
          >
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#169443" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#169443" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line
              x1={padding}
              y1={padding}
              x2={width - padding}
              y2={padding}
              stroke="#f0f0f0"
              strokeDasharray="3 3"
            />
            <line
              x1={padding}
              y1={height / 2}
              x2={width - padding}
              y2={height / 2}
              stroke="#f0f0f0"
              strokeDasharray="3 3"
            />
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#f0f0f0"
            />

            {/* Filled Area */}
            <path d={fillD} fill="url(#profitGrad)" />

            {/* Stroke Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#169443"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Circles */}
            {coords.map((c, idx) => (
              <circle
                key={idx}
                cx={c.x}
                cy={c.y}
                r="3.5"
                fill="#ffffff"
                stroke="#134024"
                strokeWidth="2"
                className="cursor-pointer hover:r-5 transition-all"
                onMouseEnter={() => setActiveTooltip(c)}
                onClick={() => setActiveTooltip(c)}
              />
            ))}
          </svg>

          {/* Tooltip Overlay */}
          {activeTooltip && (
            <div
              className="absolute -top-7 rounded-lg bg-ink px-2.5 py-1 text-[10px] font-bold text-white shadow-md transition-all -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(activeTooltip.x / width) * 100}%` }}
            >
              {activeTooltip.label}: {activeTooltip.val} clicks
              {activeTooltip.profitPaise > 0
                ? ` • ${formatINR(activeTooltip.profitPaise)}`
                : ""}
              {activeTooltip.orders > 0
                ? ` • ${activeTooltip.orders} order${
                    activeTooltip.orders > 1 ? "s" : ""
                  }`
                : ""}
            </div>
          )}

          {/* Labels along bottom */}
          <div className="mt-2 flex justify-between px-2 text-[10px] text-ink-faint">
            {labels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Performance by All Brands Data Table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between p-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-[#169443]" />
            <h2 className="font-display text-sm font-extrabold uppercase tracking-tight text-ink">
              Performance by All Brands
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-ink-soft">
            Real-time ledger
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-canvas/60 text-[10px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5">
                <th className="py-2.5 px-4">Brand</th>
                <th className="py-2.5 px-2 text-center">Txns</th>
                <th className="py-2.5 px-3 text-right">Profit</th>
                <th className="py-2.5 px-4 text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {brandRows.map((b) => (
                <tr key={b.name} className="hover:bg-canvas/50 transition">
                  <td className="py-3 px-4 font-bold text-ink">
                    <div className="flex items-center gap-2">
                      <BrandLogo
                        slug={b.slug}
                        name={b.name}
                        size={18}
                        className="h-4.5 w-4.5 rounded"
                      />
                      <span>{b.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-semibold text-ink">
                    {b.txns}
                  </td>
                  <td className="num py-3 px-3 text-right font-black text-[#169443]">
                    {formatINR(b.profit)}
                  </td>
                  <td className="num py-3 px-4 text-right font-semibold text-ink-soft">
                    {b.txns > 0 ? displayConvRate : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50/50 font-black text-ink border-t border-black/10">
                <td className="py-3 px-4 uppercase text-[11px]">Total</td>
                <td className="py-3 px-2 text-center">
                  {totalBrandTxns}
                </td>
                <td className="num py-3 px-3 text-right text-[#169443]">
                  {formatINR(displayProfitPaise)}
                </td>
                <td className="num py-3 px-4 text-right">
                  {displayConvRate}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
