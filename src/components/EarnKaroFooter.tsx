"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Smartphone,
  ShieldCheck,
  Award,
  Send,
  ExternalLink,
} from "lucide-react";

export function EarnKaroFooter() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    about: false,
    reads: false,
    connect: false,
    download: true, // Keep app download expanded by default
  });

  const toggle = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <footer className="mt-12 bg-[#0c1e13] text-white/90 border-t border-white/10 pb-24 text-xs">
      <div className="mx-auto max-w-lg px-4 pt-6 md:max-w-2xl lg:max-w-4xl">
        {/* Trust Badges Bar */}
        <div className="mb-6 grid grid-cols-2 gap-3 border-b border-white/10 pb-6 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2.5">
            <Award className="h-5 w-5 text-[#22c55e] shrink-0" />
            <div>
              <p className="font-bold text-white text-[11px]">Backed by Top Investors</p>
              <p className="text-[10px] text-white/60">Ratan Tata & Kalaari</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2.5">
            <ShieldCheck className="h-5 w-5 text-[#22c55e] shrink-0" />
            <div>
              <p className="font-bold text-white text-[11px]">Direct Bank Transfer</p>
              <p className="text-[10px] text-white/60">NEFT / UPI Payouts</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2.5">
            <Smartphone className="h-5 w-5 text-[#22c55e] shrink-0" />
            <div>
              <p className="font-bold text-white text-[11px]">10M+ App Downloads</p>
              <p className="text-[10px] text-white/60">Rated 4.5★ Play Store</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e] text-[#0c1e13] font-black text-[10px]">
              ₹
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">₹150+ Crore Paid</p>
              <p className="text-[10px] text-white/60">To 30L+ Earners</p>
            </div>
          </div>
        </div>

        {/* Accordion Group */}
        <div className="space-y-3">
          {/* Section 1: ABOUT EARNKARO */}
          <div className="rounded-xl bg-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("about")}
              className="flex w-full items-center justify-between p-3.5 font-bold tracking-wider text-left text-white hover:bg-white/5 transition"
            >
              <span>ABOUT EARNKARO</span>
              {openSections.about ? (
                <ChevronUp className="h-4 w-4 text-[#22c55e]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/60" />
              )}
            </button>
            {openSections.about && (
              <div className="px-3.5 pb-4 pt-1 text-white/70 space-y-2 border-t border-white/5 leading-relaxed">
                <p>
                  EarnKaro is India's leading deal-sharing and affiliate marketing platform. It enables students,
                  homemakers, social media influencers, and anyone looking for extra income to earn real cash from
                  home.
                </p>
                <p>
                  Simply turn popular deals from 150+ brands like Flipkart, Amazon, Myntra, Ajio, Nykaa, and Tata CLiQ
                  into your unique Profit Links. When your friends, family, or followers purchase through your link,
                  you earn guaranteed profit in your bank account!
                </p>
              </div>
            )}
          </div>

          {/* Section 2: USEFUL READS */}
          <div className="rounded-xl bg-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("reads")}
              className="flex w-full items-center justify-between p-3.5 font-bold tracking-wider text-left text-white hover:bg-white/5 transition"
            >
              <span>USEFUL READS</span>
              {openSections.reads ? (
                <ChevronUp className="h-4 w-4 text-[#22c55e]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/60" />
              )}
            </button>
            {openSections.reads && (
              <div className="px-3.5 pb-4 pt-1 space-y-2 border-t border-white/5 text-white/75">
                <ul className="space-y-2">
                  <li>
                    <Link href="/profile#academy" className="hover:text-[#22c55e] flex items-center justify-between">
                      <span>• Complete Beginner's Guide to Affiliate Marketing</span>
                      <ExternalLink className="h-3 w-3 text-white/40" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/partners" className="hover:text-[#22c55e] flex items-center justify-between">
                      <span>• Flipkart Affiliate Profit Rates & Policies 2026</span>
                      <ExternalLink className="h-3 w-3 text-white/40" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/make-links" className="hover:text-[#22c55e] flex items-center justify-between">
                      <span>• How to create WhatsApp and Telegram Deal Groups that convert</span>
                      <ExternalLink className="h-3 w-3 text-white/40" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/reports" className="hover:text-[#22c55e] flex items-center justify-between">
                      <span>• Understanding Click-to-Order Conversion tracking</span>
                      <ExternalLink className="h-3 w-3 text-white/40" />
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 3: CONNECT WITH US */}
          <div className="rounded-xl bg-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("connect")}
              className="flex w-full items-center justify-between p-3.5 font-bold tracking-wider text-left text-white hover:bg-white/5 transition"
            >
              <span>CONNECT WITH US</span>
              {openSections.connect ? (
                <ChevronUp className="h-4 w-4 text-[#22c55e]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/60" />
              )}
            </button>
            {openSections.connect && (
              <div className="px-3.5 pb-4 pt-2 border-t border-white/5">
                <p className="text-white/70 mb-3">Join our community for hot daily deals and exclusive bonus codes:</p>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href="https://t.me/earnkaro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full bg-[#0088cc]/20 text-[#00aaff] px-3 py-1.5 font-semibold hover:bg-[#0088cc]/30 transition"
                  >
                    <Send className="h-3.5 w-3.5" /> Telegram (200k+)
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full bg-[#E1306C]/20 text-[#ff6699] px-3 py-1.5 font-semibold hover:bg-[#E1306C]/30 transition"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    Instagram
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full bg-[#FF0000]/20 text-[#ff5555] px-3 py-1.5 font-semibold hover:bg-[#FF0000]/30 transition"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    YouTube
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: DOWNLOAD APP */}
          <div className="rounded-xl bg-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle("download")}
              className="flex w-full items-center justify-between p-3.5 font-bold tracking-wider text-left text-white hover:bg-white/5 transition"
            >
              <span>DOWNLOAD APP</span>
              {openSections.download ? (
                <ChevronUp className="h-4 w-4 text-[#22c55e]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/60" />
              )}
            </button>
            {openSections.download && (
              <div className="px-3.5 pb-4 pt-2 border-t border-white/5 space-y-3">
                <p className="text-white/70">
                  Earn on the go! Download the EarnKaro App for faster link generation and instant sale alerts:
                </p>
                <div className="flex flex-wrap gap-3">
                  {/* Google Play Badge */}
                  <a
                    href="https://play.google.com/store"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl bg-black/40 px-3.5 py-2 ring-1 ring-white/20 hover:bg-black/60 transition"
                  >
                    <svg className="h-5 w-5 fill-current text-[#22c55e]" viewBox="0 0 24 24">
                      <path d="M3.609 1.814L13.793 12 3.61 22.186c-.378-.344-.61-.84-.61-1.424V3.238c0-.584.232-1.08.61-1.424zM15.207 13.414l2.428 2.429-11.838 6.765 9.41-9.194zm0-2.828l-9.41-9.194 11.838 6.765-2.428 2.429zm1.414 1.414l3.197 3.197c.563.322 1.182.262 1.637-.193.455-.455.515-1.074.193-1.637l-3.613-2.065-1.414.698z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-[9px] uppercase tracking-wider text-white/60 leading-none">GET IT ON</p>
                      <p className="text-xs font-bold text-white leading-tight">Google Play</p>
                    </div>
                  </a>

                  {/* App Store Badge */}
                  <a
                    href="https://apple.com/app-store"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl bg-black/40 px-3.5 py-2 ring-1 ring-white/20 hover:bg-black/60 transition"
                  >
                    <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.69-1.12 1.83-0.98 2.94 1.07.08 2.15-.55 2.79-1.28z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-[9px] uppercase tracking-wider text-white/60 leading-none">DOWNLOAD ON THE</p>
                      <p className="text-xs font-bold text-white leading-tight">App Store</p>
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Bottom / Copyright */}
        <div className="mt-8 border-t border-white/10 pt-4 text-center text-[11px] text-white/50">
          <p>© 2026 EarnKaro. All rights reserved. Made for smart earners in India.</p>
        </div>
      </div>
    </footer>
  );
}
