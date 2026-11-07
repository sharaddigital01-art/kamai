"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Tag,
  Store,
  Check,
  LoaderCircle,
  Settings,
} from "lucide-react";
import {
  AppBannerItem,
  FeaturedDealItem,
  PartnerStoreItem,
} from "./contentStore";
import { HeroBannersCMS } from "@/components/admin/content/HeroBannersCMS";
import { FeaturedDealsCMS } from "@/components/admin/content/FeaturedDealsCMS";
import { PartnerStoresCMS } from "@/components/admin/content/PartnerStoresCMS";

type ContentTab = "banners" | "deals" | "stores";

export default function ContentManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ContentTab>("banners");
  const [banners, setBanners] = useState<AppBannerItem[]>([]);
  const [deals, setDeals] = useState<FeaturedDealItem[]>([]);
  const [stores, setStores] = useState<PartnerStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  function notify(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3500);
  }

  const fetchAllContent = useCallback(async () => {
    try {
      setLoading(true);

      const bannersPromise = fetch("/admin/content/api/banners")
        .then((r) => {
          if (r.status === 401 || r.status === 403) {
            router.replace("/reports");
            return null;
          }
          return r.ok ? r.json() : null;
        })
        .catch(() => null);

      const dealsPromise = fetch("/admin/content/api/deals")
        .then((r) => {
          if (r.status === 401 || r.status === 403) {
            router.replace("/reports");
            return null;
          }
          return r.ok ? r.json() : null;
        })
        .catch(() => null);

      const storesPromise = fetch("/admin/content/api/stores")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const [bannersRes, dealsRes, storesRes] = await Promise.all([
        bannersPromise,
        dealsPromise,
        storesPromise,
      ]);

      if (bannersRes?.banners) setBanners(bannersRes.banners);
      if (dealsRes?.deals) setDeals(dealsRes.deals);
      if (storesRes?.stores) setStores(storesRes.stores);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAllContent();
  }, [fetchAllContent]);

  const tabs = [
    {
      id: "banners" as ContentTab,
      label: "Hero Banners CMS",
      icon: ImageIcon,
      count: banners.filter((b) => b.isActive).length,
    },
    {
      id: "deals" as ContentTab,
      label: "Featured Deals CMS",
      icon: Tag,
      count: deals.filter((d) => d.isActive).length,
    },
    {
      id: "stores" as ContentTab,
      label: "Partner Merchants",
      icon: Store,
      count: stores.filter((s) => s.status === "ACTIVE").length,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-[#0c1e13] via-[#134024] to-[#169443] p-5 sm:p-6 text-white shadow-lg border border-white/10">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/20 shadow-sm shrink-0">
            <Layers className="h-6 w-6 text-[#22c55e]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
                Dynamic Content Management CMS
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#22c55e] border border-[#22c55e]/30">
                <Sparkles className="h-3 w-3" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              Control hero promotional carousel artwork, handpicked high-converting deals, and merchant profit tags.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition ring-1 ring-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Admin Home</span>
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#134024] hover:bg-emerald-50 transition shadow-sm"
          >
            <span>View Live Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Global Notification Toast */}
      {actionMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 border border-emerald-200 animate-in fade-in shadow-xs">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-white p-1.5 border border-black/5 shadow-xs overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-[#134024] text-white shadow-xs"
                  : "text-ink-soft hover:bg-canvas hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-ink-soft"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#169443]" />
            <p className="text-xs text-ink-soft font-semibold">Loading content items...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "banners" && (
            <HeroBannersCMS
              banners={banners}
              loading={loading}
              onRefresh={fetchAllContent}
              notify={notify}
            />
          )}

          {activeTab === "deals" && (
            <FeaturedDealsCMS
              deals={deals}
              loading={loading}
              onRefresh={fetchAllContent}
              notify={notify}
            />
          )}

          {activeTab === "stores" && (
            <PartnerStoresCMS
              stores={stores}
              loading={loading}
              onRefresh={fetchAllContent}
              notify={notify}
            />
          )}
        </>
      )}
    </div>
  );
}
