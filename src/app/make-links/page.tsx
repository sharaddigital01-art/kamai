"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Link2,
  ClipboardPaste,
  Check,
  Copy,
  MessageCircle,
  Send,
  Play,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LoaderCircle,
  ArrowRight,
} from "lucide-react";
import { detectStore } from "@/lib/linkConverter";
import { formatINR } from "@/lib/money";

const QUICK_CHIPS = [
  { name: "Flipkart", url: "https://www.flipkart.com/search?q=wireless+earbuds", color: "#2874F0" },
  { name: "Ajio", url: "https://www.ajio.com/search/?text=jeans", color: "#3D4F5E" },
  { name: "Myntra", url: "https://www.myntra.com/men-tshirts", color: "#E5336A" },
  { name: "JioMart", url: "https://www.jiomart.com/p/groceries/sample-deal", color: "#0078AD" },
  { name: "Amazon", url: "https://www.amazon.in/dp/B08N5WRWNW", color: "#FF9900" },
];

function MakeLinksContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [result, setResult] = useState<{
    code: string;
    shortUrl: string;
    storeName: string;
    estimatedProfitPaise: number | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTips, setShowTips] = useState(true);

  const detected = useMemo(() => detectStore(inputUrl), [inputUrl]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setIsAuthenticated(Boolean(data.authenticated)))
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    if (initialUrl) {
      setInputUrl(initialUrl);
    }
  }, [initialUrl]);

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) setInputUrl(text.trim());
    } catch {
      // Manual paste fallback
    }
  }

  async function handleConvert(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) return;

    if (isAuthenticated === false) {
      window.location.href = `/login?next=${encodeURIComponent("/make-links?url=" + encodeURIComponent(inputUrl.trim()))}`;
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/convert-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Could not generate link. Please verify URL format.");
        setLoading(false);
        return;
      }

      setResult({
        code: data.link.code,
        shortUrl: data.link.shortUrl,
        storeName: data.link.store.name,
        estimatedProfitPaise: data.estimatedProfitPaise,
      });
    } catch {
      setError("Network issue. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyShortUrl() {
    if (!result) return;
    navigator.clipboard?.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareText = result
    ? `Check out this steal deal from ${result.storeName}! 👇\n${result.shortUrl}`
    : "";

  return (
    <div className="space-y-6 pt-2 pb-14 max-w-xl mx-auto">
      {isAuthenticated === false && (
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/80 flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 font-bold text-amber-800">
              i
            </span>
            <span>You are currently browsing as guest. Log in to track earnings to your account.</span>
          </div>
          <a
            href="/login?next=/make-links"
            className="shrink-0 rounded-full bg-[#169443] px-3.5 py-1.5 font-bold text-white shadow-sm hover:bg-[#13803a] transition"
          >
            Log In
          </a>
        </div>
      )}

      {/* 1. Hero Make Link Card */}
      <div className="overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-md ring-1 ring-black/5">
        <div className="flex items-center gap-2 text-[#169443]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
            <Link2 className="h-4 w-4" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider">Fast Link Generator</span>
        </div>

        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-ink">
          Make your own Profit Links in Seconds
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-soft">
          Paste any Flipkart, Amazon, Myntra or Ajio product link to turn it into an EarnKaro cash link.
        </p>

        {/* Input Form */}
        <form onSubmit={handleConvert} className="mt-5 space-y-3">
          <div className="relative">
            <div className="pointer-events-none absolute left-3.5 top-3.5 text-[#169443]">
              <Link2 className="h-5 w-5" />
            </div>
            <textarea
              rows={3}
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste homepage or product link here (e.g. https://www.flipkart.com/...)"
              className="w-full resize-none rounded-2xl bg-canvas p-3 pl-11 pr-11 text-xs sm:text-sm text-ink outline-none ring-1 ring-black/10 focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
            />
            <button
              type="button"
              onClick={pasteClipboard}
              aria-label="Paste from clipboard"
              className="absolute right-2.5 top-3 rounded-xl p-1.5 text-ink-soft hover:bg-black/5 hover:text-ink active:scale-95 transition"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          </div>

          {/* Store Detection Badge */}
          <div className="flex items-center justify-between text-xs min-h-[22px]">
            {detected ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-[#134024]">
                <Check className="h-3.5 w-3.5 text-[#169443]" /> {detected.name} link recognized
              </span>
            ) : inputUrl.trim() ? (
              <span className="text-ink-faint text-[11px]">Paste a valid Flipkart, Myntra or Ajio link</span>
            ) : (
              <span />
            )}
            {inputUrl && (
              <button
                type="button"
                onClick={() => setInputUrl("")}
                className="text-[11px] text-ink-faint hover:text-ink underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Full-width Green Action Button */}
          <button
            type="submit"
            disabled={!inputUrl.trim() || loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#138038] active:scale-98 disabled:opacity-50 transition"
          >
            {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}
            {loading ? "GENERATING PROFIT LINK..." : "MAKE PROFIT LINK"}
          </button>
        </form>

        {/* Error Callout */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Conversion Failed</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Converted Success Result Card */}
        {result && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                <Check className="h-3 w-3" /> Profit Link Ready
              </span>
              <span className="text-xs font-bold text-[#134024]">{result.storeName}</span>
            </div>

            {/* Shortened URL Bar */}
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5">
              <input
                readOnly
                value={result.shortUrl}
                onFocus={(e) => e.target.select()}
                className="num flex-1 bg-transparent px-2 text-xs font-bold text-ink outline-none"
              />
              <button
                type="button"
                onClick={copyShortUrl}
                className="flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-soft transition active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>

            {/* Profit Hint */}
            {result.estimatedProfitPaise ? (
              <p className="num mt-2.5 text-xs font-bold text-[#169443]">
                Estimated Earnings: Up to {formatINR(result.estimatedProfitPaise)} on this purchase!
              </p>
            ) : null}

            {/* Social Share Buttons */}
            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-emerald-200/60">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] py-2 px-3 text-xs font-bold text-white shadow-sm hover:bg-[#20ba59] active:scale-95 transition"
              >
                <MessageCircle className="h-4 w-4 fill-white" />
                WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(result.shortUrl)}&text=${encodeURIComponent(
                  "Check this deal!"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0088cc] py-2 px-3 text-xs font-bold text-white shadow-sm hover:bg-[#0077b5] active:scale-95 transition"
              >
                <Send className="h-4 w-4" />
                Telegram
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 2. Quick Convert Store Chips Carousel */}
      <div>
        <p className="px-1 text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
          Quick Test Store Links (Click to test):
        </p>
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-2 min-w-max">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.name}
                type="button"
                onClick={() => setInputUrl(chip.url)}
                className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-black/5 hover:ring-[#169443] transition active:scale-95"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chip.color }} />
                {chip.name} <ArrowRight className="h-3 w-3 text-ink-faint" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Video Tutorial Placeholder Card */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] to-[#1c5d34] p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-200">
              <Sparkles className="h-3 w-3" /> 45s Masterclass
            </span>
            <h3 className="mt-2 font-display text-lg font-bold leading-tight">
              How to Make a Profit Link Easily
            </h3>
            <p className="mt-1 text-xs text-white/80">
              Copy product link from partner apps → Paste here → Share and earn cashback.
            </p>
          </div>

          {/* Video Placeholder Button */}
          <div className="relative aspect-video w-full sm:w-44 shrink-0 rounded-2xl bg-black/40 overflow-hidden flex items-center justify-center ring-1 ring-white/20 group cursor-pointer">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#169443] text-white shadow-lg group-hover:scale-110 transition">
              <Play className="h-5 w-5 fill-white ml-0.5" />
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-white">
              0:45
            </span>
          </div>
        </div>
      </div>

      {/* 4. Best Practices & Tips Expandable Checklist */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => setShowTips((prev) => !prev)}
          className="flex w-full items-center justify-between text-left font-display font-bold text-sm text-ink"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-[#169443]" />
            <span>Best Practices & Tips for Maximum Earnings</span>
          </div>
          {showTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showTips && (
          <div className="mt-4 space-y-3 pt-3 border-t border-black/5 text-xs text-ink-soft">
            <div className="grid gap-2 sm:grid-cols-2">
              {/* Right URLs */}
              <div className="rounded-2xl bg-emerald-50/70 p-3 ring-1 ring-emerald-200">
                <p className="font-bold text-[#134024] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#169443]" /> What Works:
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] text-emerald-950">
                  <li>• Direct product URLs (e.g. flipkart.com/p/item...)</li>
                  <li>• Category deals page (e.g. myntra.com/tshirts)</li>
                  <li>• Store homepage links</li>
                </ul>
              </div>

              {/* Wrong URLs */}
              <div className="rounded-2xl bg-red-50/70 p-3 ring-1 ring-red-200">
                <p className="font-bold text-red-900 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-600" /> What Doesn't Work:
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] text-red-950">
                  <li>• Cart and Checkout page URLs</li>
                  <li>• Other affiliate/shortened links (bit.ly, etc.)</li>
                  <li>• Payment or OTP screen URLs</li>
                </ul>
              </div>
            </div>

            <p className="text-[11px] text-ink-faint pt-1">
              💡 <strong>Pro Tip:</strong> Create WhatsApp groups centered around specific niches (e.g. "Sneaker Steals" or "Moms & Kids Deals") for 4x higher conversion!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MakeLinksPage() {
  return (
    <Suspense>
      <MakeLinksContent />
    </Suspense>
  );
}
