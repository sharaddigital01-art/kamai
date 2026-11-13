"use client";

import { useState } from "react";
import {
  Store,
  Edit2,
  Save,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  RefreshCw,
  Percent,
  Trash2,
} from "lucide-react";
import { PartnerStoreItem } from "@/app/admin/content/contentStore";
import { ConfirmationModal } from "./ConfirmationModal";

interface PartnerStoresCMSProps {
  stores: PartnerStoreItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

export function PartnerStoresCMS({
  stores,
  loading,
  onRefresh,
  notify,
}: PartnerStoresCMSProps) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editRatePct, setEditRatePct] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Full Edit Modal State
  const [fullEditModalOpen, setFullEditModalOpen] = useState(false);
  const [fullEditForm, setFullEditForm] = useState({
    name: "",
    slug: "",
    displayedProfitPct: "10.0",
    status: "ACTIVE" as "ACTIVE" | "PAUSED",
    logoUrl: "",
    brandColor: "#134024",
  });

  const handleOpenFullEdit = (store: PartnerStoreItem) => {
    const userShareBps = store.userShareBps || 6000;
    const currentPct = ((store.commissionRateBps * userShareBps) / 1000000).toFixed(1);
    setFullEditForm({
      name: store.name || "",
      slug: store.slug || "",
      displayedProfitPct: currentPct,
      status: store.status || "ACTIVE",
      logoUrl: store.logoUrl || "",
      brandColor: store.brandColor || "#134024",
    });
    setFullEditModalOpen(true);
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullEditForm.name.trim() || !fullEditForm.slug.trim()) {
      notify("Store name and slug are required");
      return;
    }
    const pct = parseFloat(fullEditForm.displayedProfitPct);
    if (isNaN(pct) || pct <= 0) {
      notify("Please enter a valid profit percentage.");
      return;
    }

    try {
      const res = await fetch("/admin/content/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: fullEditForm.slug,
          name: fullEditForm.name.trim(),
          status: fullEditForm.status,
          displayedProfitPct: pct,
          logoUrl: fullEditForm.logoUrl.trim() || null,
          brandColor: fullEditForm.brandColor,
        }),
      });

      if (res.ok) {
        notify(`Store "${fullEditForm.name}" updated successfully!`);
        setFullEditModalOpen(false);
        await onRefresh();
      } else {
        notify("Failed to save store changes");
      }
    } catch {
      notify("Network error while saving store");
    }
  };

  const handleDeleteStoreClick = (store: PartnerStoreItem) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Partner Merchant",
      message: `Are you sure you want to delete "${store.name}"? This removes the store from partner listings.`,
      confirmText: "Delete Merchant",
      isDestructive: true,
      action: async () => {
        try {
          const res = await fetch(`/admin/content/api/stores?slug=${encodeURIComponent(store.slug)}`, {
            method: "DELETE",
          });
          if (res.ok) {
            notify(`Store "${store.name}" deleted successfully.`);
            await onRefresh();
          } else {
            notify("Failed to delete store.");
          }
        } catch {
          notify("Network error while deleting store.");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    isDestructive: false,
    action: async () => {},
  });

  const handleStartEdit = (store: PartnerStoreItem) => {
    setEditingSlug(store.slug);
    const userShareBps = store.userShareBps || 6000;
    const currentPct = ((store.commissionRateBps * userShareBps) / 1000000).toFixed(1);
    setEditRatePct(currentPct);
  };

  const handleSaveRate = async (store: PartnerStoreItem) => {
    const pct = parseFloat(editRatePct);
    if (isNaN(pct) || pct < 0.1 || pct > 100) {
      notify("Please enter a valid percentage between 0.1% and 100%.");
      return;
    }

    setUpdating(store.slug);
    try {
      const res = await fetch("/admin/content/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: store.slug,
          displayedProfitPct: pct,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        notify(json.error || "Failed to update store profit rate.");
      } else {
        notify(`Updated ${store.name} profit tag to Upto ${pct}% Profit!`);
        setEditingSlug(null);
        await onRefresh();
      }
    } catch {
      notify("Network error while updating store.");
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleStatusClick = (store: PartnerStoreItem) => {
    const nextStatus = store.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    if (nextStatus === "PAUSED") {
      setConfirmModal({
        isOpen: true,
        title: "Pause Partner Merchant",
        message: `Are you sure you want to pause ${store.name}? Deals and link conversion for ${store.name} will be marked as inactive.`,
        confirmText: "Pause Merchant",
        isDestructive: true,
        action: async () => {
          await executeStatusUpdate(store.slug, nextStatus);
        },
      });
    } else {
      executeStatusUpdate(store.slug, nextStatus);
    }
  };

  const executeStatusUpdate = async (slug: string, status: "ACTIVE" | "PAUSED") => {
    setUpdating(slug);
    try {
      const res = await fetch("/admin/content/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, status }),
      });
      if (res.ok) {
        notify(`Merchant status updated to ${status}.`);
        await onRefresh();
      }
    } catch {
      notify("Failed to update merchant status.");
    } finally {
      setUpdating(null);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-black/5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-base text-ink">
              Partner Merchants & Commission Tag Manager
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              {stores.filter((s) => s.status === "ACTIVE").length} Active Merchants
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage supported e-commerce stores (Amazon, Cuelinks, Flipkart, Myntra, Ajio) and their displayed user profit percentage tags.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition disabled:opacity-50 self-start sm:self-center"
          title="Refresh Stores"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#169443]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stores Table */}
      <div className="rounded-3xl bg-white shadow-xs border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wider text-ink-soft border-b border-black/5">
                <th className="py-3.5 px-4">Merchant Brand</th>
                <th className="py-3.5 px-4">Identifier Slug</th>
                <th className="py-3.5 px-4">Displayed Profit Percentage Tag</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {stores.map((s) => {
                const isEditing = editingSlug === s.slug;
                const isUpdatingThis = updating === s.slug;

                return (
                  <tr key={s.id || s.slug} className="hover:bg-canvas/40 transition">
                    {/* Merchant Name */}
                    <td className="py-3.5 px-4 font-bold text-ink">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-black/5"
                          style={{ backgroundColor: s.brandColor || "#134024" }}
                        />
                        <span className="text-sm font-black">{s.name}</span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-ink-soft">
                      {s.slug}
                    </td>

                    {/* Profit Tag with Inline Edit */}
                    <td className="py-3.5 px-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink-soft">Upto</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="100"
                            value={editRatePct}
                            onChange={(e) => setEditRatePct(e.target.value)}
                            className="w-20 rounded-lg bg-canvas px-2.5 py-1 text-xs font-bold text-ink border border-black/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                            autoFocus
                          />
                          <span className="text-xs font-bold text-[#169443]">% Profit</span>
                          <button
                            type="button"
                            onClick={() => handleSaveRate(s)}
                            disabled={isUpdatingThis}
                            className="rounded-lg bg-[#169443] p-1.5 text-white hover:bg-[#134024] transition disabled:opacity-50"
                            title="Save Profit Tag"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSlug(null)}
                            disabled={isUpdatingThis}
                            className="rounded-lg bg-canvas p-1.5 text-ink-soft hover:text-ink transition"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-bold text-xs text-[#169443] border border-emerald-200">
                            <Sparkles className="h-3 w-3" />
                            {s.profitTag}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(s)}
                            className="text-ink-muted hover:text-ink p-1 rounded transition"
                            title="Edit Commission Tag"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatusClick(s)}
                        disabled={isUpdatingThis}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        } disabled:opacity-50`}
                      >
                        {s.status === "ACTIVE" ? (
                          <ToggleRight className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-3 w-3" />
                        )}
                        <span>{s.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenFullEdit(s)}
                          className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-canvas transition"
                          title="Full Edit Store"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStoreClick(s)}
                          className="rounded-lg p-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Store"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Edit Store Modal */}
      {fullEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <h3 className="font-display font-black text-base text-ink">
                Edit Partner Brand
              </h3>
              <button
                type="button"
                onClick={() => setFullEditModalOpen(false)}
                className="rounded-full p-1 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFullEdit} className="space-y-3.5 text-xs pt-4">
              <div>
                <label className="font-bold text-ink">Brand Name *</label>
                <input
                  required
                  placeholder="e.g. Myntra"
                  value={fullEditForm.name}
                  onChange={(e) =>
                    setFullEditForm({ ...fullEditForm, name: e.target.value })
                  }
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Slug *</label>
                <input
                  required
                  disabled
                  value={fullEditForm.slug}
                  className="w-full rounded-xl bg-neutral-100 text-neutral-500 p-2.5 border border-black/10 mt-1 font-mono cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-ink">Profit Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="10.0"
                    value={fullEditForm.displayedProfitPct}
                    onChange={(e) =>
                      setFullEditForm({
                        ...fullEditForm,
                        displayedProfitPct: e.target.value,
                      })
                    }
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                  />
                  <span className="text-[10px] text-ink-muted">e.g. 10.0 = Upto 10% Profit</span>
                </div>

                <div>
                  <label className="font-bold text-ink">Status</label>
                  <select
                    value={fullEditForm.status}
                    onChange={(e) =>
                      setFullEditForm({
                        ...fullEditForm,
                        status: e.target.value as "ACTIVE" | "PAUSED",
                      })
                    }
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-ink">Logo URL / Image</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={fullEditForm.logoUrl}
                  onChange={(e) =>
                    setFullEditForm({ ...fullEditForm, logoUrl: e.target.value })
                  }
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Brand Accent Color</label>
                <input
                  type="color"
                  value={fullEditForm.brandColor}
                  onChange={(e) =>
                    setFullEditForm({ ...fullEditForm, brandColor: e.target.value })
                  }
                  className="w-full h-10 rounded-xl bg-canvas p-1 border border-black/10 mt-1 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setFullEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#169443] hover:bg-[#134024] text-white text-xs font-bold transition shadow-xs"
                >
                  Save Store Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.action}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
