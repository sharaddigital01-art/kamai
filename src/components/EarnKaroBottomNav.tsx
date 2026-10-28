"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Link2, TrendingUp, User } from "lucide-react";
import { clsx } from "clsx";

export function EarnKaroBottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isPartners = pathname === "/partners";
  const isMakeLinks = pathname === "/make-links";
  const isReports = pathname === "/reports";
  const isProfile = pathname === "/profile";

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {/* 1. Home */}
        <Link
          href="/"
          className={clsx(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors select-none",
            isHome ? "text-[#134024] font-bold" : "text-ink-soft hover:text-ink font-medium"
          )}
        >
          <Home className={clsx("h-5 w-5 transition-transform", isHome && "scale-110 text-[#169443]")} />
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          {isHome && <span className="h-1 w-1 rounded-full bg-[#169443] mt-0.5" />}
        </Link>

        {/* 2. Our Partners */}
        <Link
          href="/partners"
          className={clsx(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors select-none",
            isPartners ? "text-[#134024] font-bold" : "text-ink-soft hover:text-ink font-medium"
          )}
        >
          <Store className={clsx("h-5 w-5 transition-transform", isPartners && "scale-110 text-[#169443]")} />
          <span className="text-[10px] mt-0.5 tracking-tight">Our Partners</span>
          {isPartners && <span className="h-1 w-1 rounded-full bg-[#169443] mt-0.5" />}
        </Link>

        {/* 3. Make Links (Raised Center Round Green Icon) */}
        <div className="relative flex flex-1 flex-col items-center justify-center">
          <Link
            href="/make-links"
            aria-label="Make Links"
            className={clsx(
              "-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#134024] to-[#1ba34e] text-white shadow-[0_8px_16px_rgba(27,163,78,0.35)] ring-4 ring-white transition transform active:scale-90 hover:scale-105",
              isMakeLinks && "ring-[#22c55e]/40 shadow-[0_8px_20px_rgba(27,163,78,0.5)]"
            )}
          >
            <Link2 className="h-6 w-6 stroke-[2.4]" />
          </Link>
          <span
            className={clsx(
              "text-[10px] mt-1 tracking-tight select-none",
              isMakeLinks ? "text-[#134024] font-bold" : "text-ink-soft font-medium"
            )}
          >
            Make Links
          </span>
        </div>

        {/* 4. Reports */}
        <Link
          href="/reports"
          className={clsx(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors select-none",
            isReports ? "text-[#134024] font-bold" : "text-ink-soft hover:text-ink font-medium"
          )}
        >
          <TrendingUp className={clsx("h-5 w-5 transition-transform", isReports && "scale-110 text-[#169443]")} />
          <span className="text-[10px] mt-0.5 tracking-tight">Reports</span>
          {isReports && <span className="h-1 w-1 rounded-full bg-[#169443] mt-0.5" />}
        </Link>

        {/* 5. Profile */}
        <Link
          href="/profile"
          className={clsx(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors select-none",
            isProfile ? "text-[#134024] font-bold" : "text-ink-soft hover:text-ink font-medium"
          )}
        >
          <User className={clsx("h-5 w-5 transition-transform", isProfile && "scale-110 text-[#169443]")} />
          <span className="text-[10px] mt-0.5 tracking-tight">Profile</span>
          {isProfile && <span className="h-1 w-1 rounded-full bg-[#169443] mt-0.5" />}
        </Link>
      </div>
    </nav>
  );
}
