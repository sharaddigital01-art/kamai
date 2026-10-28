import Link from "next/link";
import { Zap, Gift, Percent, Send } from "lucide-react";

const PROMO_TILES = [
  {
    title: "Flash Sale",
    tag: "Up to 80% OFF",
    icon: Zap,
    gradient: "from-rose-500 to-red-600",
    href: "/#flash-deals",
    textColor: "text-white",
    bgTint: "bg-red-50",
  },
  {
    title: "Festive Bonanza",
    tag: "Extra 10% Profit",
    icon: Gift,
    gradient: "from-amber-500 to-orange-600",
    href: "/partners",
    textColor: "text-white",
    bgTint: "bg-amber-50",
  },
  {
    title: "100% Cashback",
    tag: "Zero Cost Buys",
    icon: Percent,
    gradient: "from-emerald-600 to-[#134024]",
    href: "/?sort=profit",
    textColor: "text-white",
    bgTint: "bg-emerald-50",
  },
  {
    title: "Telegram Hot Deals",
    tag: "Join 200k+ Users",
    icon: Send,
    gradient: "from-sky-500 to-blue-600",
    href: "https://t.me/earnkaro",
    external: true,
    textColor: "text-white",
    bgTint: "bg-sky-50",
  },
];

export function QuickPromoTiles() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {PROMO_TILES.map((t) => {
        const Icon = t.icon;
        const CardContent = (
          <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3 ring-1 ring-black/5 shadow-sm hover:shadow-md transition active:scale-98">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${t.gradient} text-white shadow-sm`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink leading-tight">{t.title}</p>
              <p className="truncate text-[10px] font-semibold text-[#169443] mt-0.5">{t.tag}</p>
            </div>
          </div>
        );

        return t.external ? (
          <a key={t.title} href={t.href} target="_blank" rel="noopener noreferrer">
            {CardContent}
          </a>
        ) : (
          <Link key={t.title} href={t.href}>
            {CardContent}
          </Link>
        );
      })}
    </div>
  );
}
