"use client";

import { Sparkles } from "lucide-react";
import type { DealView } from "@/types";
import { EarnKaroDealCard } from "@/components/EarnKaroDealCard";

interface TopSellersGridProps {
  deals: DealView[];
}

export function TopSellersGrid({ deals }: TopSellersGridProps) {
  // Take first 6 trending deals for Top Sellers
  const topDeals = deals.slice(0, 6);

  if (topDeals.length === 0) return null;

  return (
    <section className="mt-8">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
            TOP SELLERS
          </h2>
        </div>
        <span className="text-xs font-bold text-[#169443]">Most Shared Today</span>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {topDeals.map((deal) => (
          <EarnKaroDealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  );
}
