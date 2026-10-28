"use client";

import { useState, useEffect } from "react";
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
  Store,
  ChevronRight,
  Info,
  Calendar,
  X,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { BrandLogo } from "@/components/BrandLogo";

interface StatsData {
  totalProfitPaise: number;
  availablePaise: number;
  pendingPaise: number;
  paidPaise: number;
  inWithdrawalPaise: number;
  totalClicks: number;
  totalTransactions: number;
  convRate: string;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("30d");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBreakup, setShowBreakup] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{ x: number; y: number; val: number; label: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [stats, setStats] = useState<StatsData>({
    totalProfitPaise: 0,
    availablePaise: 0,
    pendingPaise: 0,
    paidPaise: 0,
    inWithdrawalPaise: 0,
    totalClicks: 0,
    totalTransactions: 0,
    convRate: "0.0%",
  });

  const [ledger, setLedger] = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);

  async function loadData() {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(Boolean(data.authenticated));
        if (data.stats) setStats(data.stats);
        if (data.ledger) setLedger(data.ledger);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function triggerSimulation() {
    setSimulating(true);
    try {
      const res = await fetch("/api/admin/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "conversion",
          storeSlug: "flipkart",
          orderAmountPaise: 189900,
          userAmountPaise: 14242,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      //
    } finally {
      setSimulating(false);
    }
  }

  // Dynamic chart data based on live clicks/orders
  const baseClicks = stats.totalClicks;
  const baseOrders = stats.totalTransactions;

  const points =
    baseClicks === 0 && baseOrders === 0
      ? [0, 0, 0, 0, 0, 0, 0]
      : [
          Math.max(0, Math.round(baseClicks * 0.1)),
          Math.max(0, Math.round(baseClicks * 0.2)),
          Math.max(0, Math.round(baseClicks * 0.15)),
          Math.max(0, Math.round(baseClicks * 0.4)),
          Math.max(0, Math.round(baseClicks * 0.35)),
          Math.max(0, Math.round(baseClicks * 0.6)),
          baseClicks,
        ];

  const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"];

  // SVG coordinates
  const width = 360;
  const height = 140;
  const padding = 20;

  const minVal = 0;
  const maxVal = Math.max(10, ...points);

  const coords = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1)) * (width - padding * 2);
    const range = maxVal - minVal || 1;
    const y = height - padding - ((val - minVal) / range) * (height - padding * 2) * zoomLevel;
    return { x, y: Math.max(padding, Math.min(height - padding, y)), val, label: labels[idx] || "" };
  });

  const pathD = coords.reduce((acc, c, idx) => {
    return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, "");

  const fillD = `${pathD} L ${coords[coords.length - 1]?.x ?? width} ${height} L ${coords[0]?.x ?? 0} ${height} Z`;

  return (
    <div className="space-y-6 pt-2 pb-14 max-w-xl mx-auto">
      {isAuthenticated === false && (
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/80 flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 font-bold text-amber-800">
              i
            </span>
            <span>You are browsing as guest. Log in to view your personalized click analytics and orders.</span>
          </div>
          <a
            href="/login?next=/reports"
            className="shrink-0 rounded-full bg-[#169443] px-3.5 py-1.5 font-bold text-white shadow-sm hover:bg-[#13803a] transition"
          >
            Log In
          </a>
        </div>
      )}

      {/* 1. Header: Total Profit Banner */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] via-[#1a5530] to-[#169443] p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-200">
            <TrendingUp className="h-3 w-3" /> All Time Total Profit
          </span>
          <button
            type="button"
            onClick={() => setShowBreakup(true)}
            className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30 transition active:scale-95"
          >
            View Breakup
          </button>
        </div>

        <div className="mt-3">
          <h1 className="num font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
            {formatINR(stats.totalProfitPaise)}
          </h1>
          <p className="mt-1 text-xs text-white/80">
            Total lifetime cash credited & in-progress across all links
          </p>
        </div>

        {/* Quick Balance Status */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-xs">
          <div>
            <p className="text-white/60 text-[10px] uppercase font-bold">Withdrawable Balance</p>
            <p className="num text-base font-extrabold text-[#22c55e]">{formatINR(stats.availablePaise)}</p>
          </div>
          <div>
            <p className="text-white/60 text-[10px] uppercase font-bold">Pending Return Window</p>
            <p className="num text-base font-extrabold text-amber-300">{formatINR(stats.pendingPaise)}</p>
          </div>
        </div>
      </div>

      {/* Breakup Modal */}
      {showBreakup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="font-display font-extrabold text-base text-ink">Profit Breakup</h3>
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
                <span className="font-medium text-ink-soft">Confirmed (Available)</span>
                <span className="num font-bold text-[#169443]">{formatINR(stats.availablePaise)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="font-medium text-ink-soft">Pending Confirmation</span>
                <span className="num font-bold text-amber-600">{formatINR(stats.pendingPaise)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="font-medium text-ink-soft">Paid to Bank Account</span>
                <span className="num font-bold text-ink">{formatINR(stats.paidPaise)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-black/5 pt-3 font-bold text-sm">
                <span>Lifetime Total</span>
                <span className="num text-ink">{formatINR(stats.totalProfitPaise)}</span>
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
          <span className="text-[11px] font-semibold text-ink-faint">Live tracking</span>
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
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Clicks</p>
            <p className="num font-display text-xl font-black text-ink">{stats.totalClicks.toLocaleString()}</p>
          </div>

          {/* Transactions (Green) */}
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[#169443]">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-[#169443]">
                CONFIRMED
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Orders</p>
            <p className="num font-display text-xl font-black text-ink">{stats.totalTransactions}</p>
          </div>

          {/* Profit (Cyan) */}
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                <Coins className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-700">
                REAL CASH
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Profit</p>
            <p className="num font-display text-xl font-black text-ink">{formatINR(stats.totalProfitPaise)}</p>
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
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Conv. Rate</p>
            <p className="num font-display text-xl font-black text-ink">{stats.convRate}</p>
          </div>
        </div>
      </div>

      {/* 3. Interactive Time-Based Performance SVG Chart */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3">
          {/* Period Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-canvas p-1 text-xs font-semibold">
            {(["today", "7d", "30d", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setActiveTooltip(null);
                }}
                className={`rounded-lg px-2.5 py-1 capitalize transition ${
                  period === p ? "bg-white font-bold text-ink shadow-sm" : "text-ink-faint hover:text-ink"
                }`}
              >
                {p === "today" ? "Today" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "All Time"}
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
              onClick={() => {
                setZoomLevel(1);
                loadData();
              }}
              aria-label="Refresh Data"
              className="rounded-lg bg-canvas p-1.5 text-ink-soft hover:bg-black/5 active:scale-95 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* SVG Graph Rendering */}
        <div className="relative mt-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#169443" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#169443" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f0f0f0" strokeDasharray="3 3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f0f0f0" strokeDasharray="3 3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f0f0f0" />

            {/* Filled Area */}
            <path d={fillD} fill="url(#profitGrad)" />

            {/* Stroke Line */}
            <path d={pathD} fill="none" stroke="#169443" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

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
              className="absolute -top-7 rounded-lg bg-ink px-2.5 py-1 text-[10px] font-bold text-white shadow-md transition-all -translate-x-1/2"
              style={{ left: `${(activeTooltip.x / width) * 100}%` }}
            >
              {activeTooltip.label}: {activeTooltip.val} clicks
            </div>
          )}

          {/* Labels along bottom */}
          <div className="mt-2 flex justify-between px-2 text-[10px] text-ink-faint">
            {labels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        {/* Live Simulation Quick Button */}
        <div className="mt-5 border-t border-black/5 pt-3.5 flex items-center justify-between">
          <p className="text-[11px] text-ink-soft">
            Testing conversions? Click below to simulate a real order conversion:
          </p>
          <button
            type="button"
            disabled={simulating}
            onClick={triggerSimulation}
            className="flex items-center gap-1 rounded-full bg-[#134024] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#169443] transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3 text-emerald-300" />
            {simulating ? "Crediting..." : "+ Simulate ₹142.42 Profit"}
          </button>
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
          <span className="text-[11px] font-semibold text-ink-soft">Real-time ledger</span>
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
              {[
                { name: "Flipkart", slug: "flipkart", txns: stats.totalTransactions, profit: stats.totalProfitPaise },
                { name: "Myntra", slug: "myntra", txns: 0, profit: 0 },
                { name: "Ajio", slug: "ajio", txns: 0, profit: 0 },
                { name: "Amazon", slug: "amazon", txns: 0, profit: 0 },
              ].map((b) => (
                <tr key={b.name} className="hover:bg-canvas/50 transition">
                  <td className="py-3 px-4 font-bold text-ink">
                    <div className="flex items-center gap-2">
                      <BrandLogo slug={b.slug} name={b.name} size={18} className="h-4.5 w-4.5 rounded" />
                      <span>{b.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-semibold text-ink">{b.txns}</td>
                  <td className="num py-3 px-3 text-right font-black text-[#169443]">
                    {formatINR(b.profit)}
                  </td>
                  <td className="num py-3 px-4 text-right font-semibold text-ink-soft">
                    {b.txns > 0 ? stats.convRate : "0.0%"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50/50 font-black text-ink border-t border-black/10">
                <td className="py-3 px-4 uppercase text-[11px]">Total</td>
                <td className="py-3 px-2 text-center">{stats.totalTransactions}</td>
                <td className="num py-3 px-3 text-right text-[#169443]">{formatINR(stats.totalProfitPaise)}</td>
                <td className="num py-3 px-4 text-right">{stats.convRate}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
