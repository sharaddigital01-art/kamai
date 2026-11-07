"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  Edit2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ArrowUpRight,
  Layers,
  Sparkles,
  X,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { AppBannerItem } from "@/app/admin/content/contentStore";
import { ConfirmationModal } from "./ConfirmationModal";

interface HeroBannersCMSProps {
  banners: AppBannerItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

export function HeroBannersCMS({
  banners,
  loading,
  onRefresh,
  notify,
}: HeroBannersCMSProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AppBannerItem | null>(null);
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
    imageUrl: "",
    link: "",
    priority: 0,
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingBanner(null);
    setFormState({
      title: "",
      imageUrl: "",
      link: "/?store=flipkart",
      priority: (banners.length + 1) * 5,
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (banner: AppBannerItem) => {
    setEditingBanner(banner);
    setFormState({
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.link,
      priority: banner.priority,
      isActive: banner.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.imageUrl.trim() || !formState.link.trim()) {
      notify("Please fill all required banner fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/admin/content/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBanner?.id,
          ...formState,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        notify(json.error || "Failed to save banner.");
      } else {
        notify(editingBanner ? "Banner updated successfully!" : "New hero banner published!");
        setModalOpen(false);
        await onRefresh();
      }
    } catch {
      notify("Network error while saving banner.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActiveClick = (banner: AppBannerItem) => {
    const nextActive = !banner.isActive;
    if (!nextActive) {
      // Deactivating -> prompt confirmation
      setConfirmModal({
        isOpen: true,
        title: "Deactivate Hero Banner",
        message: `Are you sure you want to hide "${banner.title}" from the homepage? Shoppers will no longer see this promotion.`,
        confirmText: "Deactivate",
        isDestructive: true,
        action: async () => {
          await executeToggle(banner.id, nextActive);
        },
      });
    } else {
      executeToggle(banner.id, nextActive);
    }
  };

  const executeToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/admin/content/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle_active", isActive }),
      });
      if (res.ok) {
        notify(isActive ? "Banner activated on homepage!" : "Banner hidden from homepage.");
        await onRefresh();
      }
    } catch {
      notify("Failed to update banner status.");
    } finally {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteClick = (banner: AppBannerItem) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Hero Banner",
      message: `Are you sure you want to remove "${banner.title}"? This soft-deletes the banner and unmounts it from live carousel feeds.`,
      confirmText: "Delete Banner",
      isDestructive: true,
      action: async () => {
        try {
          const res = await fetch(`/admin/content/api/banners?id=${encodeURIComponent(banner.id)}`, {
            method: "DELETE",
          });
          if (res.ok) {
            notify("Banner deleted successfully.");
            await onRefresh();
          }
        } catch {
          notify("Failed to delete banner.");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-black/5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-base text-ink">
              Homepage Hero Banners CMS
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              {banners.filter((b) => b.isActive).length} Live
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage promotional top banners, festive campaign artwork, and click-through destination links.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition disabled:opacity-50"
            title="Refresh Banners"
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
            <span>Add Hero Banner</span>
          </button>
        </div>
      </div>

      {/* Banners Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banners.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-black/5 bg-white p-12 text-center text-ink-muted">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm text-ink">No banners configured</p>
            <p className="text-xs text-ink-soft mt-0.5">Click "Add Hero Banner" to publish your first banner.</p>
          </div>
        ) : (
          banners.map((b) => (
            <div
              key={b.id}
              className={`rounded-3xl border bg-white shadow-xs overflow-hidden flex flex-col justify-between transition ${
                b.isActive ? "border-black/5" : "border-neutral-200 opacity-70 bg-neutral-50/50"
              }`}
            >
              {/* Image Preview */}
              <div className="relative h-40 w-full bg-neutral-100 overflow-hidden group">
                <img
                  src={b.imageUrl}
                  alt={b.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback to placeholder image
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80";
                  }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs ${
                      b.isActive
                        ? "bg-emerald-600/90 text-white"
                        : "bg-neutral-800/80 text-neutral-300"
                    }`}
                  >
                    {b.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {b.isActive ? "Active" : "Inactive"}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                    <Layers className="h-2.5 w-2.5" />
                    Priority: {b.priority}
                  </span>
                </div>
              </div>

              {/* Banner Details */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-black text-sm text-ink leading-snug line-clamp-2">
                    {b.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-soft truncate font-mono">
                    <span className="font-semibold text-ink-muted">Link:</span>
                    <span className="truncate">{b.link}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleActiveClick(b)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      b.isActive
                        ? "text-neutral-600 hover:bg-neutral-100"
                        : "text-[#169443] hover:bg-emerald-50"
                    }`}
                  >
                    {b.isActive ? (
                      <>
                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      className="p-1.5 text-ink-muted hover:text-ink hover:bg-canvas rounded-lg transition"
                      title="Edit Banner"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(b)}
                      className="p-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Banner"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add / Edit Banner */}
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
                  <ImageIcon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display font-black text-base text-ink">
                    {editingBanner ? "Edit Hero Banner" : "Add Hero Banner"}
                  </h3>
                  <p className="text-xs text-ink-soft">Display banner in homepage top carousel</p>
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

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs pt-4">
              <div>
                <label className="font-bold text-ink">Banner Title / Campaign Name *</label>
                <input
                  required
                  placeholder="e.g. Flipkart Big Billion Days Specials"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Banner Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formState.imageUrl}
                  onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                  className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                />
                {formState.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-black/10 h-28 bg-canvas">
                    <img
                      src={formState.imageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink">Target Redirect URL / Route *</label>
                  <input
                    required
                    placeholder="e.g. /?store=flipkart"
                    value={formState.link}
                    onChange={(e) => setFormState({ ...formState, link: e.target.value })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                  />
                </div>

                <div>
                  <label className="font-bold text-ink">Priority Order (Higher = Shown First)</label>
                  <input
                    type="number"
                    value={formState.priority}
                    onChange={(e) => setFormState({ ...formState, priority: Number(e.target.value) })}
                    className="w-full rounded-xl bg-canvas p-2.5 border border-black/10 mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="banner-is-active"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#169443]"
                />
                <label htmlFor="banner-is-active" className="font-bold text-ink cursor-pointer">
                  Publish as Active on Live Homepage
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
                      {editingBanner ? "Save Changes" : "Publish Banner"}
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
