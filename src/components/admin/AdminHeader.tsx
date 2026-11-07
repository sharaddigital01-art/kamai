"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Users,
  CreditCard,
  TrendingUp,
  Settings,
  Tag,
  Store,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Layers,
} from "lucide-react";

export type AdminTab =
  | "users"
  | "withdrawals"
  | "reconciliation"
  | "config"
  | "deals"
  | "stores";

interface AdminHeaderProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  pendingWithdrawalsCount?: number;
  totalUsersCount?: number;
}

export function AdminHeader({
  activeTab,
  setActiveTab,
  pendingWithdrawalsCount = 0,
  totalUsersCount = 0,
}: AdminHeaderProps) {
  const tabs = [
    {
      id: "users" as AdminTab,
      label: "User Management",
      icon: Users,
      badge: totalUsersCount > 0 ? String(totalUsersCount) : undefined,
    },
    {
      id: "withdrawals" as AdminTab,
      label: "Payouts & UPI",
      icon: CreditCard,
      badge: pendingWithdrawalsCount > 0 ? `${pendingWithdrawalsCount} pending` : undefined,
      badgeColor: "bg-amber-400 text-amber-950",
    },
    {
      id: "reconciliation" as AdminTab,
      label: "Clicks & Revenue",
      icon: TrendingUp,
    },
    {
      id: "config" as AdminTab,
      label: "System Config",
      icon: Settings,
    },
    {
      id: "deals" as AdminTab,
      label: "Deals Catalog",
      icon: Tag,
    },
    {
      id: "stores" as AdminTab,
      label: "Partner Stores",
      icon: Store,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-[#0c1e13] via-[#134024] to-[#169443] p-5 sm:p-6 text-white shadow-lg border border-white/10">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/20 shadow-sm shrink-0">
            <ShieldCheck className="h-6 w-6 text-[#22c55e]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
                Admin Management Portal
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#22c55e] border border-[#22c55e]/30">
                <Sparkles className="h-3 w-3" />
                Master Mode
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              Secure administration desk for Kamai Karo partners, financial payouts, and commission routing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href="/admin/content"
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition ring-1 ring-white/20 active:scale-95"
          >
            <Layers className="h-3.5 w-3.5 text-emerald-300" />
            <span>Content CMS</span>
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition ring-1 ring-white/20 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Reports</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-[#22c55e] px-4 py-2 text-xs font-bold text-[#0c1e13] hover:bg-emerald-300 transition shadow-sm active:scale-95"
          >
            <span>Live App</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Modern Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-black/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-2xl transition whitespace-nowrap active:scale-95 select-none ${
                isActive
                  ? "bg-[#134024] text-white shadow-sm ring-1 ring-[#134024]"
                  : "bg-white text-ink-soft hover:text-ink hover:bg-neutral-100 ring-1 ring-black/5"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-[#22c55e]" : "text-ink-soft"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    tab.badgeColor || (isActive ? "bg-white/20 text-white" : "bg-neutral-200 text-ink")
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
