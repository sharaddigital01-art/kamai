import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  AlertCircle,
  Clock,
  Wallet,
  ShieldAlert,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Store,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Kamai Karo",
  description:
    "Terms of service, affiliate disclosures, merchant validation windows, commission rules, and withdrawal policies for Kamai Karo.",
};

export default function TermsOfServicePage() {
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
            <FileText className="h-5 w-5 text-emerald-200" />
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
            Terms & Conditions
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
          Please review these terms and conditions carefully before using Kamai Karo. By creating an account,
          generating profit links, or withdrawing earnings, you agree to comply with all platform rules and merchant policies.
        </p>
        <div className="mt-4 flex items-center gap-4 text-[11px] text-emerald-200/80">
          <span>Effective Date: November 2026</span>
          <span>&bull;</span>
          <span>Version 2.5</span>
        </div>
      </div>

      {/* Mandatory Affiliate Disclosure Callout Box */}
      <section className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-sm">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="space-y-2">
            <h2 className="font-display text-base font-black text-emerald-950 tracking-tight">
              Mandatory Affiliate Marketing Disclosure
            </h2>
            <blockquote className="text-xs sm:text-sm text-emerald-900 font-medium leading-relaxed bg-white/70 p-3.5 rounded-xl border border-emerald-200/70 italic">
              &ldquo;Kamaikaro participates in affiliate marketing programs, including the Amazon Associates Program, Cuelinks, and other partner networks. When users make purchases through links on our platform or connected channels, an affiliate commission may be earned at no additional cost to the buyer.&rdquo;
            </blockquote>
            <p className="text-[11px] text-emerald-800/90 leading-normal">
              We share these affiliate commissions directly with registered Kamai Karo partners as confirmed cashback/profit according to published category commission schedules.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="space-y-6 text-sm text-ink leading-relaxed">
        {/* Section 1: Account Eligibility & Registration */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <CheckCircle2 className="h-5 w-5 text-[#169443]" />
            <h3 className="font-display text-lg font-bold text-ink">
              1. Account Eligibility & Registration
            </h3>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            To register and maintain an active account on Kamai Karo, you must satisfy the following criteria:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span>You must be at least 18 years of age or possess legal parental/guardian consent to participate in commercial deal promotion.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span>Each individual is permitted only one active Kamai Karo account. Registering duplicate or automated bot accounts is strictly forbidden.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span>You agree to provide accurate email addresses and valid Indian UPI/banking payout credentials for earnings disbursements.</span>
            </li>
          </ul>
        </section>

        {/* Section 2: Traffic Rules & Acceptable Use Policy */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Store className="h-5 w-5 text-[#169443]" />
            <h3 className="font-display text-lg font-bold text-ink">
              2. Profit Links & Acceptable Promotion
            </h3>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            Kamai Karo provides tools to convert regular product links into monetized Profit Links for sharing across legitimate channels:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100">
              <h4 className="font-bold text-emerald-950 text-xs mb-1">Permitted Promotion Channels</h4>
              <p className="text-[12px] text-emerald-900 leading-relaxed">
                You may share links on your personal or commercial social media profiles, Telegram channels/groups, WhatsApp communities, YouTube video descriptions, and personal blogs.
              </p>
            </div>
            <div className="rounded-xl bg-rose-50/70 p-4 border border-rose-100">
              <h4 className="font-bold text-rose-950 text-xs mb-1">Strictly Prohibited Activities</h4>
              <ul className="space-y-1.5 text-[11px] text-rose-900 list-disc list-inside">
                <li>Bidding on merchant brand trademarks on Google Ads, Bing Ads, or other paid search networks (e.g. &ldquo;Flipkart sale&rdquo;, &ldquo;Amazon deals&rdquo;).</li>
                <li>Cookie stuffing, hidden iframes, or automated click botting designed to force affiliate attribution.</li>
                <li>Misrepresenting product pricing, publishing fraudulent discount codes, or impersonating official brand personnel.</li>
                <li>Self-referral abuse where orders are placed purely to extract commissions with the intent of systematic returns.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Merchant Validation Windows & Commission Statuses */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Clock className="h-5 w-5 text-[#169443]" />
            <h3 className="font-display text-lg font-bold text-ink">
              3. Merchant Validation Windows & Payout Terms
            </h3>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            All commissions undergo an industry-standard validation cycle governed by partner merchants (Flipkart, Amazon, Myntra, Ajio, etc.):
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 rounded-xl bg-canvas p-3.5 border border-black/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-bold shrink-0">
                ⏳
              </span>
              <div>
                <h4 className="font-bold text-ink text-xs">Pending Commission (In Return Window)</h4>
                <p className="text-[11px] text-ink-soft mt-0.5 leading-relaxed">
                  Reflected in your dashboard within 24–72 hours of customer order placement. During this period, the product is in shipping or the customer&apos;s return/replacement policy window (typically 7–30 days).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-canvas p-3.5 border border-black/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[#169443] text-xs font-bold shrink-0">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-ink text-xs">Approved Commission (Available for Withdrawal)</h4>
                <p className="text-[11px] text-ink-soft mt-0.5 leading-relaxed">
                  Once the merchant concludes their audit and validation window (typically 30–90 days from order date) confirming the order was successfully delivered and retained, your profit shifts to Available balance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-canvas p-3.5 border border-black/5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700 text-xs font-bold shrink-0">
                ✕
              </span>
              <div>
                <h4 className="font-bold text-ink text-xs">Rejected / Cancelled Orders</h4>
                <p className="text-[11px] text-ink-soft mt-0.5 leading-relaxed">
                  If an end-buyer returns the merchandise, cancels the shipment, or fails delivery authentication (e.g. invalid COD), the partner merchant rejects the commission. Rejected commissions cannot be paid out.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Withdrawals & Bank Disbursements */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Wallet className="h-5 w-5 text-[#169443]" />
            <h3 className="font-display text-lg font-bold text-ink">
              4. Withdrawals & Payout Processing
            </h3>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            Partners can withdraw cleared, Approved profits directly to their Indian bank accounts:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span><strong>Supported Channels:</strong> Direct UPI (Google Pay, PhonePe, Paytm, BHIM) and NEFT/IMPS bank transfer.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span><strong>Account Security:</strong> Payout requests require two-step confirmation (e.g., Email OTP verification) to prevent unauthorized withdrawals.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span><strong>Processing Timeline:</strong> Approved withdrawal requests are dispatched to your provided UPI ID within 1–3 business days.</span>
            </li>
          </ul>
        </section>

        {/* Section 5: Limitation of Liability */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <ShieldAlert className="h-5 w-5 text-[#169443]" />
            <h3 className="font-display text-lg font-bold text-ink">
              5. Merchant Relationships & Limitation of Liability
            </h3>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm leading-relaxed">
            Kamai Karo acts as an affiliate marketing platform and intermediary. We do not manufacture, sell, ship, or warranty any items purchased on third-party merchant sites. Product returns, delivery disputes, warranties, or customer support issues relating to goods purchased must be directed to the selling merchant (e.g., Flipkart, Amazon).
          </p>
        </section>

        {/* Section 6: Inquiries & Assistance */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <HelpCircle className="h-5 w-5 text-[#169443]" />
            <h3 className="font-display text-lg font-bold text-ink">
              6. Questions & Legal Inquiries
            </h3>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            For clarifications on these terms or partnership guidelines, please reach out to our team at{" "}
            <a href="mailto:support@kamaikaro.in" className="text-[#169443] font-bold hover:underline">
              support@kamaikaro.in
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
