"use client";

import { Link2, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { useMakeLink } from "@/store/makeLink";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight" aria-label="Kamai home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-leaf-600 text-base text-white" aria-hidden>
        ₹
      </span>
      kamai
    </Link>
  );
}

export function Navbar({ signedIn, availablePaise }: { signedIn: boolean; availablePaise: number | null }) {
  const openModal = useMakeLink((s) => s.openModal);

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Logo />

        <form action="/" method="get" role="search" className="relative ml-2 hidden flex-1 md:block md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            name="q"
            type="search"
            placeholder="Search deals, brands, products"
            aria-label="Search deals"
            className="w-full rounded-full bg-canvas py-2.5 pl-9 pr-4 text-sm outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-ink/30"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => openModal()}
            className="hidden items-center gap-2 rounded-full bg-saffron-500 px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-saffron-400 sm:inline-flex"
          >
            <Link2 className="h-4 w-4" aria-hidden /> Make Link
          </button>

          {signedIn ? (
            <Link
              href="/earnings"
              className="num inline-flex items-center gap-2 rounded-full bg-leaf-50 px-3.5 py-2.5 text-sm font-semibold text-leaf-700 ring-1 ring-leaf-100 hover:bg-leaf-100"
            >
              <Wallet className="h-4 w-4" aria-hidden />
              {availablePaise === null ? "Earnings" : formatINR(availablePaise)}
            </Link>
          ) : (
            <Link href="/login" className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-soft">
              Log in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile search row */}
      <form action="/" method="get" role="search" className="relative px-4 pb-3 md:hidden">
        <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-[calc(50%+6px)] text-ink-faint" aria-hidden />
        <input
          name="q"
          type="search"
          placeholder="Search deals"
          aria-label="Search deals"
          className="w-full rounded-full bg-canvas py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ink/30"
        />
      </form>
    </header>
  );
}
