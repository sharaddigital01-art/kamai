"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";

interface Banner {
  id: number;
  badge: string;
  badgeBg: string;
  title: string;
  subtitle: string;
  profitTag: string;
  bgGradient: string;
  accentColor: string;
  store: string;
  link: string;
  cta: string;
}

const BANNERS: Banner[] = [
  {
    id: 1,
    badge: "MEGA FESTIVE BONANZA",
    badgeBg: "bg-amber-400 text-ink",
    title: "Flipkart Big Billion Days",
    subtitle: "Electronics, Smart TVs, Earbuds & Mobiles",
    profitTag: "UPTO 7.5% PROFIT",
    bgGradient: "from-[#1a3a60] via-[#1b4b8a] to-[#2874F0]",
    accentColor: "#2874F0",
    store: "Flipkart",
    link: "/?store=flipkart",
    cta: "Share Flipkart Deals",
  },
  {
    id: 2,
    badge: "FASHION CARNIVAL",
    badgeBg: "bg-pink-400 text-white",
    title: "Myntra End of Reason Sale",
    subtitle: "50-80% OFF on Top Clothing & Footwear Brands",
    profitTag: "FLAT 8.5% PROFIT",
    bgGradient: "from-[#4a0d2a] via-[#85194d] to-[#E5336A]",
    accentColor: "#E5336A",
    store: "Myntra",
    link: "/?store=myntra",
    cta: "Earn from Myntra",
  },
  {
    id: 3,
    badge: "ALL STARS FESTIVAL",
    badgeBg: "bg-amber-300 text-black",
    title: "Ajio All Stars Sale",
    subtitle: "Western wear, Sneakers & Premium Accessories",
    profitTag: "UPTO 9.2% PROFIT",
    bgGradient: "from-[#1f2833] via-[#2c3e50] to-[#3D4F5E]",
    accentColor: "#3D4F5E",
    store: "Ajio",
    link: "/?store=ajio",
    cta: "Explore Ajio Deals",
  },
  {
    id: 4,
    badge: "GREAT INDIAN FESTIVAL",
    badgeBg: "bg-orange-400 text-ink",
    title: "Amazon Festival Specials",
    subtitle: "Home, Kitchen, Laptops & Appliances",
    profitTag: "UPTO 8.0% PROFIT",
    bgGradient: "from-[#232F3E] via-[#37475A] to-[#FF9900]",
    accentColor: "#FF9900",
    store: "Amazon",
    link: "/?store=flipkart",
    cta: "Grab Top Deals",
  },
];

export function HeroBannerCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[current] ?? BANNERS[0]!;

  return (
    <div className="relative mt-2 overflow-hidden rounded-2xl shadow-md">
      {/* Slide Container */}
      <div className={`relative min-h-[160px] bg-gradient-to-r ${banner.bgGradient} p-4 sm:p-6 text-white transition-all duration-500 flex flex-col justify-between`}>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${banner.badgeBg}`}>
            <Sparkles className="h-3 w-3" />
            {banner.badge}
          </span>
          <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-extrabold text-[#22c55e] ring-1 ring-white/20">
            {banner.profitTag}
          </span>
        </div>

        {/* Banner Copy */}
        <div className="my-2.5">
          <h2 className="font-display text-lg font-extrabold leading-tight text-white sm:text-2xl">
            {banner.title}
          </h2>
          <p className="mt-0.5 text-xs text-white/80 line-clamp-1 sm:text-sm">
            {banner.subtitle}
          </p>
        </div>

        {/* Action Button & Store */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href={banner.link}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm hover:bg-white/90 active:scale-95 transition"
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#169443]" />
            {banner.cta}
          </Link>
          <span className="text-[11px] font-semibold text-white/70">
            Store: <strong className="text-white">{banner.store}</strong>
          </span>
        </div>
      </div>

      {/* Prev / Next Arrows (Visible on hover/desktop) */}
      <button
        type="button"
        onClick={() => setCurrent((prev) => (prev - 1 + BANNERS.length) % BANNERS.length)}
        aria-label="Previous slide"
        className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition backdrop-blur-sm"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setCurrent((prev) => (prev + 1) % BANNERS.length)}
        aria-label="Next slide"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition backdrop-blur-sm"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dot Pagination */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              current === i ? "w-5 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
