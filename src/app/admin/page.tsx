"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Store,
  Tag,
  CreditCard,
  Users,
  MousePointerClick,
  Coins,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Check,
  Percent,
  Power,
  Edit2,
  Save,
  LoaderCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { BrandLogo } from "@/components/BrandLogo";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "deals" | "stores" | "withdrawals">("overview");

  const [data, setData] = useState<{
    stores: any[];
    deals: any[];
    withdrawals: any[];
    stats: {
      totalRegisteredUsers: number;
      totalConvertedLinks: number;
      totalPlatformRevenuePaise: number;
      pendingPayoutsPaise: number;
    };
    recentClicks: any[];
    ledger: any[];
  }>({
    stores: [],
    deals: [],
    withdrawals: [],
    stats: {
      totalRegisteredUsers: 1,
      totalConvertedLinks: 0,
      totalPlatformRevenuePaise: 0,
      pendingPayoutsPaise: 0,
    },
    recentClicks: [],
    ledger: [],
  });

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Store editing state
  const [editingStoreSlug, setEditingStoreSlug] = useState<string | null>(null);
  const [editRatePct, setEditRatePct] = useState<string>("");

  // Store modal state
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [newStore, setNewStore] = useState({
    name: "",
    slug: "",
    commissionRateBps: 1000,
    category: "fashion",
    brandColor: "#134024",
  });

  // Deal modal state
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: "",
    storeSlug: "flipkart",
    price: "",
    mrp: "",
    imageUrl: "",
    offerTag: "Mega Festive Bonanza",
    destinationUrl: "",
    category: "electronics",
    isFeatured: true,
    isActive: true,
  });

  async function refreshAdminData() {
    try {
      const res = await fetch("/api/admin/data");
      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true);
        router.push("/?error=access-denied");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAdminData();
  }, []);

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3500);
  }

  // --- Store Actions ---
  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault();
    if (!newStore.name || !newStore.slug) return;
    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newStore),
      });
      if (res.ok) {
        notify(`Store "${newStore.name}" added successfully!`);
        setStoreModalOpen(false);
        setNewStore({ name: "", slug: "", commissionRateBps: 1000, category: "fashion", brandColor: "#134024" });
        await refreshAdminData();
      }
    } catch {
      notify("Failed to add store");
    }
  }

  async function toggleStoreStatus(store: any) {
    const nextStatus = store.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...store, status: nextStatus }),
      });
      if (res.ok) {
        notify(`Store ${store.name} status updated to ${nextStatus}`);
        await refreshAdminData();
      }
    } catch {
      notify("Update failed");
    }
  }

  async function handleSaveStoreRate(store: any) {
    const pct = parseFloat(editRatePct);
    if (isNaN(pct) || pct <= 0) {
      notify("Please enter a valid profit percentage.");
      return;
    }
    // bps: e.g. 10% with 60% user share = 1000 / 0.6 = ~1666 bps
    const userShareBps = store.userShareBps || 6000;
    const commissionRateBps = Math.round((pct * 1000000) / userShareBps);

    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...store,
          commissionRateBps,
        }),
      });
      if (res.ok) {
        notify(`Updated ${store.name} profit rate to Upto ${pct}%!`);
        setEditingStoreSlug(null);
        await refreshAdminData();
      }
    } catch {
      notify("Failed to update rate");
    }
  }

  // --- Deal Actions ---
  async function handleAddDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeal.title || !newDeal.price || !newDeal.mrp) return;
    try {
      const res = await fetch("/api/admin/deals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...newDeal,
          price: Number(newDeal.price),
          mrp: Number(newDeal.mrp),
          destinationUrl: newDeal.destinationUrl || `https://www.${newDeal.storeSlug}.com/dp/item-${Date.now()}`,
        }),
      });
      if (res.ok) {
        notify(`Deal "${newDeal.title}" published successfully!`);
        setDealModalOpen(false);
        setNewDeal({
          title: "",
          storeSlug: "flipkart",
          price: "",
          mrp: "",
          imageUrl: "",
          offerTag: "Mega Festive Bonanza",
          destinationUrl: "",
          category: "electronics",
          isFeatured: true,
          isActive: true,
        });
        await refreshAdminData();
      }
    } catch {
      notify("Failed to publish deal");
    }
  }

  async function toggleDealActive(dealId: string) {
    try {
      const res = await fetch("/api/admin/deals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: dealId }),
      });
      if (res.ok) {
        notify("Deal active status updated!");
        await refreshAdminData();
      }
    } catch {
      notify("Failed to toggle deal status");
    }
  }

  async function handleDeleteDeal(id: string) {
    if (!confirm("Are you sure you want to delete this deal?")) return;
    try {
      const res = await fetch(`/api/admin/deals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        notify("Deal deleted successfully");
        await refreshAdminData();
      }
    } catch {
      notify("Delete failed");
    }
  }

  // --- Withdrawal Actions ---
  async function handleWithdrawalDecision(id: string, status: "PAID" | "REJECTED") {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        notify(`Withdrawal marked as ${status}!`);
        await refreshAdminData();
      }
    } catch {
      notify("Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-[#169443]" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="my-10 max-w-md mx-auto p-6 rounded-3xl bg-red-50 text-red-800 ring-1 ring-red-200 text-center">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-2" />
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="text-xs text-red-700 mt-1">You must be logged in as an authorized administrator to view this portal.</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-red-700 px-5 py-2 text-xs font-bold text-white">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2 pb-16 max-w-4xl mx-auto px-3 sm:px-4">
      {/* Top Admin Header */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-[#134024] p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white ring-2 ring-white/30 shadow-inner">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-black text-white">EarnKaro Admin Portal</h1>
                <span className="rounded-full bg-emerald-500 text-ink text-[10px] font-black px-2 py-0.5 uppercase">
                  VERIFIED ADMIN
                </span>
              </div>
              <p className="text-xs text-purple-200/80">Manage Deals, Stores, Payouts & 30% Platform Cut</p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/25 active:scale-95 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to App
          </Link>
        </div>

        {/* Global Notification Toast */}
        {actionMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/40 animate-in fade-in">
            <Check className="h-4 w-4" /> {actionMsg}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-[#134024] text-white shadow-sm"
              : "text-ink-soft hover:bg-canvas hover:text-ink"
          }`}
        >
          <Coins className="h-4 w-4" /> Platform Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("deals")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "deals"
              ? "bg-[#134024] text-white shadow-sm"
              : "text-ink-soft hover:bg-canvas hover:text-ink"
          }`}
        >
          <Tag className="h-4 w-4" /> Manage Deals & Banners ({data.deals.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stores")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "stores"
              ? "bg-[#134024] text-white shadow-sm"
              : "text-ink-soft hover:bg-canvas hover:text-ink"
          }`}
        >
          <Store className="h-4 w-4" /> Partner Stores & Rates ({data.stores.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("withdrawals")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "withdrawals"
              ? "bg-[#134024] text-white shadow-sm"
              : "text-ink-soft hover:bg-canvas hover:text-ink"
          }`}
        >
          <CreditCard className="h-4 w-4" /> Withdrawal Requests (
          {data.withdrawals.filter((w) => w.status === "REQUESTED").length})
        </button>
      </div>

      {/* TAB 1: PLATFORM OVERVIEW (4 KPI CARDS REQUIRED) */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          {/* The 4 KPI Cards explicitly requested */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* KPI 1: Total Registered Users */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Users className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                Total Registered Users
              </p>
              <p className="num font-display text-2xl font-black text-ink mt-0.5">
                {data.stats.totalRegisteredUsers || 1}
              </p>
            </div>

            {/* KPI 2: Total Converted Links */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <MousePointerClick className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                Total Converted Links
              </p>
              <p className="num font-display text-2xl font-black text-ink mt-0.5">
                {data.stats.totalConvertedLinks || 0}
              </p>
            </div>

            {/* KPI 3: Total Platform Revenue (30% retained cut) */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#169443]">
                <Coins className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                Platform Revenue (30% Cut)
              </p>
              <p className="num font-display text-2xl font-black text-[#169443] mt-0.5">
                {formatINR(data.stats.totalPlatformRevenuePaise || 0)}
              </p>
            </div>

            {/* KPI 4: Pending Payouts */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CreditCard className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                Pending Payouts
              </p>
              <p className="num font-display text-2xl font-black text-amber-600 mt-0.5">
                {formatINR(data.stats.pendingPayoutsPaise || 0)}
              </p>
            </div>
          </div>

          {/* Recent Live Clicks Log */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="p-4 border-b border-black/5 flex items-center justify-between">
              <h3 className="font-display font-extrabold text-sm text-ink flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-ink-faint" /> Recent Tracked Activity & Clicks
              </h3>
              <span className="text-[11px] text-ink-faint">{data.recentClicks.length} events logged</span>
            </div>

            {data.recentClicks.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-faint">
                No clicks tracked yet. Share a deal link or click any product to see live tracking here!
              </div>
            ) : (
              <div className="divide-y divide-black/5 text-xs">
                {data.recentClicks.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-canvas/50">
                    <div>
                      <p className="font-bold text-ink">
                        Link Code: <span className="font-mono text-[#169443]">{c.code}</span> ({c.store})
                      </p>
                      <p className="text-[10px] text-ink-faint">Security Salted IP Hash: {c.ip}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-ink-soft">
                      {new Date(c.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE DEALS & BANNERS */}
      {activeTab === "deals" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-base text-ink">Manage Deals & Promotional Banners</h2>
              <p className="text-xs text-ink-soft">Add flash deals, festival banners, and edit active state</p>
            </div>
            <button
              type="button"
              onClick={() => setDealModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#134024] px-4 py-2 text-xs font-bold text-white hover:bg-[#169443] transition active:scale-95 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add New Deal
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-canvas/60 text-[10px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5">
                    <th className="py-3 px-4">Deal Title & Offer Tag</th>
                    <th className="py-3 px-3">Store</th>
                    <th className="py-3 px-3">Price / MRP</th>
                    <th className="py-3 px-3">Profit</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.deals.map((d) => (
                    <tr key={d.id} className="hover:bg-canvas/50">
                      <td className="py-3 px-4 font-bold text-ink max-w-[240px]">
                        <div className="flex items-center gap-2.5">
                          {d.imageUrl ? (
                            <img src={d.imageUrl} alt="" className="h-9 w-9 rounded-xl object-contain bg-canvas shrink-0 p-0.5" />
                          ) : (
                            <div className="h-9 w-9 rounded-xl bg-canvas grid place-items-center shrink-0">🛍️</div>
                          )}
                          <div className="truncate">
                            <span className="truncate block font-bold text-ink">{d.title}</span>
                            {d.offerTag ? (
                              <span className="inline-block rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 mt-0.5">
                                {d.offerTag}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-ink-soft">
                        <div className="flex items-center gap-1.5">
                          <BrandLogo slug={d.store?.slug} name={d.store?.name} size={16} className="h-4 w-4 rounded" />
                          <span>{d.store?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="num font-black text-ink">{formatINR(d.pricePaise)}</span>
                        <span className="num text-ink-faint line-through ml-1.5 text-[11px]">{formatINR(d.mrpPaise)}</span>
                      </td>
                      <td className="num py-3 px-3 font-bold text-[#169443]">
                        {formatINR(d.estimatedProfitPaise)}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleDealActive(d.id)}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black transition ${
                            d.isActive !== false
                              ? "bg-emerald-100 text-[#169443] hover:bg-emerald-200"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                          }`}
                        >
                          {d.isActive !== false ? "ACTIVE" : "PAUSED"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteDeal(d.id)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition"
                          aria-label="Delete deal"
                          title="Delete deal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PARTNER STORES & COMMISSION RATES */}
      {activeTab === "stores" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-base text-ink">Partner Stores & Profit Rates</h2>
              <p className="text-xs text-ink-soft">Update displayed profit percentages (e.g. Upto 8.5% Profit) and toggle active/paused</p>
            </div>
            <button
              type="button"
              onClick={() => setStoreModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#134024] px-4 py-2 text-xs font-bold text-white hover:bg-[#169443] transition active:scale-95 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Partner Brand
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-canvas/60 text-[10px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5">
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-3">Displayed Profit Rate</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.stores.map((s) => {
                    const currentProfitPct = ((s.commissionRateBps * (s.userShareBps || 6000)) / 1000000).toFixed(1);
                    const isEditing = editingStoreSlug === s.slug;

                    return (
                      <tr key={s.slug} className="hover:bg-canvas/50">
                        <td className="py-3 px-4 font-bold text-ink">
                          <div className="flex items-center gap-2.5">
                            <BrandLogo slug={s.slug} name={s.name} size={28} className="h-7 w-7 rounded-xl" />
                            <div>
                              <span>{s.name}</span>
                              <span className="block text-[10px] text-ink-faint font-normal font-mono">{s.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-ink text-xs">Upto</span>
                              <input
                                type="number"
                                step="0.1"
                                autoFocus
                                value={editRatePct}
                                onChange={(e) => setEditRatePct(e.target.value)}
                                className="w-16 rounded-lg bg-canvas px-2 py-1 text-xs font-bold text-[#169443] ring-1 ring-black/20 outline-none"
                              />
                              <span className="font-bold text-ink text-xs">%</span>
                              <button
                                type="button"
                                onClick={() => handleSaveStoreRate(s)}
                                className="rounded-md bg-[#169443] p-1 text-white hover:bg-emerald-700"
                                title="Save Rate"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#169443]">
                                Upto {currentProfitPct}% Profit
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStoreSlug(s.slug);
                                  setEditRatePct(currentProfitPct);
                                }}
                                className="rounded p-1 text-ink-soft hover:bg-canvas hover:text-ink"
                                title="Edit rate"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => toggleStoreStatus(s)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase transition ${
                              s.status === "ACTIVE"
                                ? "bg-emerald-100 text-[#169443] hover:bg-emerald-200"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                          >
                            {s.status}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleStoreStatus(s)}
                            className="rounded-lg bg-canvas px-3 py-1.5 text-[11px] font-bold text-ink hover:bg-black/10 transition"
                          >
                            {s.status === "ACTIVE" ? "Pause Store" : "Activate Store"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WITHDRAWAL REQUESTS MANAGEMENT */}
      {activeTab === "withdrawals" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-base text-ink">User Withdrawal Requests</h2>
              <p className="text-xs text-ink-soft">Review pending UPI payouts, mark as approved/paid, or reject to restore user balance</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            {data.withdrawals.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-faint">
                No user withdrawal requests found. Requests submitted by users will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-canvas/60 text-[10px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5">
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-3">Requested Amount</th>
                      <th className="py-3 px-3">UPI ID / Bank</th>
                      <th className="py-3 px-3">Request Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {data.withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-canvas/50">
                        <td className="py-3 px-4 font-bold text-ink">
                          <div>
                            <span className="block font-bold">{w.userName || "EarnKaro User"}</span>
                            <span className="block text-[10px] text-ink-soft font-normal">{w.userEmail || "user@earnkaro.com"}</span>
                          </div>
                        </td>
                        <td className="num py-3 px-3 font-black text-ink text-sm">
                          {formatINR(w.amountPaise)}
                        </td>
                        <td className="py-3 px-3 font-mono text-ink-soft">{w.upiId || "user@upi"}</td>
                        <td className="py-3 px-3 text-ink-faint text-[11px]">
                          {new Date(w.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                              w.status === "PAID"
                                ? "bg-emerald-100 text-[#169443]"
                                : w.status === "REJECTED" || w.status === "FAILED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {w.status === "FAILED" ? "REJECTED" : w.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {w.status === "REQUESTED" || w.status === "PROCESSING" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleWithdrawalDecision(w.id, "PAID")}
                                className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition active:scale-95 shadow-sm"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => handleWithdrawalDecision(w.id, "REJECTED")}
                                className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700 transition active:scale-95 shadow-sm"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-ink-faint">
                              {w.status === "PAID" ? "Completed" : "Closed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD DEAL WITH OFFER TAG & DESTINATION URL */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-extrabold text-base text-ink mb-1">Publish New Deal / Banner</h3>
            <p className="text-xs text-ink-soft mb-4">Adds deal directly to Home, Flash Deals and Category Sections.</p>

            <form onSubmit={handleAddDeal} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-ink">Deal Title</label>
                <input
                  required
                  placeholder="e.g. NASHER MILES Luggage Set of 3"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-ink">Store</label>
                  <select
                    value={newDeal.storeSlug}
                    onChange={(e) => setNewDeal({ ...newDeal, storeSlug: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                  >
                    {data.stores.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink">Offer Tag / Banner Badge</label>
                  <input
                    placeholder="e.g. Mega Festive Bonanza"
                    value={newDeal.offerTag}
                    onChange={(e) => setNewDeal({ ...newDeal, offerTag: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-ink">Deal Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="4999"
                    value={newDeal.price}
                    onChange={(e) => setNewDeal({ ...newDeal, price: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-ink">Original MRP (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="47985"
                    value={newDeal.mrp}
                    onChange={(e) => setNewDeal({ ...newDeal, mrp: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ink">Destination URL (Canonical Product Page)</label>
                <input
                  required
                  placeholder="https://www.flipkart.com/..."
                  value={newDeal.destinationUrl}
                  onChange={(e) => setNewDeal({ ...newDeal, destinationUrl: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Deal Image URL</label>
                <input
                  placeholder="https://images.unsplash.com/..."
                  value={newDeal.imageUrl}
                  onChange={(e) => setNewDeal({ ...newDeal, imageUrl: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-ink">Category</label>
                  <select
                    value={newDeal.category}
                    onChange={(e) => setNewDeal({ ...newDeal, category: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                  >
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion</option>
                    <option value="footwear">Footwear</option>
                    <option value="home">Home & Kitchen</option>
                    <option value="accessories">Accessories</option>
                    <option value="beauty">Beauty</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={newDeal.isFeatured}
                      onChange={(e) => setNewDeal({ ...newDeal, isFeatured: e.target.checked })}
                      className="rounded accent-[#169443]"
                    />
                    <span>Featured Deal</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setDealModalOpen(false)}
                  className="flex-1 rounded-full bg-canvas py-2.5 font-bold text-ink hover:bg-black/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-[#134024] py-2.5 font-bold text-white hover:bg-[#169443] transition shadow-md"
                >
                  Publish Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STORE */}
      {storeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-display font-extrabold text-base text-ink mb-1">Add Partner Brand</h3>
            <p className="text-xs text-ink-soft mb-4">Register a new store into the EarnKaro platform.</p>

            <form onSubmit={handleAddStore} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-ink">Brand Name</label>
                <input
                  required
                  placeholder="e.g. Nykaa, Zomato"
                  value={newStore.name}
                  onChange={(e) =>
                    setNewStore({
                      ...newStore,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, ""),
                    })
                  }
                  className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Store Slug</label>
                <input
                  required
                  placeholder="e.g. nykaa"
                  value={newStore.slug}
                  onChange={(e) => setNewStore({ ...newStore, slug: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Commission Rate (bps, 1000 = 10%)</label>
                <input
                  type="number"
                  required
                  value={newStore.commissionRateBps}
                  onChange={(e) => setNewStore({ ...newStore, commissionRateBps: Number(e.target.value) })}
                  className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Category</label>
                <select
                  value={newStore.category}
                  onChange={(e) => setNewStore({ ...newStore, category: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 outline-none ring-1 ring-black/10 mt-1"
                >
                  <option value="fashion">Fashion</option>
                  <option value="electronics">Electronics</option>
                  <option value="beauty">Beauty</option>
                  <option value="grocery">Grocery</option>
                  <option value="travel">Travel</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(false)}
                  className="flex-1 rounded-full bg-canvas py-2.5 font-bold text-ink hover:bg-black/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-[#134024] py-2.5 font-bold text-white hover:bg-[#169443]"
                >
                  Save Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
