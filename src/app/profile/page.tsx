"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Link2,
  Share2,
  Users,
  Send,
  BookOpen,
  Award,
  HelpCircle,
  Settings,
  LogOut,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  History,
  Sliders,
  LogIn,
  UserPlus,
  LoaderCircle,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { WithdrawModal } from "@/components/WithdrawModal";

interface AuthUserData {
  id: string;
  email: string | null;
  name: string | null;
  role: "USER" | "ADMIN";
  referralCode: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const [balances, setBalances] = useState({
    lifetime: 0,
    available: 0,
    pending: 0,
  });

  async function refreshStats() {
    try {
      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.balances) {
          setBalances({
            lifetime: statsData.balances.lifetime || 0,
            available: statsData.balances.available || 0,
            pending: statsData.balances.pending || 0,
          });
        }
      }
    } catch {
      //
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const [authRes, statsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/stats"),
        ]);

        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.authenticated && authData.user) {
            setUser(authData.user);
            setIsAdmin(Boolean(authData.isAdmin || authData.user.role === "ADMIN"));
          } else {
            setUser(null);
            setIsAdmin(false);
          }
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.balances) {
            setBalances({
              lifetime: statsData.balances.lifetime || 0,
              available: statsData.balances.available || 0,
              pending: statsData.balances.pending || 0,
            });
          }
        }
      } catch {
        // Fallback
      } finally {
        setAuthLoading(false);
      }
    }

    init();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setIsAdmin(false);
      router.push("/login");
      router.refresh();
    } catch {
      //
    } finally {
      setLoggingOut(false);
    }
  }

  function copyUserId() {
    if (!user) return;
    navigator.clipboard?.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  function copyRefCode() {
    if (!user) return;
    navigator.clipboard?.writeText(user.referralCode);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-[#169443]" />
      </div>
    );
  }

  // Guest State: Prompt to Log In or Sign Up
  if (!user) {
    return (
      <div className="space-y-6 pt-4 pb-16 max-w-xl mx-auto px-4">
        {/* Guest Banner Card */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] via-[#1b5530] to-[#169443] p-6 text-white shadow-lg text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/20 shadow-md">
            <svg className="h-8 w-8 fill-white" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-10 4-4.22 4.22-3.1 9.5-3 10 .3.4.8.7 1.3.7 1.1 0 1.9-.9 1.9-2 0-3 3-5 5-7z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-black text-white">
            Welcome to EarnKaro
          </h1>
          <p className="mt-1 text-xs text-emerald-100 max-w-sm mx-auto">
            Log in or create a free account to track your earnings, make profit links, and withdraw real cash to bank.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?next=/profile"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#22c55e] px-6 py-3 font-bold text-ink hover:bg-emerald-300 transition shadow-md active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span>Log In</span>
            </Link>
            <Link
              href="/signup?next=/profile"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white/20 px-6 py-3 font-bold text-white hover:bg-white/30 transition ring-1 ring-white/30 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Account</span>
            </Link>
          </div>
        </div>

        {/* Guest Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#169443] mb-2 font-black">
              ₹
            </span>
            <h3 className="font-bold text-sm text-ink">Zero Investment</h3>
            <p className="text-[11px] text-ink-soft mt-0.5">Start earning today with 0 registration fees</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-2 font-black">
              ⚡
            </span>
            <h3 className="font-bold text-sm text-ink">Direct UPI Payout</h3>
            <p className="text-[11px] text-ink-soft mt-0.5">Withdraw profits directly to Google Pay, PhonePe, Paytm</p>
          </div>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email || "P")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 pt-2 pb-16 max-w-xl mx-auto px-3 sm:px-4">
      {/* 1. Top Green Gradient Card */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] via-[#1b5530] to-[#169443] p-5 text-white shadow-lg">
        {/* User Info Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 font-display text-lg font-black text-white ring-2 ring-white/40 shadow-inner">
              {initials}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-black text-white leading-tight">
                  {user.name || "EarnKaro Partner"}
                </h1>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${isAdmin ? "bg-red-500 text-white" : "bg-amber-400 text-ink"}`}>
                  {isAdmin ? "Admin" : "Partner"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-200/90 mt-0.5">
                <span>User ID: <strong className="text-white font-mono">{user.id.slice(0, 8)}...</strong></span>
                <button
                  type="button"
                  onClick={copyUserId}
                  className="rounded p-0.5 hover:bg-white/10 active:scale-95 transition"
                  aria-label="Copy User ID"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/30 transition ring-1 ring-white/30 flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Admin</span>
            </Link>
          )}
        </div>

        {/* Profit Balances Grid (starts at 0.00 for fresh user) */}
        <div className="mt-5 rounded-2xl bg-black/25 p-4 backdrop-blur-sm">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                All Time Total Profit
              </p>
              <p className="num font-display text-2xl sm:text-3xl font-black text-white mt-0.5">
                {formatINR(balances.lifetime)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(true)}
              className="flex items-center gap-1 rounded-full bg-[#22c55e] px-4 py-1.5 text-xs font-extrabold text-ink hover:bg-emerald-300 transition shadow-sm active:scale-95"
            >
              <span>Withdraw</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
            <div>
              <p className="text-[11px] text-emerald-200/80">Available to Withdraw</p>
              <p className="num text-base font-bold text-white mt-0.5">
                {formatINR(balances.available)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-amber-200/80">Pending Profit</p>
              <p className="num text-base font-bold text-amber-300 mt-0.5">
                {formatINR(balances.pending)}
              </p>
            </div>
          </div>
        </div>

        {/* Referral Card */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-200">My Referral Code</span>
            <p className="font-mono font-bold tracking-wider text-white">{user.referralCode}</p>
          </div>
          <button
            type="button"
            onClick={copyRefCode}
            className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30 active:scale-95 transition"
          >
            {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedRef ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Admin Quick Banner */}
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white shadow-md hover:opacity-95 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </span>
            <div>
              <h3 className="font-bold text-sm leading-tight">Admin Dashboard</h3>
              <p className="text-xs text-rose-100">Manage stores, deals, payouts & platform revenue</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-white/90" />
        </Link>
      )}

      {/* Menu Groups */}
      <div className="space-y-4">
        {/* Group A: My Earnings */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="bg-canvas/50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5">
            Earnings & Payouts
          </div>
          <div className="divide-y divide-black/5 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(true)}
              className="flex w-full items-center justify-between p-3.5 hover:bg-canvas transition text-left"
            >
              <div className="flex items-center gap-3 font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#169443]">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <span>Request UPI Withdrawal</span>
                  <p className="text-[11px] text-ink-soft">Withdraw available balance with email OTP</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </button>

            <Link href="/earnings" className="flex items-center justify-between p-3.5 hover:bg-canvas transition">
              <div className="flex items-center gap-3 font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#169443]">
                  <Wallet className="h-4 w-4" />
                </span>
                <span>My Earnings Breakdown</span>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </Link>

            <Link href="/reports" className="flex items-center justify-between p-3.5 hover:bg-canvas transition">
              <div className="flex items-center gap-3 font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#169443]">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <span>Order Reports & Click Stats</span>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </Link>

            <Link href="/links" className="flex items-center justify-between p-3.5 hover:bg-canvas transition">
              <div className="flex items-center gap-3 font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#169443]">
                  <Link2 className="h-4 w-4" />
                </span>
                <span>My Converted Links History</span>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </Link>
          </div>
        </div>

        {/* Group B: Telegram Automation & Community */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="bg-canvas/50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5 flex items-center justify-between">
            <span>Telegram Channel Automation</span>
            <span className="rounded-full bg-emerald-100 text-[#169443] px-2 py-0.5 text-[9px] font-black uppercase">
              Bot Sync
            </span>
          </div>

          <div className="p-3.5 space-y-2.5">
            <Link
              href="/telegram-bot"
              className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#134024] to-[#0088cc] p-3.5 text-white shadow-sm hover:opacity-95 transition"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Send className="h-5 w-5 text-white" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm">Telegram Bot Automation</h4>
                    <span className="rounded-full bg-[#22c55e] text-ink px-1.5 py-0.2 text-[9px] font-black uppercase">
                      New
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-100">Auto-convert deals & post to your channel 24/7</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="https://t.me/earnkaro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl bg-canvas p-3 text-ink hover:bg-black/5 transition"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0088cc]/10 text-[#0088cc]">
                  <Send className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Join EarnKaro Official Telegram</h4>
                  <p className="text-[11px] text-ink-soft">Get top curated deals and instant price drop alerts</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-faint" />
            </a>
          </div>
        </div>

        {/* Group C: Account & Logout */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="bg-canvas/50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5">
            Account Actions
          </div>
          <div className="divide-y divide-black/5 text-xs sm:text-sm">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-between p-3.5 hover:bg-red-50 text-red-600 transition disabled:opacity-60 text-left"
            >
              <div className="flex items-center gap-3 font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  {loggingOut ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </span>
                <span>{loggingOut ? "Signing out..." : "Log Out / Switch Account"}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Withdrawal with Email OTP Modal */}
      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        availablePaise={balances.available}
        userEmail={user.email || ""}
        userName={user.name || undefined}
        onSuccess={() => {
          refreshStats();
        }}
      />
    </div>
  );
}
