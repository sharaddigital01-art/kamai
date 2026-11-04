"use client";

import Link from "next/link";
import { LogIn, UserPlus, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function LandingGuestHeroBanner() {
  const { isAuthenticated, loading } = useAuth();

  // If already authenticated or still resolving initial auth, unmount cleanly
  if (isAuthenticated || loading) {
    return null;
  }

  return (
    <section
      aria-label="Welcome Guest Hero"
      className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] via-[#1b5530] to-[#169443] p-5 sm:p-7 text-white shadow-lg my-2 text-center relative animate-in fade-in duration-300"
    >
      <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/20 shadow-md">
        <svg className="h-7 w-7 fill-white" viewBox="0 0 24 24">
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-10 4-4.22 4.22-3.1 9.5-3 10 .3.4.8.7 1.3.7 1.1 0 1.9-.9 1.9-2 0-3 3-5 5-7z" />
        </svg>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-200 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        <span>India&apos;s #1 Deal Sharing Platform</span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
        Welcome to Kamai Karo
      </h1>

      <p className="mt-1.5 text-xs sm:text-sm text-emerald-100 max-w-md mx-auto leading-relaxed">
        Log in or create a free account to track your earnings, make profit links, and withdraw real cash directly to your bank account.
      </p>

      {/* Action Buttons: Log In & Create Account */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
        <Link
          href="/login?next=/reports"
          className="flex w-full sm:w-auto flex-1 items-center justify-center gap-2 rounded-full bg-[#22c55e] px-6 py-3 font-extrabold text-ink hover:bg-emerald-300 transition shadow-md active:scale-95 text-xs sm:text-sm"
        >
          <LogIn className="h-4 w-4" />
          <span>Log In</span>
        </Link>
        <Link
          href="/signup?next=/reports"
          className="flex w-full sm:w-auto flex-1 items-center justify-center gap-2 rounded-full bg-white/20 px-6 py-3 font-extrabold text-white hover:bg-white/30 transition ring-1 ring-white/30 active:scale-95 text-xs sm:text-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Create Account</span>
        </Link>
      </div>

      {/* Mini Highlights */}
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/15 pt-3.5 text-left text-[11px]">
        <div className="flex items-center gap-2 rounded-xl bg-black/15 p-2 px-3">
          <Zap className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span className="text-white/90 font-medium">₹0 Joining Fee &bull; Instant UPI Payout</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-black/15 p-2 px-3">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
          <span className="text-white/90 font-medium">Flipkart, Amazon, Myntra & Ajio Deals</span>
        </div>
      </div>
    </section>
  );
}
