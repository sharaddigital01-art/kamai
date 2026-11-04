"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  MessageSquare,
  Copy,
  Check,
  Clock,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const supportEmail = "support@kamaikaro.in";

  const handleCopyEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 pt-3 pb-16 max-w-3xl mx-auto px-2 sm:px-4">
      {/* Back to Home Navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Home</span>
      </Link>

      {/* Header Banner */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] via-[#1b5530] to-[#169443] p-6 sm:p-8 text-white shadow-lg relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/10 shadow-sm">
            <MessageSquare className="h-5 w-5 text-emerald-200" />
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
            Support & Assistance
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
          Contact Us
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
          Need help with your earnings, profit link conversion, or UPI withdrawal?
          Our dedicated partner support desk is available to assist you.
        </p>
      </div>

      {/* Contact Channels Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Email Support Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#169443] ring-1 ring-emerald-200/60 shadow-sm">
                <Mail className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
                Official Desk
              </span>
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Email Support
              </h2>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                For order investigations, account inquiries, or withdrawal assistance, write directly to our desk:
              </p>
            </div>

            {/* Email Pill with Copy Button */}
            <div className="flex items-center justify-between rounded-xl bg-canvas p-2.5 border border-black/5">
              <span className="font-mono text-xs font-bold text-ink truncate select-all">
                {supportEmail}
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-soft shadow-xs border border-black/10 hover:bg-neutral-50 active:scale-95 transition"
                title="Copy email to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-[#169443]" />
                    <span className="text-[#169443]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Response time: Usually within 24–48 hours</span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-black/5">
            <a
              href={`mailto:${supportEmail}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#169443] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#13803a] transition active:scale-95"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Send Direct Email</span>
            </a>
          </div>
        </div>

        {/* Telegram Bot Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0088cc]/10 text-[#0088cc] ring-1 ring-[#0088cc]/20 shadow-sm">
                <Send className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-[#0088cc]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#0088cc]">
                Instant Alerts
              </span>
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Telegram Support Bot
              </h2>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                Connect with our automated Telegram bot for deal scraping, automated channel forwarding, and quick updates:
              </p>
            </div>

            {/* Telegram Handle Pill */}
            <div className="flex items-center justify-between rounded-xl bg-[#0088cc]/5 p-2.5 border border-[#0088cc]/10">
              <span className="font-mono text-xs font-bold text-[#0088cc] truncate">
                @kamaikaro_bot
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0088cc]/80">
                200K+ Users
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Real-time deal posts & SubTag deal forwarding</span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-black/5">
            <a
              href="https://t.me/kamaikaro_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0077b5] transition active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Open in Telegram</span>
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* Frequently Asked Help Topics */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
          <HelpCircle className="h-5 w-5 text-[#169443]" />
          <h2 className="font-display text-base font-bold text-ink">
            Frequently Asked Support Topics
          </h2>
        </div>

        <div className="divide-y divide-black/5">
          {/* FAQ 1 */}
          <div className="py-3 first:pt-0 last:pb-0 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <TrendingUp className="h-3.5 w-3.5 text-[#169443]" />
              <span>Why hasn&apos;t my order tracked in Reports yet?</span>
            </div>
            <p className="text-[12px] text-ink-soft pl-5.5 leading-relaxed">
              Partner stores typically take 24–72 hours to synchronize order postbacks. Ensure the buyer completed the purchase in the same browser session without using third-party coupon extensions or ad blockers.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="py-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Clock className="h-3.5 w-3.5 text-[#169443]" />
              <span>When does my Pending Profit become Approved?</span>
            </div>
            <p className="text-[12px] text-ink-soft pl-5.5 leading-relaxed">
              Pending profits transition to Approved after the merchant return and cancellation period closes (typically 30–90 days). Once confirmed by the merchant, earnings are immediately available for UPI withdrawal.
            </p>
          </div>

          {/* FAQ 3 */}
          <div className="py-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Wallet className="h-3.5 w-3.5 text-[#169443]" />
              <span>How do I withdraw earnings to my Bank Account?</span>
            </div>
            <p className="text-[12px] text-ink-soft pl-5.5 leading-relaxed">
              Once your Approved balance reaches the minimum threshold, click &ldquo;Withdraw&rdquo; on your Profile or Header to submit your UPI ID. Funds are dispatched directly via NEFT/UPI within 1–3 business days.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Trust Note */}
      <div className="rounded-2xl bg-canvas p-4 border border-black/5 text-center text-xs text-ink-soft flex items-center justify-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#169443]" />
        <span>Kamai Karo never asks for your bank password, OTP, or credit card details.</span>
      </div>
    </div>
  );
}
