"use client";

import Link from "next/link";
import { Sparkles, Flame, ArrowRight, ExternalLink, Share2, Tag } from "lucide-react";
import { FeaturedDealItem } from "@/app/admin/content/contentStore";
import { formatINR } from "@/lib/money";

interface DynamicFeaturedDealsSectionProps {
  deals: FeaturedDealItem[];
}

export function DynamicFeaturedDealsSection({ deals }: DynamicFeaturedDealsSectionProps) {
  if (!deals || deals.length === 0) return null;

  return (
    <section className="mt-6 space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
            <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-black tracking-tight text-ink uppercase">
                Handpicked Steal Deals
              </h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-700">
                Trending
              </span>
            </div>
            <p className="text-[11px] text-ink-soft hidden sm:block">
              Curated high-converting products handpicked for maximum affiliate cashback
            </p>
          </div>
        </div>

        <Link
          href="/make-links"
          className="text-xs font-bold text-[#169443] hover:underline flex items-center gap-1"
        >
          <span>Share & Earn</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {deals.map((deal) => {
          const discountPct =
            deal.price > deal.dealPrice
              ? Math.round(((deal.price - deal.dealPrice) / deal.price) * 100)
              : 0;

          return (
            <div
              key={deal.id}
              className="group rounded-2xl sm:rounded-3xl border border-black/5 bg-white p-3 sm:p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              {/* Product Artwork & Badges */}
              <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl bg-canvas overflow-hidden mb-3 flex items-center justify-center">
                {deal.imageUrl ? (
                  <img
                    src={deal.imageUrl}
                    alt={deal.title}
                    className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80";
                    }}
                  />
                ) : (
                  <Tag className="h-10 w-10 text-ink-muted/30" />
                )}

                {/* Store Tag */}
                <div className="absolute top-2 left-2">
                  <span className="rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    {deal.store}
                  </span>
                </div>

                {/* Discount Tag */}
                {discountPct > 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-amber-950 shadow-xs">
                      {discountPct}% OFF
                    </span>
                  </div>
                )}
              </div>

              {/* Deal Info */}
              <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-ink line-clamp-2 leading-snug group-hover:text-[#169443] transition">
                    {deal.title}
                  </h3>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display font-black text-base sm:text-lg text-[#169443]">
                      {formatINR(Math.round(deal.dealPrice * 100))}
                    </span>
                    {deal.price > deal.dealPrice && (
                      <span className="text-[11px] text-ink-muted line-through">
                        {formatINR(Math.round(deal.price * 100))}
                      </span>
                    )}
                  </div>

                  {/* Share / Make Link Action */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <Link
                      href={`/make-links?url=${encodeURIComponent(deal.affiliateUrl)}`}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-[#169443] hover:bg-[#134024] py-2 text-[11px] font-bold text-white transition shadow-xs"
                    >
                      <span>Get Link</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <a
                      href={deal.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-canvas hover:bg-neutral-200 text-ink-soft transition border border-black/5"
                      title="Direct Store Link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
