"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, ClipboardPaste, Copy, Link2, LoaderCircle, MessageCircle, Send, Share2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { detectStore } from "@/lib/linkConverter";
import { formatINR } from "@/lib/money";
import { useMakeLink } from "@/store/makeLink";

interface Result {
  shortUrl: string;
  storeName: string;
  estimatedProfitPaise: number | null;
}
type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: Result }
  | { kind: "error"; code: string; message: string };

export function MakeLinkModal() {
  const { open, input: initial, dealId, autoConvert, close } = useMakeLink();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const outRef = useRef<HTMLInputElement>(null);

  const detected = useMemo(() => detectStore(text), [text]);
  const looksLikeLink = /https?:\/\/|www\.|\.com|\.in/i.test(text);

  const convert = useCallback(async (value: string, forDeal?: string) => {
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/convert-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value, dealId: forDeal }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPhase({ kind: "error", code: json.error?.code ?? "ERROR", message: json.error?.message ?? "Something went wrong." });
        return;
      }
      setPhase({
        kind: "done",
        result: { shortUrl: json.link.shortUrl, storeName: json.link.store.name, estimatedProfitPaise: json.estimatedProfitPaise },
      });
    } catch {
      setPhase({ kind: "error", code: "NETWORK", message: "Network problem. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  // Reset whenever the modal is (re)opened; deal cards ask us to convert straight away.
  useEffect(() => {
    if (!open) return;
    setText(initial);
    setPhase({ kind: "idle" });
    setCopied(false);
    if (autoConvert && initial.trim()) void convert(initial, dealId);
  }, [open, initial, autoConvert, dealId, convert]);

  async function paste() {
    try {
      setText(await navigator.clipboard.readText());
      setPhase({ kind: "idle" });
    } catch {
      /* clipboard permission denied: user can paste manually */
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      outRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const done = phase.kind === "done" ? phase.result : null;
  const shareText = done ? `Grab this deal 👇 ${done.shortUrl}` : "";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <Dialog.Content
          className="sheet fixed inset-x-0 bottom-0 z-50 w-full rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-5"
        >
          <div className="mb-1 flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-2xl font-extrabold tracking-tight">Make profit link</Dialog.Title>
            <Dialog.Close className="-mr-1 -mt-1 rounded-full p-2 text-ink-faint hover:bg-canvas" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-sm text-ink-soft">
            Paste a Flipkart, Myntra or Ajio product link. Share the short link and earn when someone buys.
          </Dialog.Description>

          <label htmlFor="make-link-input" className="sr-only">
            Product link
          </label>
          <div className="relative">
            <textarea
              id="make-link-input"
              value={text}
              rows={3}
              onChange={(e) => {
                setText(e.target.value);
                if (phase.kind !== "loading") setPhase({ kind: "idle" });
              }}
              placeholder="https://www.flipkart.com/…"
              className="w-full resize-none rounded-2xl bg-canvas p-3 pr-12 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-ink/30"
            />
            <button
              type="button"
              onClick={paste}
              aria-label="Paste from clipboard"
              className="absolute right-2 top-2 rounded-full p-2 text-ink-soft hover:bg-white"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 min-h-5 text-xs text-ink-soft" aria-live="polite">
            {detected ? (
              <span className="inline-flex items-center gap-1 font-medium text-ink">
                <Check className="h-3.5 w-3.5" aria-hidden /> {detected.name} link detected
              </span>
            ) : looksLikeLink ? (
              "We support Flipkart, Myntra and Ajio links."
            ) : null}
          </p>

          <button
            type="button"
            disabled={!text.trim() || phase.kind === "loading"}
            onClick={() => convert(text, dealId)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-500 py-3.5 text-base font-bold text-ink transition hover:bg-saffron-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase.kind === "loading" ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Link2 className="h-5 w-5" aria-hidden />}
            {phase.kind === "loading" ? "Converting…" : "Convert to profit link"}
          </button>

          {phase.kind === "error" && (
            <p role="alert" className="mt-3 rounded-xl bg-saffron-50 p-3 text-sm text-saffron-700">
              {phase.message}{" "}
              {phase.code === "UNAUTHENTICATED" && (
                <Link href="/login" onClick={close} className="font-bold underline">
                  Log in
                </Link>
              )}
            </p>
          )}

          {done && (
            <div className="mt-4 rounded-2xl bg-leaf-50 p-3 ring-1 ring-leaf-100">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-leaf-700">Your {done.storeName} profit link</p>
              <div className="flex items-center gap-2">
                <input
                  ref={outRef}
                  readOnly
                  value={done.shortUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Your short link"
                  className="num min-w-0 flex-1 rounded-xl bg-white px-3 py-2.5 text-sm font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => copy(done.shortUrl)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-ink-soft"
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {done.estimatedProfitPaise !== null && done.estimatedProfitPaise > 0 && (
                <p className="num mt-2 text-sm font-medium text-leaf-700">You could earn about {formatINR(done.estimatedProfitPaise)} on this deal.</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-black/10 hover:bg-canvas"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(done.shortUrl)}&text=${encodeURIComponent("Grab this deal 👇")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-black/10 hover:bg-canvas"
                >
                  <Send className="h-4 w-4" aria-hidden /> Telegram
                </a>
                {canShare && (
                  <button
                    type="button"
                    onClick={() => navigator.share({ text: shareText }).catch(() => undefined)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-black/10 hover:bg-canvas"
                  >
                    <Share2 className="h-4 w-4" aria-hidden /> More
                  </button>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
