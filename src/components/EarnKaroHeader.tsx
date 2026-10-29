"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Wallet,
  Home,
  Store,
  Link2,
  TrendingUp,
  User,
  Send,
  HelpCircle,
  BookOpen,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  LogIn,
  UserPlus,
} from "lucide-react";
import { formatINR } from "@/lib/money";

interface HeaderProps {
  totalProfitPaise?: number;
  availablePaise?: number;
}

export function EarnKaroHeader({
  totalProfitPaise: initialTotalProfit = 0,
  availablePaise: initialAvailable = 0,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name: string | null; email: string | null; role: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [liveProfit, setLiveProfit] = useState(initialTotalProfit);

  useEffect(() => {
    async function loadAuth() {
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
            setLiveProfit(statsData.balances.lifetime || 0);
          }
        }
      } catch {
        //
      }
    }
    loadAuth();
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setIsAdmin(false);
      setLiveProfit(0);
      setDrawerOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      //
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  }

  const drawerNav = [
    { label: "Home", href: "/", icon: Home },
    { label: "Our Partners", href: "/partners", icon: Store },
    { label: "Make Links", href: "/make-links", icon: Link2, highlight: true },
    { label: "Reports & Analytics", href: "/reports", icon: TrendingUp },
    { label: "My Profile", href: "/profile", icon: User },
    { label: "Telegram Bot Automation", href: "/telegram-bot", icon: Send, highlight: true },
    { label: "My Earnings & Withdrawal", href: "/earnings", icon: Wallet },
    { label: "My Link Performance", href: "/links", icon: Link2 },
    ...(isAdmin ? [{ label: "Admin Portal", href: "/admin", icon: ShieldCheck, admin: true }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#134024] text-white shadow-md">
        {/* Main Brand Bar */}
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-3 md:max-w-2xl lg:max-w-4xl">
          {/* Left: Drawer Toggle */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Navigation Drawer"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 active:scale-95 transition"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Center: Brand Logo with Leaf Mark */}
          <Link href="/" className="flex items-center gap-1.5 focus:outline-none">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1ba34e] text-white shadow-sm ring-1 ring-white/20">
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-10 4-4.22 4.22-3.1 9.5-3 10 .3.4.8.7 1.3.7 1.1 0 1.9-.9 1.9-2 0-3 3-5 5-7z" />
              </svg>
            </span>
            <div className="flex items-baseline font-black tracking-tight font-display text-xl leading-none">
              <span className="text-white">EARN</span>
              <span className="text-[#22c55e]">KARO</span>
            </div>
          </Link>

          {/* Right: Search & Quick Wallet */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Toggle Search"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 active:scale-95 transition"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/earnings"
              className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-white/20 transition ring-1 ring-white/15"
            >
              <Wallet className="h-3.5 w-3.5 text-[#22c55e]" />
              <span className="num hidden sm:inline">{formatINR(liveProfit)}</span>
            </Link>
          </div>
        </div>

        {/* Collapsible Search Row */}
        {searchOpen && (
          <div className="border-t border-white/10 bg-[#0c2817] px-3 py-2 animate-in fade-in slide-in-from-top-2">
            <form onSubmit={handleSearch} className="relative mx-auto max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                type="search"
                autoFocus
                placeholder="Search deals, products (e.g. Earbuds, Watch, Jeans)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-white/10 py-2 pl-9 pr-20 text-xs text-white placeholder-white/50 outline-none ring-1 ring-white/20 focus:bg-white/15 focus:ring-[#22c55e]"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-[#1ba34e] px-3 py-1 text-xs font-bold text-white hover:bg-[#169443]"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Sticky Total Profit Bar */}
        <div className="border-t border-white/10 bg-[#0e301b] py-2 px-3 text-xs shadow-inner">
          <div className="mx-auto flex max-w-lg items-center justify-between md:max-w-2xl lg:max-w-4xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-white/80 font-medium">My Total Profit:</span>
              <span className="num font-black text-white text-sm tracking-tight">
                {formatINR(liveProfit)}
              </span>
            </div>
            <Link
              href="/earnings"
              className="rounded-full bg-[#1ba34e] px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[#169443] transition active:scale-95"
            >
              Withdraw
            </Link>
          </div>
        </div>
      </header>

      {/* Slide-out Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="bg-[#134024] p-5 text-white">
              <div className="flex items-center justify-between">
                {user ? (
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-display font-extrabold text-base text-white ring-2 ring-white/40">
                      {(user.name || user.email || "P").slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm leading-snug">{user.name || "EarnKaro Partner"}</h3>
                      <p className="text-[11px] text-emerald-200/80 font-mono">ID: {user.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-display font-extrabold text-base text-white ring-2 ring-white/40">
                      G
                    </span>
                    <div>
                      <h3 className="font-bold text-sm leading-snug">Welcome, Guest</h3>
                      <p className="text-[11px] text-emerald-200/80">Log in to track earnings</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full p-1.5 text-white/80 hover:bg-white/15"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Guest Auth Buttons or Profit Snippet */}
              {user ? (
                <div className="mt-4 rounded-xl bg-black/25 p-3">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-emerald-300">
                    Total Confirmed Profit
                  </p>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <p className="num text-lg font-black text-white">{formatINR(liveProfit)}</p>
                    <Link
                      href="/earnings"
                      onClick={() => setDrawerOpen(false)}
                      className="text-[11px] font-bold text-[#22c55e] hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#22c55e] py-2 text-xs font-bold text-ink shadow-sm"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Log In</span>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/20 py-2 text-xs font-bold text-white ring-1 ring-white/25"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-sm">
              {drawerNav.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition ${
                      active
                        ? "bg-[#134024]/10 text-[#134024] font-bold"
                        : item.highlight
                        ? "text-[#169443] hover:bg-emerald-50"
                        : "text-ink hover:bg-canvas"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${active ? "text-[#134024]" : "text-ink-soft"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.highlight && (
                      <span className="rounded-full bg-[#1ba34e] px-2 py-0.5 text-[10px] font-extrabold text-white">
                        NEW
                      </span>
                    )}
                    {item.admin && (
                      <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-extrabold">
                        ADMIN
                      </span>
                    )}
                  </Link>
                );
              })}

              <hr className="my-2 border-black/5" />

              <p className="px-3.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                COMMUNITY & TOOLS
              </p>

              <a
                href="https://t.me/earnkaro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-ink hover:bg-canvas transition"
              >
                <div className="flex items-center gap-3">
                  <Send className="h-4 w-4 text-[#0088cc]" />
                  <span>Join Our Telegram</span>
                </div>
                <span className="rounded-full bg-[#0088cc]/10 text-[#0088cc] px-2 py-0.5 text-[10px] font-bold">
                  200K+
                </span>
              </a>

              <Link
                href="/profile#academy"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-ink hover:bg-canvas transition"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-ink-soft" />
                  <span>EarnKaro Academy</span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-faint" />
              </Link>

              <Link
                href="/profile#support"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-ink hover:bg-canvas transition"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 text-ink-soft" />
                  <span>Profit Didn't Track?</span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-faint" />
              </Link>

              {user && (
                <>
                  <hr className="my-2 border-black/5" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-red-600 hover:bg-red-50 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="h-4 w-4 text-red-600" />
                      <span>Log Out</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-red-400" />
                  </button>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-black/5 bg-canvas/60 p-4">
              <div className="flex items-center justify-between text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1 font-semibold text-[#134024]">
                  <ShieldCheck className="h-4 w-4 text-[#1ba34e]" />
                  100% Verified Deals
                </span>
                <span className="text-[11px] text-ink-faint">v2.5.0</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
