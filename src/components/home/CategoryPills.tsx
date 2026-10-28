"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";

const CATEGORIES = [
  { label: "All Deals", slug: "" },
  { label: "Super Sellers 🔥", slug: "super-sellers" },
  { label: "Electronics 📱", slug: "electronics" },
  { label: "Fashion 👗", slug: "fashion" },
  { label: "Footwear 👟", slug: "footwear" },
  { label: "Home & Kitchen 🏠", slug: "home" },
  { label: "Beauty & Care 💄", slug: "beauty" },
  { label: "Accessories ⌚", slug: "accessories" },
];

export function CategoryPills() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "";

  return (
    <div className="mt-4 -mx-4 px-4 overflow-x-auto scrollbar-none py-1">
      <div className="flex items-center gap-2 min-w-max">
        {CATEGORIES.map((cat) => {
          const isActive =
            (!activeCategory && !cat.slug) ||
            activeCategory.toLowerCase() === cat.slug.toLowerCase() ||
            (cat.slug === "super-sellers" && searchParams.get("sort") === "trending");

          const href = !cat.slug ? "/" : cat.slug === "super-sellers" ? "/?sort=trending" : `/?category=${cat.slug}`;

          return (
            <Link
              key={cat.label}
              href={href}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all shadow-sm active:scale-95",
                isActive
                  ? "bg-[#134024] text-white ring-1 ring-[#134024] font-bold"
                  : "bg-white text-ink-soft hover:bg-canvas hover:text-ink ring-1 ring-black/5"
              )}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
