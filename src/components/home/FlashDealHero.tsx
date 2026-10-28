"use client";

import { useState, useEffect } from "react";
import { Timer, Copy, Check, MessageCircle, Flame } from "lucide-react";
import { formatINR } from "@/lib/money";
import { BrandLogo } from "@/components/BrandLogo";
import { useMakeLink } from "@/store/makeLink";

export function FlashDealHero() {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 23, seconds: 45 });
  const openModal = useMakeLink((s) => s.openModal);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 23, seconds: 45 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dealTitle = "NASHER MILES Luggage Set of 3 (Cabin, Medium & Large Hard Trolley Bags)";
  const productUrl = "https://www.flipkart.com/search?q=nasher+miles+luggage+set";
  const pricePaise = 499900;
  const mrpPaise = 4798500;
  const profitPaise = 31993; // 6.4% of 4999

  function copyDeal(e: React.MouseEvent) {
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🔥 FLASH DEAL! ${dealTitle} at just ${formatINR(pricePaise)} (was ${formatINR(mrpPaise)}, 90% OFF)! Earn ${formatINR(profitPaise)} Profit: ${origin}/r/luggage3`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `🔥 *FLASH DEAL OF THE DAY* 🔥\n*${dealTitle}*\n\n💰 *Offer Price:* ${formatINR(pricePaise)} (MRP ~${formatINR(mrpPaise)}~ - 90% OFF!)\n🤑 *You Also Earn:* Flat 6.4% Profit (${formatINR(profitPaise)})\n\n👉 *Buy via Profit Link:* ${origin}/r/luggage3`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <section id="flash-deals" className="mt-7 scroll-mt-24">
      {/* Header with Title and Countdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Flame className="h-5 w-5 text-red-600 animate-bounce" />
          <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
            FLASH DEALS
          </h2>
          <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[10px] font-black uppercase">
            LIVE NOW
          </span>
        </div>

        {/* Countdown Badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-white shadow-sm">
          <Timer className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-[10px] font-bold tracking-wider uppercase">DEAL ENDS IN:</span>
          <span className="num font-mono text-xs font-black">
            {String(timeLeft.hours).padStart(2, "0")}h : {String(timeLeft.minutes).padStart(2, "0")}m :{" "}
            {String(timeLeft.seconds).padStart(2, "0")}s
          </span>
        </div>
      </div>

      {/* Hero Card Container matching EarnKaro visual structure */}
      <article
        onClick={() => openModal({ input: productUrl, autoConvert: true })}
        className="group flex flex-col justify-between overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-black/10 transition hover:shadow-xl cursor-pointer"
      >
        {/* 1. TOP PROMO BANNER CONTAINER (Festive Red Gradient with Luggage cutout) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#E52D27] via-[#D32F2F] to-[#B71C1C] p-4 sm:p-5 text-white">
          {/* Subtle festive glows */}
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-xl" />

          {/* Top Badges Row */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
            {/* Store Badge (White Pill) */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-gray-900 shadow-sm">
              <BrandLogo slug="flipkart" name="Flipkart" size={15} className="h-4 w-4 rounded" />
              <span>Flipkart</span>
            </span>

            {/* Discount Badge */}
            <span className="num rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black uppercase text-amber-950 shadow-md">
              90% OFF
            </span>
          </div>

          {/* Banner Content Grid: Title & Price on Left, Cutout Image on Right */}
          <div className="relative z-10 grid gap-3 sm:grid-cols-[1fr_160px] sm:items-center">
            <div className="flex flex-col justify-center">
              <span className="inline-block w-fit rounded-md bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200 mb-1">
                FESTIVAL SPECIAL
              </span>
              <h3 className="font-display text-base sm:text-xl font-extrabold text-white leading-snug drop-shadow-sm group-hover:text-amber-100 transition-colors">
                {dealTitle}
              </h3>

              {/* In-Banner Price Row */}
              <div className="mt-3 flex items-baseline gap-2.5 flex-wrap">
                <s className="num text-sm text-white/75 font-semibold line-through">
                  {formatINR(mrpPaise)}
                </s>
                <span className="num font-display text-2xl sm:text-3xl font-black text-white drop-shadow">
                  {formatINR(pricePaise)}
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
                  Save {formatINR(mrpPaise - pricePaise)}
                </span>
              </div>
            </div>

            {/* Product Cut-out Image with white card backing */}
            <div className="relative aspect-square sm:aspect-auto sm:h-36 w-full rounded-2xl bg-white p-2.5 shadow-lg flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
              <img
                src="https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&auto=format&fit=crop&q=80"
                alt="NASHER MILES Luggage Set of 3"
                loading="lazy"
                className="h-full w-full object-contain mix-blend-multiply"
              />
            </div>
          </div>
        </div>

        {/* 2. BOTTOM STATS STRIP (Two columns on clean white background) */}
        <div className="grid grid-cols-2 items-center gap-2 bg-white px-4 py-3 border-b border-gray-100">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
              DEAL PRICE
            </span>
            <span className="num font-display text-base sm:text-lg font-black text-gray-950">
              {formatINR(pricePaise)}
            </span>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
              YOU ALSO EARN
            </span>
            <span className="num font-display text-sm sm:text-base font-black text-[#169443]">
              Flat 6.4% Profit ({formatINR(profitPaise)})
            </span>
          </div>
        </div>

        {/* 3. ACTION BUTTONS (Pill Outline COPY LINK & Solid Green SHARE NOW) */}
        <div className="p-3 bg-gray-50/80 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyDeal}
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white py-2.5 px-4 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-100 active:scale-95 transition"
          >
            {copied ? <Check className="h-4 w-4 text-[#169443]" /> : <Copy className="h-4 w-4 text-gray-600" />}
            <span>{copied ? "COPIED LINK!" : "COPY LINK"}</span>
          </button>

          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-[#20ba59] active:scale-95 transition"
          >
            <MessageCircle className="h-4 w-4 fill-white" />
            <span>SHARE NOW</span>
          </button>
        </div>
      </article>
    </section>
  );
}
