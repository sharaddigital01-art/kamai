"use client";

import { useState } from "react";
import {
  Tag,
  Plus,
  Trash2,
  ExternalLink,
  Edit2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Sparkles,
  X,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { FeaturedDealItem } from "@/app/admin/content/contentStore";
import { ConfirmationModal } from "./ConfirmationModal";
import { formatINR } from "@/lib/money";

interface FeaturedDealsCMSProps {
  deals: FeaturedDealItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

const SUPPORTED_STORES = [
  { slug: "amazon", name: "Amazon" },
  { slug: "flipkart", name: "Flipkart" },
  { slug: "myntra", name: "Myntra" },
  { slug: "ajio", name: "Ajio" },
  { slug: "jiomart", name: "JioMart" },
  { slug: "cuelinks", name: "Cuelinks / Partner" },
];

export function FeaturedDealsCMS({
  deals,
  loading,
  onRefresh,
  notify,
}: FeaturedDealsCMSProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<FeaturedDealItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation modal states
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

  // Form state
  const [formState, setFormState] = useState({
    title: "",
    price: "",
    dealPrice: "",
    imageUrl: "",
    affiliateUrl: "",
    store: "flipkart",
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingDeal(null);
    setFormState({
      title: "",
      price: "",
      dealPrice: "",
      imageUrl: "",
      affiliateUrl: "",
      store: "flipkart",
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (deal: FeaturedDealItem) => {
    setEditingDeal(deal);
    setFormState({
      title: deal.title,
      price: String(deal.price),
      dealPrice: String(deal.dealPrice),
      imageUrl: deal.imageUrl || "",
      affiliateUrl: deal.affiliateUrl,
      store: deal.store,
      isActive: deal.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formState.title.trim() ||
      !formState.price ||
      !formState.dealPrice ||
      !formState.affiliateUrl.trim() ||
      !formState.store
    ) {
      notify("Please fill all required deal fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/admin/content/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDeal?.id,
          ...formState,
          price: Number(formState.price),
          dealPrice: Number(formState.dealPrice),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        notify(json.error || "Failed to save featured deal.");
      } else {
        notify(editingDeal ? "Featured deal updated!" : "New handpicked deal published!");
        setModalOpen(false);
        await onRefresh();
      }
    } catch {
      notify("Network error while saving deal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActiveClick = (deal: FeaturedDealItem) => {
    const nextActive = !deal.isActive;
    if (!nextActive) {
      setConfirmModal({
        isOpen: true,
        title: "Hide Featured Deal",
        message: `Are you sure you want to hide "${deal.title}" from the homepage and 'Make Links' sections?`,
        confirmText: "Hide Deal",
        isDestructive: true,
        action: async () => {
          await executeToggle(deal.id, nextActive);
        },
      });
    } else {
      executeToggle(deal.id, nextActive);
    }
  };

  const executeToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/admin/content/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle_active", isActive }),
      });
      if (res.ok) {
        notify(isActive ? "Deal visible on homepage & Make Links!" : "Deal hidden.");
        await onRefresh();
      }
    } catch {
      notify("Failed to update deal status.");
    } finally {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteClick = (deal: FeaturedDealItem) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Featured Deal",
      message: `Are you sure you want to remove "${deal.title}"? This soft-deletes the deal.`,
      confirmText: "Delete Deal",
      isDestructive: true,
      action: async () => {
        try {
          const res = await fetch(`/admin/content/api/deals?id=${encodeURIComponent(deal.id)}`, {
            method: "DELETE",
          });
          if (res.ok) {
            notify("Deal soft deleted.");
            await onRefresh();
          }
        } catch {
          notify("Failed to delete deal.");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Deal Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-black/5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-base text-ink">
              Featured Steal Deals CMS
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              {deals.filter((d) => d.isActive).length} Live on Feed & Make Links
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            Curate handpicked high-converting deals to display on the user homepage and inside the Make Links generator.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition disabled:opacity-50"
            title="Refresh Deals"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#169443]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-[#169443] hover:bg-[#134024] px-4 py-2 text-xs font-bold text-white transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Featured Deal</span>
          </button>
        </div>
      </div>

      {/* Deals Table / Cards */}
      <div className="rounded-3xl bg-white shadow-xs border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-canvas/60 text-[10px] font-bold uppercase tracking-wider text-ink-soft border-b border-black/5">
                <th className="py-3.5 px-4">Deal Title & Artwork</th>
                <th className="py-3.5 px-3">Target Store</th>
                <th className="py-3.5 px-3">Deal Price / MRP</th>
                <th className="py-3.5 px-3">Discount</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm text-ink">No featured deals added</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Click "Add Featured Deal" to promote handpicked products.
                    </p>
                  </td>
                </tr>
              ) : (
                deals.map((d) => {
                  const discountPct =
                    d.price > d.dealPrice
                      ? Math.round(((d.price - d.dealPrice) / d.price) * 100)
                      : 0;

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-canvas/40 transition ${
                        !d.isActive ? "opacity-60 bg-neutral-50/40" : ""
                      }`}
                    >
                      {/* Title & Image */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="flex items-center gap-3">
                          {d.imageUrl ? (
                            <img
                              src={d.imageUrl}
                              alt={d.title}
                              className="h-11 w-11 rounded-xl object-contain bg-canvas shrink-0 border border-black/5 p-1"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80";
                              }}
                            />
                          ) : (
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink-muted border border-black/5">
                              <ShoppingBag className="h-5 w-5" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-ink truncate">{d.title}</div>
                            <a
                              href={d.affiliateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#169443] hover:underline font-mono truncate max-w-[220px]"
                            >
                              <span>Affiliate URL</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Store */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-canvas px-2.5 py-0.5 font-bold uppercase text-[11px] text-ink border border-black/5">
                          {d.store}
                        </span>
                      </td>

                      {/* Price / MRP */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-display font-black text-sm text-[#169443]">
                          {formatINR(Math.round(d.dealPrice * 100))}
                        </div>
                        {d.price > d.dealPrice && (
                          <div className="text-[11px] text-ink-muted line-through">
                            {formatINR(Math.round(d.price * 100))}
                          </div>
                        )}
                      </td>

                      {/* Discount Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {discountPct > 0 ? (
                          <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 font-black text-[10px] text-amber-900 border border-amber-300">
                            {discountPct}% OFF
                          </span>
                        ) : (
                          <span className="text-ink-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActiveClick(d)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition ${
                            d.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                          }`}
                        >
                          {d.isActive ? (
                            <ToggleRight className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="h-3 w-3" />
                          )}
                          <span>{d.isActive ? "Shown" : "Hidden"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(d)}
                            className="p-1.5 text-ink-muted hover:text-ink hover:bg-canvas rounded-lg transition"
                            title="Edit Deal"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(d)}
                            className="p-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Deal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Deal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-[#169443] ring-1 ring-black/5">
                  <Tag className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display font-black text-base text-ink">
                    {editingDeal ? "Edit Handpicked Deal" : "Add Handpicked Deal"}
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Featured on homepage feed and Make Links generator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-4 text-xs pt-4">
              <div>
                <label className="font-bold text-ink">Product / Deal Title *</label>
                <input
                  required
                  placeholder="e.g. boAt Airdopes 141 ANC TWS Earbuds"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink">Target Merchant / Store *</label>
                  <select
                    value={formState.store}
                    onChange={(e) => setFormState({ ...formState, store: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 uppercase font-bold focus:bg-white focus:outline-none"
                  >
                    {SUPPORTED_STORES.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-ink">Original MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="4490"
                    value={formState.price}
                    onChange={(e) => setFormState({ ...formState, price: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink">Special Deal Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="1299"
                    value={formState.dealPrice}
                    onChange={(e) => setFormState({ ...formState, dealPrice: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 font-bold text-[#169443] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                  />
                </div>

                <div>
                  <label className="font-bold text-ink">Product Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formState.imageUrl}
                    onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 font-mono text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ink">Kamaikaro Affiliate / Destination URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.flipkart.com/... or https://amzn.to/..."
                  value={formState.affiliateUrl}
                  onChange={(e) => setFormState({ ...formState, affiliateUrl: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                />
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Users who click will be redirected through this link with affiliate attribution.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="deal-is-active"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#169443]"
                />
                <label htmlFor="deal-is-active" className="font-bold text-ink cursor-pointer">
                  Display actively on homepage feed & 'Make Links' section
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-soft hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#169443] hover:bg-[#134024] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {editingDeal ? "Save Changes" : "Publish Deal"}
                    </>
                  )}
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
