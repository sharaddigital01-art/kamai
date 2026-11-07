"use client";

import {
  X,
  User,
  Mail,
  Phone,
  Tag,
  KeyRound,
  Send,
  CreditCard,
  TrendingUp,
  MousePointerClick,
  ShoppingBag,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  LoaderCircle,
} from "lucide-react";
import { formatINR } from "@/lib/money";

interface UserProfileModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onToggleSuspend: (userId: string, currentSuspended: boolean) => Promise<void>;
  isUpdating?: boolean;
}

export function UserProfileModal({
  user,
  isOpen,
  onClose,
  onToggleSuspend,
  isUpdating = false,
}: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const isSuspended = Boolean(user.isSuspended);
  const tg = user.telegramConfig;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#134024] to-[#169443] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 font-black text-lg text-white">
              {((user.name || user.email || "P").charAt(0) || "P").toUpperCase()}
            </span>
            <div>
              <h3 className="font-display font-black text-lg text-white leading-tight">
                {user.name || "Kamai Karo Partner"}
              </h3>
              <p className="text-xs text-emerald-100 font-mono">ID: {user.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* Status & Role Pill */}
          <div className="flex items-center justify-between rounded-2xl bg-canvas p-3 border border-black/5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink-soft">Account Status:</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                  isSuspended
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-[#169443]"
                }`}
              >
                {isSuspended ? (
                  <>
                    <ShieldAlert className="h-3 w-3" /> Suspended
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3 w-3" /> Active
                  </>
                )}
              </span>
            </div>
            <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[10px] font-bold uppercase text-ink">
              {user.role}
            </span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-emerald-50/80 p-3 text-center border border-emerald-100">
              <TrendingUp className="h-4 w-4 text-[#169443] mx-auto mb-1" />
              <p className="text-[10px] uppercase font-bold text-emerald-800">Lifetime Profit</p>
              <p className="font-black text-sm text-[#134024] mt-0.5">
                {formatINR(user.lifetimeProfitPaise || 0)}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50/80 p-3 text-center border border-blue-100">
              <MousePointerClick className="h-4 w-4 text-blue-600 mx-auto mb-1" />
              <p className="text-[10px] uppercase font-bold text-blue-800">Total Clicks</p>
              <p className="font-black text-sm text-blue-950 mt-0.5">
                {user.clicksCount || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50/80 p-3 text-center border border-amber-100">
              <ShoppingBag className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-[10px] uppercase font-bold text-amber-800">Orders</p>
              <p className="font-black text-sm text-amber-950 mt-0.5">
                {user.ordersCount || 0}
              </p>
            </div>
          </div>

          {/* Credentials & Identifiers */}
          <div className="rounded-2xl bg-white p-4 border border-black/10 space-y-2.5">
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] text-ink-soft">
              Partner Identifiers
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-ink">
                <Mail className="h-4 w-4 text-ink-soft shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-ink">
                <Phone className="h-4 w-4 text-ink-soft shrink-0" />
                <span>{user.phone || "No phone linked"}</span>
              </div>
              <div className="flex items-center gap-2 text-ink">
                <KeyRound className="h-4 w-4 text-ink-soft shrink-0" />
                <span>SubID: <strong className="font-mono text-emerald-700">{user.subId}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-ink">
                <Tag className="h-4 w-4 text-ink-soft shrink-0" />
                <span>Referral: <strong className="font-mono">{user.referralCode}</strong></span>
              </div>
            </div>
          </div>

          {/* Payout & Banking Details */}
          <div className="rounded-2xl bg-white p-4 border border-black/10 space-y-2">
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] text-ink-soft flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-ink-soft" />
              <span>UPI & Payout Settings</span>
            </h4>
            {user.payoutAccount ? (
              <div className="rounded-xl bg-canvas p-3 border border-black/5 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-ink">{user.payoutAccount.upiId}</p>
                  <p className="text-[10px] text-ink-soft">Holder: {user.payoutAccount.accountHolder || user.name}</p>
                </div>
                <span className="rounded-full bg-emerald-100 text-[#169443] px-2 py-0.5 text-[10px] font-bold">
                  {user.payoutAccount.method}
                </span>
              </div>
            ) : (
              <p className="text-ink-soft italic">No UPI / Payout account submitted yet.</p>
            )}
          </div>

          {/* Telegram Channel Connection */}
          <div className="rounded-2xl bg-white p-4 border border-black/10 space-y-2">
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] text-ink-soft flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-[#0088cc]" />
              <span>Telegram Automation Status</span>
            </h4>
            {tg?.connected ? (
              <div className="rounded-xl bg-[#0088cc]/5 p-3 border border-[#0088cc]/20 flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink text-xs">{tg.targetChannelName || "Connected Channel"}</p>
                  <p className="text-[10px] text-[#0088cc] font-mono">User: @{tg.telegramUsername || "partner"}</p>
                </div>
                <span className="rounded-full bg-emerald-100 text-[#169443] px-2 py-0.5 text-[10px] font-bold">
                  Active Sync
                </span>
              </div>
            ) : (
              <p className="text-ink-soft italic">Telegram bot not linked.</p>
            )}
          </div>

          {/* Registration Date */}
          <div className="flex items-center gap-2 text-[11px] text-ink-soft">
            <Calendar className="h-3.5 w-3.5" />
            <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="border-t border-black/10 p-4 bg-canvas/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-ink-soft hover:bg-neutral-200 transition"
          >
            Close
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onToggleSuspend(user.id, isSuspended)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition shadow-sm active:scale-95 disabled:opacity-50 ${
              isSuspended
                ? "bg-[#169443] hover:bg-[#13803a]"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isUpdating ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : isSuspended ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
            <span>{isSuspended ? "Re-activate Account" : "Suspend Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
