"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Store, ArrowUpRight, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

interface PartnerBrand {
  id: string;
  name: string;
  slug: string;
  category: "all" | "fashion" | "electronics" | "beauty" | "grocery" | "travel";
  profitTag: string;
  brandColor: string;
  bgTint: string;
  confirmationDays: number;
  popular: boolean;
  sampleUrl: string;
}

const PARTNERS: PartnerBrand[] = [
  {
    id: "p1",
    name: "Flipkart",
    slug: "flipkart",
    category: "electronics",
    profitTag: "Upto 7.5% Profit",
    brandColor: "#2874F0",
    bgTint: "bg-blue-50",
    confirmationDays: 60,
    popular: true,
    sampleUrl: "https://www.flipkart.com/search?q=wireless+earbuds",
  },
  {
    id: "p2",
    name: "Amazon",
    slug: "amazon",
    category: "electronics",
    profitTag: "Upto 8.0% Profit",
    brandColor: "#FF9900",
    bgTint: "bg-amber-50",
    confirmationDays: 45,
    popular: true,
    sampleUrl: "https://www.amazon.in",
  },
  {
    id: "p3",
    name: "Myntra",
    slug: "myntra",
    category: "fashion",
    profitTag: "Upto 8.5% Profit",
    brandColor: "#E5336A",
    bgTint: "bg-pink-50",
    confirmationDays: 45,
    popular: true,
    sampleUrl: "https://www.myntra.com/men-tshirts",
  },
  {
    id: "p4",
    name: "Ajio",
    slug: "ajio",
    category: "fashion",
    profitTag: "Upto 9.2% Profit",
    brandColor: "#3D4F5E",
    bgTint: "bg-slate-50",
    confirmationDays: 60,
    popular: true,
    sampleUrl: "https://www.ajio.com/search/?text=jeans",
  },
  {
    id: "p5",
    name: "Shopsy",
    slug: "shopsy",
    category: "fashion",
    profitTag: "Upto 6.0% Profit",
    brandColor: "#842993",
    bgTint: "bg-purple-50",
    confirmationDays: 60,
    popular: true,
    sampleUrl: "https://www.shopsy.in",
  },
  {
    id: "p6",
    name: "Nykaa",
    slug: "nykaa",
    category: "beauty",
    profitTag: "Upto 10.0% Profit",
    brandColor: "#FC2779",
    bgTint: "bg-rose-50",
    confirmationDays: 45,
    popular: true,
    sampleUrl: "https://www.nykaa.com",
  },
  {
    id: "p7",
    name: "Tata CLiQ",
    slug: "tatacliq",
    category: "electronics",
    profitTag: "Upto 5.5% Profit",
    brandColor: "#0F223D",
    bgTint: "bg-indigo-50",
    confirmationDays: 60,
    popular: false,
    sampleUrl: "https://www.tatacliq.com",
  },
  {
    id: "p8",
    name: "Croma",
    slug: "croma",
    category: "electronics",
    profitTag: "Upto 4.2% Profit",
    brandColor: "#00E9BF",
    bgTint: "bg-teal-50",
    confirmationDays: 60,
    popular: false,
    sampleUrl: "https://www.croma.com",
  },
  {
    id: "p9",
    name: "Samsung",
    slug: "samsung",
    category: "electronics",
    profitTag: "Upto 4.5% Profit",
    brandColor: "#1428A0",
    bgTint: "bg-blue-50",
    confirmationDays: 45,
    popular: false,
    sampleUrl: "https://www.samsung.com/in",
  },
  {
    id: "p10",
    name: "Mamaearth",
    slug: "mamaearth",
    category: "beauty",
    profitTag: "Upto 15.0% Profit",
    brandColor: "#00AFEF",
    bgTint: "bg-sky-50",
    confirmationDays: 45,
    popular: true,
    sampleUrl: "https://mamaearth.in",
  },
  {
    id: "p11",
    name: "Domino's",
    slug: "dominos",
    category: "grocery",
    profitTag: "Upto 8.0% Profit",
    brandColor: "#006491",
    bgTint: "bg-blue-50",
    confirmationDays: 30,
    popular: false,
    sampleUrl: "https://pizzaonline.dominos.co.in",
  },
  {
    id: "p12",
    name: "JioMart",
    slug: "jiomart",
    category: "grocery",
    profitTag: "Upto 6.5% Profit",
    brandColor: "#0078AD",
    bgTint: "bg-cyan-50",
    confirmationDays: 45,
    popular: false,
    sampleUrl: "https://www.jiomart.com",
  },
  {
    id: "p13",
    name: "BoAt",
    slug: "boat",
    category: "electronics",
    profitTag: "Upto 12.0% Profit",
    brandColor: "#E01E2E",
    bgTint: "bg-red-50",
    confirmationDays: 45,
    popular: true,
    sampleUrl: "https://www.boat-lifestyle.com",
  },
  {
    id: "p14",
    name: "Puma",
    slug: "puma",
    category: "fashion",
    profitTag: "Upto 11.5% Profit",
    brandColor: "#000000",
    bgTint: "bg-neutral-100",
    confirmationDays: 45,
    popular: false,
    sampleUrl: "https://in.puma.com",
  },
  {
    id: "p15",
    name: "MakeMyTrip",
    slug: "makemytrip",
    category: "travel",
    profitTag: "Upto ₹250 Profit",
    brandColor: "#EB2026",
    bgTint: "bg-red-50",
    confirmationDays: 30,
    popular: false,
    sampleUrl: "https://www.makemytrip.com",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Stores" },
  { id: "fashion", label: "Fashion & Lifestyle" },
  { id: "electronics", label: "Electronics & Tech" },
  { id: "beauty", label: "Beauty & Personal Care" },
  { id: "grocery", label: "Food & Grocery" },
  { id: "travel", label: "Travel & Booking" },
];

export default function PartnersPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredPartners = useMemo(() => {
    return PARTNERS.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.profitTag.toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeCategory === "all" || p.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [search, activeCategory]);

  return (
    <div className="space-y-4 pt-3 pb-12">
      {/* Page Title & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-ink">
            Our Partner Brands
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Share deals from 150+ top brands and earn guaranteed cash.
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#169443] ring-1 ring-emerald-200">
          <ShieldCheck className="h-4 w-4" /> 150+ Stores
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          placeholder="Search Flipkart, Amazon, Myntra, Nykaa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl bg-white py-3 pl-10 pr-4 text-xs sm:text-sm text-ink placeholder-ink-faint shadow-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#169443]"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none py-1">
        <div className="flex items-center gap-2 min-w-max">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition shadow-sm ${
                activeCategory === c.id
                  ? "bg-[#134024] text-white font-bold ring-1 ring-[#134024]"
                  : "bg-white text-ink-soft hover:text-ink ring-1 ring-black/5"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column / 2-Column Partner Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 pt-1">
        {filteredPartners.map((brand) => (
          <div
            key={brand.id}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-3.5 ring-1 ring-black/5 shadow-sm transition hover:shadow-md hover:ring-[#169443]/30"
          >
            <div>
              {/* Brand Logo & Popular Flag */}
              <div className="flex items-center justify-between mb-3">
                <BrandLogo slug={brand.slug} name={brand.name} size={48} className="h-12 w-12 rounded-2xl shadow-sm" />
                {brand.popular && (
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700 ring-1 ring-amber-200">
                    <Sparkles className="h-2.5 w-2.5" /> HOT
                  </span>
                )}
              </div>

              {/* Brand Name */}
              <h3 className="font-display text-sm font-bold text-ink leading-tight">
                {brand.name}
              </h3>
              <p className="text-[10px] text-ink-faint capitalize mt-0.5">{brand.category}</p>

              {/* Profit Tag */}
              <div className="mt-2.5">
                <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-[#169443] ring-1 ring-emerald-200">
                  {brand.profitTag}
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="mt-4 pt-2.5 border-t border-black/5">
              <Link
                href={`/make-links?url=${encodeURIComponent(brand.sampleUrl)}`}
                className="flex w-full items-center justify-center gap-1 rounded-full bg-[#134024] py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#169443] active:scale-95"
              >
                Make Link <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
          <Store className="mx-auto h-8 w-8 text-ink-faint" />
          <p className="mt-2 text-sm font-bold text-ink">No brands match "{search}"</p>
          <p className="text-xs text-ink-soft mt-1">Try searching for Flipkart, Myntra, or Ajio.</p>
        </div>
      )}
    </div>
  );
}
