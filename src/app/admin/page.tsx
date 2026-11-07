"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AdminHeader,
  AdminTab,
} from "@/components/admin/AdminHeader";
import {
  UserManagementTab,
  AdminUserData,
} from "@/components/admin/UserManagementTab";
import {
  PayoutsTab,
  AdminWithdrawalData,
} from "@/components/admin/PayoutsTab";
import {
  ReconciliationTab,
  ReconciliationData,
} from "@/components/admin/ReconciliationTab";
import {
  SystemConfigTab,
  SystemSettings,
} from "@/components/admin/SystemConfigTab";
import {
  Tag,
  Store,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  Save,
  LoaderCircle,
  ToggleLeft,
  ToggleRight,
  Percent,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Module 1: Users State
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [userStats, setUserStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    telegramConnected: number;
  }>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    telegramConnected: 0,
  });

  // Module 3: Withdrawals State
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalData[]>([]);

  // Modules 5 & 9: Reconciliation State
  const [reconciliation, setReconciliation] = useState<ReconciliationData>({
    clicksToday: 0,
    totalClicks: 0,
    lifetimeGrossPaise: 0,
    distributedUserProfitPaise: 0,
    platformNetProfitPaise: 0,
    pendingCutPaise: 0,
    approvedCutPaise: 0,
    rejectedCutPaise: 0,
    recentOrders: [],
  });

  // Module 11: Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    userSplitPct: 70,
    adminCutPct: 30,
    minWithdrawalInr: 50,
    amazonMasterTag: "kamaikaro02-21",
  });

  // Catalog State: Stores & Deals
  const [stores, setStores] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);

  // Store modal & rate editing state
  const [editingStoreSlug, setEditingStoreSlug] = useState<string | null>(null);
  const [editRatePct, setEditRatePct] = useState<string>("");
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

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3500);
  }

  // --- Data Fetching ---
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersPromise = fetch("/admin/api/users")
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            router.replace("/reports");
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .catch(() => null);

      // Fetch withdrawals
      const payoutsPromise = fetch("/admin/api/payouts")
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            router.replace("/reports");
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .catch(() => null);

      // Fetch reconciliation
      const reconPromise = fetch("/admin/api/reconciliation")
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      // Fetch settings
      const settingsPromise = fetch("/admin/api/settings")
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      // Fetch catalog stores & deals
      const catalogPromise = fetch("/api/admin/data")
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      const [usersRes, payoutsRes, reconRes, settingsRes, catalogRes] = await Promise.all([
        usersPromise,
        payoutsPromise,
        reconPromise,
        settingsPromise,
        catalogPromise,
      ]);

      if (usersRes) {
        if (usersRes.users) setUsers(usersRes.users);
        if (usersRes.stats) setUserStats(usersRes.stats);
      }

      if (payoutsRes && payoutsRes.withdrawals) {
        setWithdrawals(payoutsRes.withdrawals);
      }

      if (reconRes) {
        setReconciliation({
          clicksToday: reconRes.clicksToday || 0,
          totalClicks: reconRes.totalClicks || 0,
          lifetimeGrossPaise: reconRes.lifetimeGrossPaise || 0,
          distributedUserProfitPaise: reconRes.distributedUserProfitPaise || 0,
          platformNetProfitPaise: reconRes.platformNetProfitPaise || 0,
          pendingCutPaise: reconRes.pendingCutPaise || 0,
          approvedCutPaise: reconRes.approvedCutPaise || 0,
          rejectedCutPaise: reconRes.rejectedCutPaise || 0,
          recentOrders: reconRes.recentOrders || [],
        });
      }

      if (settingsRes && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }

      if (catalogRes) {
        if (catalogRes.stores) setStores(catalogRes.stores);
        if (catalogRes.deals) setDeals(catalogRes.deals);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Module 1: User Management Actions ---
  const handleToggleSuspendUser = async (userId: string, currentSuspended: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/admin/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: currentSuspended ? "activate" : "suspend",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        notify(json.error || "Failed to update account status");
      } else {
        notify(currentSuspended ? "User account activated!" : "User account suspended.");
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isSuspended: !currentSuspended } : u))
        );
        setUserStats((prev) => ({
          ...prev,
          activeUsers: currentSuspended ? prev.activeUsers + 1 : prev.activeUsers - 1,
          suspendedUsers: currentSuspended ? prev.suspendedUsers - 1 : prev.suspendedUsers + 1,
        }));
      }
    } catch {
      notify("Network error while updating user");
    } finally {
      setActionLoading(null);
    }
  };

  // --- Module 3: Payout Actions ---
  const handleMarkPayoutPaid = async (id: string, utr: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/admin/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "mark_paid",
          utr,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        notify(json.error || "Failed to mark payout as paid");
      } else {
        notify("Payout marked as PAID with UTR recorded!");
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === id ? { ...w, status: "PAID", utr, paidAt: new Date().toISOString() } : w
          )
        );
        // Refresh reconciliation metrics as ledger rows moved to PAID
        fetch("/admin/api/reconciliation")
          .then((r) => r.json())
          .then((reconRes) => {
            if (reconRes) setReconciliation((prev) => ({ ...prev, ...reconRes }));
          })
          .catch(() => {});
      }
    } catch {
      notify("Error settling payout");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPayout = async (id: string, reason: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/admin/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "reject",
          reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        notify(json.error || "Failed to reject payout");
      } else {
        notify("Withdrawal rejected. Funds returned to partner wallet!");
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === id ? { ...w, status: "FAILED", failureReason: reason } : w
          )
        );
      }
    } catch {
      notify("Error rejecting payout");
    } finally {
      setActionLoading(null);
    }
  };

  // --- Store Actions ---
  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault();
    if (!newStore.name || !newStore.slug) return;
    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStore),
      });
      if (res.ok) {
        notify(`Store "${newStore.name}" added successfully!`);
        setStoreModalOpen(false);
        setNewStore({ name: "", slug: "", commissionRateBps: 1000, category: "fashion", brandColor: "#134024" });
        await fetchAllData();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...store, status: nextStatus }),
      });
      if (res.ok) {
        notify(`Store ${store.name} status updated to ${nextStatus}`);
        setStores((prev) =>
          prev.map((s) => (s.id === store.id ? { ...s, status: nextStatus } : s))
        );
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
    const userShareBps = store.userShareBps || 6000;
    const commissionRateBps = Math.round((pct * 1000000) / userShareBps);

    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...store,
          commissionRateBps,
        }),
      });
      if (res.ok) {
        notify(`Updated ${store.name} profit rate to Upto ${pct}%!`);
        setEditingStoreSlug(null);
        await fetchAllData();
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
        headers: { "Content-Type": "application/json" },
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
        await fetchAllData();
      }
    } catch {
      notify("Failed to publish deal");
    }
  }

  async function toggleDealActive(dealId: string) {
    try {
      const res = await fetch("/api/admin/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dealId }),
      });
      if (res.ok) {
        notify("Deal active status updated!");
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, isActive: !d.isActive } : d))
        );
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
        setDeals((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      notify("Delete failed");
    }
  }

  const pendingWithdrawalsCount = withdrawals.filter(
    (w) => w.status === "REQUESTED" || w.status === "PROCESSING"
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Header with Navigation Tabs */}
      <AdminHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingWithdrawalsCount={pendingWithdrawalsCount}
        totalUsersCount={userStats.totalUsers || users.length}
      />

      {/* Global Notification Toast */}
      {actionMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 border border-emerald-200 animate-in fade-in shadow-xs">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Main Content Area Based on Active Tab */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#169443]" />
            <p className="text-xs text-ink-soft font-semibold">Loading admin portal...</p>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: USER MANAGEMENT (MODULE 1) */}
          {activeTab === "users" && (
            <UserManagementTab
              users={users}
              stats={userStats}
              loading={loading}
              onRefresh={fetchAllData}
              onToggleSuspend={handleToggleSuspendUser}
              actionLoading={actionLoading}
            />
          )}

          {/* TAB 2: PAYOUTS & WITHDRAWAL REQUESTS (MODULE 3) */}
          {activeTab === "withdrawals" && (
            <PayoutsTab
              withdrawals={withdrawals}
              loading={loading}
              onRefresh={fetchAllData}
              onMarkPaid={handleMarkPayoutPaid}
              onReject={handleRejectPayout}
              actionLoading={actionLoading}
            />
          )}

          {/* TAB 3: CLICKS & REVENUE RECONCILIATION (MODULES 5 & 9) */}
          {activeTab === "reconciliation" && (
            <ReconciliationTab
              data={reconciliation}
              loading={loading}
              onRefresh={fetchAllData}
              notify={notify}
            />
          )}

          {/* TAB 4: SYSTEM & PLATFORM CONFIG (MODULE 11) */}
          {activeTab === "config" && (
            <SystemConfigTab
              initialSettings={settings}
              loading={loading}
              onRefresh={fetchAllData}
              notify={notify}
            />
          )}

          {/* TAB 5: DEALS & BANNERS CATALOG */}
          {activeTab === "deals" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-black/5 shadow-xs">
                <div>
                  <h2 className="font-display font-black text-base text-ink">
                    Manage Deals & Promotional Banners
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Publish curated affiliate deals and hero banners for shoppers across Flipkart, Amazon, and Myntra.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDealModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#169443] hover:bg-[#134024] px-4 py-2 text-xs font-bold text-white transition shadow-xs self-start sm:self-center"
                >
                  <Plus className="h-4 w-4" /> Add New Deal
                </button>
              </div>

              <div className="rounded-3xl bg-white shadow-xs border border-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wider text-ink-soft border-b border-black/5">
                        <th className="py-3 px-4">Deal Title & Offer Tag</th>
                        <th className="py-3 px-3">Store</th>
                        <th className="py-3 px-3">Price / MRP</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {deals.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-ink-muted">
                            <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="font-semibold text-sm text-ink">No deals active</p>
                            <p className="text-xs text-ink-soft mt-0.5">Click "Add New Deal" to publish deals to the user home feed.</p>
                          </td>
                        </tr>
                      ) : (
                        deals.map((d) => (
                          <tr key={d.id} className="hover:bg-canvas/40 transition">
                            <td className="py-3 px-4 font-bold text-ink max-w-[240px]">
                              <div className="flex items-center gap-2.5">
                                {d.imageUrl && (
                                  <img
                                    src={d.imageUrl}
                                    alt={d.title}
                                    className="h-10 w-10 rounded-lg object-contain bg-canvas shrink-0 border border-black/5"
                                  />
                                )}
                                <div>
                                  <div className="truncate max-w-[200px]">{d.title}</div>
                                  {d.offerTag && (
                                    <span className="inline-block mt-0.5 rounded-md bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-900 border border-amber-300">
                                      {d.offerTag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold uppercase text-ink-soft">{d.storeSlug}</td>
                            <td className="py-3 px-3 font-mono">
                              <span className="font-bold text-ink">₹{d.price}</span>
                              {d.mrp && <span className="line-through text-ink-muted ml-1.5 text-[11px]">₹{d.mrp}</span>}
                            </td>
                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => toggleDealActive(d.id)}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  d.isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-neutral-100 text-neutral-500"
                                }`}
                              >
                                {d.isActive ? <ToggleRight className="h-3 w-3 text-emerald-600" /> : <ToggleLeft className="h-3 w-3" />}
                                {d.isActive ? "Active" : "Hidden"}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteDeal(d.id)}
                                className="rounded-lg p-1 text-ink-muted hover:text-red-600 hover:bg-red-50 transition"
                                title="Delete Deal"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PARTNER STORES & RATES */}
          {activeTab === "stores" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-black/5 shadow-xs">
                <div>
                  <h2 className="font-display font-black text-base text-ink">
                    Partner Stores & Commission Rates
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Manage supported merchant brands, profit rates displayed to users, and status toggles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#169443] hover:bg-[#134024] px-4 py-2 text-xs font-bold text-white transition shadow-xs self-start sm:self-center"
                >
                  <Plus className="h-4 w-4" /> Add Partner Brand
                </button>
              </div>

              <div className="rounded-3xl bg-white shadow-xs border border-black/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wider text-ink-soft border-b border-black/5">
                        <th className="py-3 px-4">Brand</th>
                        <th className="py-3 px-3">Displayed Profit Rate</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {stores.map((s) => {
                        const isEditing = editingStoreSlug === s.slug;
                        const userShareBps = s.userShareBps || 6000;
                        const effectiveRatePct = ((s.commissionRateBps * userShareBps) / 1000000).toFixed(1);

                        return (
                          <tr key={s.id || s.slug} className="hover:bg-canvas/40 transition">
                            <td className="py-3 px-4 font-bold text-ink">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.brandColor || "#134024" }} />
                                <span>{s.name}</span>
                                <span className="font-mono text-[10px] text-ink-muted">({s.slug})</span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={editRatePct}
                                    onChange={(e) => setEditRatePct(e.target.value)}
                                    placeholder={effectiveRatePct}
                                    className="w-16 rounded-lg bg-canvas px-2 py-1 text-xs font-bold text-ink border border-black/10 focus:outline-none"
                                    autoFocus
                                  />
                                  <span className="text-xs font-bold text-ink-soft">%</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveStoreRate(s)}
                                    className="rounded-lg bg-[#169443] p-1 text-white hover:bg-[#134024]"
                                    title="Save Rate"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStoreSlug(null)}
                                    className="rounded-lg bg-canvas p-1 text-ink-soft hover:text-ink"
                                    title="Cancel"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#169443]">Upto {effectiveRatePct}% Profit</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStoreSlug(s.slug);
                                      setEditRatePct(effectiveRatePct);
                                    }}
                                    className="text-ink-muted hover:text-ink transition"
                                    title="Edit Rate"
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
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  s.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {s.status === "ACTIVE" ? "Active" : "Paused"}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => toggleStoreStatus(s)}
                                className="text-xs font-semibold text-ink-soft hover:text-ink underline"
                              >
                                {s.status === "ACTIVE" ? "Pause Store" : "Activate"}
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
        </>
      )}

      {/* MODAL: ADD DEAL */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <h3 className="font-display font-black text-base text-ink">Publish New Deal / Banner</h3>
              <button
                type="button"
                onClick={() => setDealModalOpen(false)}
                className="rounded-full p-1 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDeal} className="space-y-3.5 text-xs pt-4">
              <div>
                <label className="font-bold text-ink">Deal Title *</label>
                <input
                  required
                  placeholder="e.g. Boat Airdopes 141 ANC"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-ink">Store</label>
                  <select
                    value={newDeal.storeSlug}
                    onChange={(e) => setNewDeal({ ...newDeal, storeSlug: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                  >
                    {stores.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-ink">Category</label>
                  <select
                    value={newDeal.category}
                    onChange={(e) => setNewDeal({ ...newDeal, category: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                  >
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion</option>
                    <option value="beauty">Beauty</option>
                    <option value="home">Home & Kitchen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-ink">Discounted Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="999"
                    value={newDeal.price}
                    onChange={(e) => setNewDeal({ ...newDeal, price: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-ink">Original MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="2990"
                    value={newDeal.mrp}
                    onChange={(e) => setNewDeal({ ...newDeal, mrp: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ink">Offer Tag / Badge</label>
                <input
                  placeholder="e.g. 70% OFF · Hot Deal"
                  value={newDeal.offerTag}
                  onChange={(e) => setNewDeal({ ...newDeal, offerTag: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newDeal.imageUrl}
                  onChange={(e) => setNewDeal({ ...newDeal, imageUrl: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Destination URL</label>
                <input
                  type="url"
                  placeholder="https://www.flipkart.com/..."
                  value={newDeal.destinationUrl}
                  onChange={(e) => setNewDeal({ ...newDeal, destinationUrl: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setDealModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#169443] hover:bg-[#134024] text-white text-xs font-bold transition shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <h3 className="font-display font-black text-base text-ink">Add Partner Brand</h3>
              <button
                type="button"
                onClick={() => setStoreModalOpen(false)}
                className="rounded-full p-1 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStore} className="space-y-3.5 text-xs pt-4">
              <div>
                <label className="font-bold text-ink">Brand Name *</label>
                <input
                  required
                  placeholder="e.g. Myntra"
                  value={newStore.name}
                  onChange={(e) =>
                    setNewStore({
                      ...newStore,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                    })
                  }
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Slug *</label>
                <input
                  required
                  placeholder="e.g. myntra"
                  value={newStore.slug}
                  onChange={(e) => setNewStore({ ...newStore, slug: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 font-mono focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-ink">Commission Rate (BPS)</label>
                  <input
                    type="number"
                    value={newStore.commissionRateBps}
                    onChange={(e) => setNewStore({ ...newStore, commissionRateBps: Number(e.target.value) })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                  />
                  <span className="text-[10px] text-ink-muted">1000 bps = 10% gross</span>
                </div>

                <div>
                  <label className="font-bold text-ink">Brand Color</label>
                  <input
                    type="color"
                    value={newStore.brandColor}
                    onChange={(e) => setNewStore({ ...newStore, brandColor: e.target.value })}
                    className="w-full h-10 rounded-xl bg-canvas p-1 border border-black/10 mt-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#169443] hover:bg-[#134024] text-white text-xs font-bold transition shadow-xs"
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
