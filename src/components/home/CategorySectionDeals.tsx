"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DealView } from "@/types";
import { EarnKaroDealCard } from "@/components/EarnKaroDealCard";

interface CategorySectionProps {
  title: string;
  storeBadge: string;
  badgeBg: string;
  storeSlug?: string;
  deals: DealView[];
}

export function CategorySectionDeals({
  title,
  storeBadge,
  badgeBg,
  storeSlug,
  deals,
}: CategorySectionProps) {
  if (deals.length === 0) return null;

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${badgeBg}`}>
            {storeBadge}
          </span>
          <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-ink">
            {title}
          </h2>
        </div>
        {storeSlug && (
          <Link
            href={`/?store=${storeSlug}`}
            className="flex items-center gap-0.5 text-xs font-bold text-[#169443] hover:underline"
          >
            See All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* 2-col on mobile, 3/4 on larger screens */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {deals.map((deal) => (
          <EarnKaroDealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  );
}
