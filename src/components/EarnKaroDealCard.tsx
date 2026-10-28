"use client";

import { useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";
import { formatINR } from "@/lib/money";
import { useMakeLink } from "@/store/makeLink";
import type { DealView } from "@/types";
import { BrandLogo } from "@/components/BrandLogo";

interface EarnKaroDealCardProps {
  deal: DealView;
  variant?: "grid" | "featured";
}

/** Get vibrant festive / brand gradient per store */
export function getStoreGradient(slug: string = ""): string {
  switch (slug.toLowerCase()) {
    case "flipkart":
      return "bg-gradient-to-br from-[#0272E9] via-[#0A58CA] to-[#043E8C]";
    case "amazon":
      return "bg-gradient-to-br from-[#FF9900] via-[#F08804] to-[#C95B00]";
    case "myntra":
      return "bg-gradient-to-br from-[#E5336A] via-[#C2185B] to-[#7B1FA2]";
    case "ajio":
      return "bg-gradient-to-br from-[#203a43] via-[#2c5364] to-[#12232a]";
    case "shopsy":
      return "bg-gradient-to-br from-[#6C3BF5] via-[#5A2BD8] to-[#3B1598]";
    case "nykaa":
      return "bg-gradient-to-br from-[#FC2779] via-[#E91E63] to-[#9C1258]";
    case "tatacliq":
      return "bg-gradient-to-br from-[#9B1D5E] via-[#880E4F] to-[#4A0033]";
    case "croma":
      return "bg-gradient-to-br from-[#00897B] via-[#00695C] to-[#004D40]";
    case "jiomart":
      return "bg-gradient-to-br from-[#0A3D8F] via-[#0D47A1] to-[#08285E]";
    default:
      return "bg-gradient-to-br from-[#134024] via-[#1A5330] to-[#0D2B18]";
  }
}

export function EarnKaroDealCard({ deal }: EarnKaroDealCardProps) {
  const [copied, setCopied] = useState(false);
  const openModal = useMakeLink((s) => s.openModal);

  const bannerGradient = getStoreGradient(deal.store.slug);

  function copyDeal(e: React.MouseEvent) {
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🔥 ${deal.store.name} Deal: ${deal.title} at ${formatINR(deal.pricePaise)} (MRP ${formatINR(deal.mrpPaise)})! Earn ${deal.estimatedProfitPaise > 0 ? formatINR(deal.estimatedProfitPaise) : "extra"} profit: ${origin}/r/deal-${deal.id.slice(0, 8)}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🔥 *${deal.store.name} Deal* 🔥\n*${deal.title}*\n\n💰 *Offer Price:* ${formatINR(deal.pricePaise)} (MRP ~${formatINR(deal.mrpPaise)}~)\n🤑 *You Also Earn:* ${deal.estimatedProfitPaise > 0 ? formatINR(deal.estimatedProfitPaise) : "High"} Profit\n\n👉 *Buy via Profit Link:* ${origin}/r/deal-${deal.id.slice(0, 8)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  const profitDisplay =
    deal.estimatedProfitPaise > 0
      ? `${formatINR(deal.estimatedProfitPaise)} Profit`
      : deal.store.slug === "myntra"
      ? "Flat 8.5% Profit"
      : deal.store.slug === "ajio"
      ? "Upto 15% Profit"
      : deal.store.slug === "amazon"
      ? "Upto 7% Profit"
      : "Flat 6.4% Profit";

  return (
    <article
      onClick={() => openModal({ input: deal.productUrl, dealId: deal.id, autoConvert: true })}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
    >
      {/* 1. TOP PROMO BANNER CONTAINER (Festive Colorful Gradient) */}
      <div className={`relative overflow-hidden p-3 text-white ${bannerGradient}`}>
        {/* Subtle decorative glow & festive sparkles */}
        <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/15 blur-xl" />
        <div className="pointer-events-none absolute -left-4 -top-4 h-20 w-20 rounded-full bg-black/10 blur-lg" />

        {/* Top Badges Row */}
        <div className="relative z-10 flex items-center justify-between gap-1 mb-2">
          {/* Store Badge (White Pill at top-left) */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-extrabold text-gray-900 shadow-sm">
            <BrandLogo slug={deal.store.slug} name={deal.store.name} size={13} className="h-3.5 w-3.5 rounded" />
            <span>{deal.store.name}</span>
          </span>

          {/* Discount Tag (Yellow/Amber Pill at top-right) */}
          {deal.discountPct > 0 && (
            <span className="num rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950 shadow-sm">
              {deal.discountPct}% OFF
            </span>
          )}
        </div>

        {/* Banner Content: Title & Price on Left, Product Cut-out on Right */}
        <div className="relative z-10 grid grid-cols-[1fr_88px] sm:grid-cols-[1fr_100px] items-center gap-2 min-h-[96px]">
          {/* Left: Deal Title & Banner Price */}
          <div className="flex flex-col justify-center pr-0.5">
            <h4 className="line-clamp-2 text-xs sm:text-[13px] font-extrabold leading-snug text-white drop-shadow-sm group-hover:text-amber-100 transition-colors">
              {deal.title}
            </h4>
            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              {deal.mrpPaise > deal.pricePaise && (
                <s className="num text-[11px] text-white/75 font-semibold">
                  {formatINR(deal.mrpPaise)}
                </s>
              )}
              <span className="num font-display text-sm sm:text-base font-black text-white drop-shadow">
                {formatINR(deal.pricePaise)}
              </span>
            </div>
          </div>

          {/* Right: Product Cut-out Image with white background backing */}
          <div className="relative aspect-square w-full rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
            {deal.imageUrl ? (
              <img
                src={deal.imageUrl}
                alt={deal.title}
                loading="lazy"
                className="h-full w-full object-contain mix-blend-multiply"
              />
            ) : (
              <div className="grid h-full place-items-center">
                <BrandLogo slug={deal.store.slug} name={deal.store.name} size={42} className="h-10 w-10" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. BOTTOM STATS STRIP (Clean White Background, 2 Columns) */}
      <div className="grid grid-cols-2 items-center gap-1 bg-white px-3 py-2 border-b border-gray-100">
        {/* Left: STARTING / DEAL PRICE */}
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500">
            DEAL PRICE
          </span>
          <span className="num font-display text-xs sm:text-sm font-black text-gray-950">
            {formatINR(deal.pricePaise)}
          </span>
        </div>

        {/* Right: YOU ALSO EARN / PROFIT */}
        <div className="flex flex-col items-end text-right">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500">
            YOU ALSO EARN
          </span>
          <span className="num font-display text-xs sm:text-sm font-black text-[#169443]">
            {profitDisplay}
          </span>
        </div>
      </div>

      {/* 3. ACTION BUTTONS (Pill Outline COPY LINK & Solid Green SHARE NOW) */}
      <div className="p-2.5 bg-gray-50/70 flex items-center gap-2">
        {/* Left: COPY LINK (Pill Outline Button) */}
        <button
          type="button"
          onClick={copyDeal}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white py-1.5 px-2 text-[10px] sm:text-[11px] font-bold text-gray-700 shadow-2xs hover:bg-gray-100 active:scale-95 transition"
          aria-label="Copy deal link"
        >
          {copied ? <Check className="h-3 w-3 text-[#169443]" /> : <Copy className="h-3 w-3 text-gray-600" />}
          <span>{copied ? "COPIED!" : "COPY LINK"}</span>
        </button>

        {/* Right: SHARE NOW (Pill Solid Green #25D366 Button) */}
        <button
          type="button"
          onClick={shareWhatsApp}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] py-1.5 px-2 text-[10px] sm:text-[11px] font-bold text-white shadow-sm hover:bg-[#20ba59] active:scale-95 transition"
          aria-label="Share deal on WhatsApp"
        >
          <MessageCircle className="h-3.2 w-3.2 fill-white" />
          <span>SHARE NOW</span>
        </button>
      </div>
    </article>
  );
}
