import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Cookie,
  ExternalLink,
  Mail,
  Send,
  Database,
  Eye,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Kamai Karo",
  description:
    "Kamai Karo's Privacy Policy regarding account security, Supabase storage, cookie tracking, link redirects, and affiliate disclosures.",
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="h-5 w-5 text-emerald-200" />
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
            Legal & Compliance
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
          At Kamai Karo, we prioritize the protection and confidentiality of your personal and financial data.
          This policy explains how we collect, store, and process your information when you use our platform and affiliate services.
        </p>
        <div className="mt-4 flex items-center gap-4 text-[11px] text-emerald-200/80">
          <span>Effective Date: November 2026</span>
          <span>&bull;</span>
          <span>Version 2.5</span>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6 text-sm text-ink leading-relaxed">
        {/* Section 1: Overview & Information We Collect */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Eye className="h-5 w-5 text-[#169443]" />
            <h2 className="font-display text-lg font-bold text-ink">
              1. Information We Collect
            </h2>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            We collect minimal, necessary information required to provide deal-sharing services, track affiliate conversions, and disburse profits to your bank account:
          </p>
          <ul className="space-y-2.5 text-xs sm:text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#169443] shrink-0 mt-0.5" />
              <span>
                <strong className="text-ink">Account & Identity Information:</strong> Your name, email address, referral code, and unique sub-identifier (SubID) prefix. Passwords are cryptographically salted and hashed.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#169443] shrink-0 mt-0.5" />
              <span>
                <strong className="text-ink">Payout & Banking Data:</strong> UPI ID (VPA) or bank account details provided solely for withdrawal disbursement. We never store payment card details, CVVs, or bank login credentials.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#169443] shrink-0 mt-0.5" />
              <span>
                <strong className="text-ink">Click & Referral Logs:</strong> Clicks through our redirect route (<code className="bg-canvas px-1.5 py-0.5 rounded text-[11px] font-mono text-ink">/api/r</code>) record pseudonymous SubIDs, store domain, timestamp, and referral origin to match orders.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 2: Account Security & Supabase Data Storage */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Database className="h-5 w-5 text-[#169443]" />
            <h2 className="font-display text-lg font-bold text-ink">
              2. Account Security & Supabase Storage
            </h2>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            Your user profile, referral links, and earnings ledger records are securely hosted using enterprise-grade infrastructure:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-canvas p-3.5 border border-black/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-ink text-xs">
                <Lock className="h-4 w-4 text-[#169443]" />
                <span>Encrypted Transport</span>
              </div>
              <p className="text-[11px] text-ink-soft">
                All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS/HTTPS).
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-3.5 border border-black/5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-ink text-xs">
                <ShieldCheck className="h-4 w-4 text-[#169443]" />
                <span>Row Level Security (RLS)</span>
              </div>
              <p className="text-[11px] text-ink-soft">
                Database records in Supabase PostgreSQL enforce granular Row Level Security, ensuring only you have access to your private ledger and earnings.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Cookie Tracking & Link Redirects */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Cookie className="h-5 w-5 text-[#169443]" />
            <h2 className="font-display text-lg font-bold text-ink">
              3. Cookie Tracking & Dynamic Link Redirects
            </h2>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            Kamai Karo uses cookies and tracking technologies solely for functionality, session authentication, and affiliate conversion reconciliation:
          </p>
          <div className="space-y-3 text-xs sm:text-sm text-ink-soft">
            <div className="rounded-xl bg-emerald-50/60 p-4 border border-emerald-100">
              <h4 className="font-bold text-emerald-900 text-xs mb-1">Session & Authentication Cookies</h4>
              <p className="text-[12px] text-emerald-800 leading-relaxed">
                We store encrypted session cookies on your device with <code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px] font-mono">SameSite=Lax</code> to keep you securely signed in to your partner dashboard.
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-4 border border-black/5">
              <h4 className="font-bold text-ink text-xs mb-1">Click Tracking & SubID Attribution</h4>
              <p className="text-[12px] text-ink-soft leading-relaxed">
                When you share a Profit Link, an encrypted sub-identifier (such as <code className="bg-white px-1 py-0.5 rounded text-[11px] font-mono text-ink">dgu4Ci_tg</code>) is appended. When an end-user clicks your link and purchases a product, the partner merchant registers this SubID in their affiliate cookie to accurately report earnings back to your Kamai Karo ledger.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Third-Party Affiliate Compliance */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <ExternalLink className="h-5 w-5 text-[#169443]" />
            <h2 className="font-display text-lg font-bold text-ink">
              4. Third-Party Affiliate Compliance
            </h2>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            Kamai Karo operates in full compliance with all partner network policies and operational terms:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs">
              <h4 className="font-bold text-amber-950 text-xs mb-1">Amazon Associates Compliance</h4>
              <p className="text-amber-900 leading-relaxed">
                Kamai Karo participates in the Amazon Associates Program. Redirects to Amazon.in use designated Associate Store IDs (<code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">kamaikaro02-21</code>) and sub-tags (<code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">ascsubtag</code>). Amazon uses its own tracking cookies to validate qualifying purchases according to the Amazon Associates Operating Agreement.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-4 text-xs">
              <h4 className="font-bold text-blue-950 text-xs mb-1">Cuelinks & Multi-Brand Aggregators</h4>
              <p className="text-blue-900 leading-relaxed">
                Orders from partner merchants including Flipkart, Myntra, Ajio, Nykaa, and Tata CLiQ are tracked via authorized affiliate networks such as Cuelinks. Cuelinks postbacks securely synchronize order statuses, order values, and commission amounts without transmitting buyers&apos; personal identity.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Data Retention & User Rights */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Lock className="h-5 w-5 text-[#169443]" />
            <h2 className="font-display text-lg font-bold text-ink">
              5. Your Rights & Data Retention
            </h2>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            You retain complete transparency and control over your data on Kamai Karo:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span><strong>Access & Review:</strong> View all real-time clicks, pending transactions, and confirmed earnings directly from the Reports portal.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span><strong>Credential Management:</strong> Change your password or update your payout UPI information at any time from your Profile settings.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#169443] font-bold">&bull;</span>
              <span><strong>Account Erasure:</strong> Request permanent removal of your account and associated profile records by submitting an email to our compliance desk.</span>
            </li>
          </ul>
        </section>

        {/* Section 6: Contact & Inquiries */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-black/5">
            <Mail className="h-5 w-5 text-[#169443]" />
            <h2 className="font-display text-lg font-bold text-ink">
              6. Privacy Inquiries & Support
            </h2>
          </div>
          <p className="text-ink-soft text-xs sm:text-sm">
            For questions or requests concerning this Privacy Policy, your stored data, or cookie handling, reach out to our dedicated support channels:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <a
              href="mailto:support@kamaikaro.in"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-[#134024] ring-1 ring-emerald-200 hover:bg-emerald-100 transition"
            >
              <Mail className="h-4 w-4 text-[#169443]" />
              <span>support@kamaikaro.in</span>
            </a>
            <a
              href="https://t.me/kamaikaro_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0088cc]/10 px-4 py-3 text-xs font-bold text-[#0088cc] ring-1 ring-[#0088cc]/25 hover:bg-[#0088cc]/20 transition"
            >
              <Send className="h-4 w-4" />
              <span>Official Telegram Support</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
