"use client";

import { Home, Link2, Tag, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useMakeLink } from "@/store/makeLink";

const LEFT = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/#deals", label: "Deals", Icon: Tag },
] as const;
const RIGHT = [
  { href: "/links", label: "My links", Icon: Link2 },
  { href: "/earnings", label: "Earnings", Icon: Wallet },
] as const;

function Item({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-ink" : "text-ink-faint")}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const openModal = useMakeLink((s) => s.openModal);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        {LEFT.map((i) => (
          <Item key={i.label} {...i} active={i.href === pathname} />
        ))}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => openModal()}
            aria-label="Make link"
            className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-saffron-500 text-ink shadow-lg ring-4 ring-white transition active:scale-95"
          >
            <Link2 className="h-6 w-6" aria-hidden />
          </button>
        </div>
        {RIGHT.map((i) => (
          <Item key={i.label} {...i} active={i.href === pathname} />
        ))}
      </div>
    </nav>
  );
}
