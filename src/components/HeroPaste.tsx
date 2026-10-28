"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import { useMakeLink } from "@/store/makeLink";

const STEPS = ["Paste a product link", "Share your short link", "Get paid when it sells"];

export function HeroPaste() {
  const openModal = useMakeLink((s) => s.openModal);
  const [value, setValue] = useState("");

  return (
    <section className="mt-5 overflow-hidden rounded-3xl bg-ink px-5 py-8 text-white sm:px-10 sm:py-12">
      <h1 className="max-w-xl font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
        Every link you share can <span className="text-saffron-400">pay you back.</span>
      </h1>
      <p className="mt-3 max-w-lg text-sm text-white/70 sm:text-base">
        Turn any Flipkart, Myntra or Ajio product link into a profit link in one paste.
      </p>

      <form
        className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          openModal({ input: value, autoConvert: Boolean(value.trim()) });
        }}
      >
        <label htmlFor="hero-link" className="sr-only">
          Paste a product link
        </label>
        <input
          id="hero-link"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a product link here"
          className="min-w-0 flex-1 rounded-full bg-white px-5 py-3.5 text-sm text-ink outline-none ring-2 ring-transparent placeholder:text-ink-faint focus:ring-saffron-400"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-saffron-500 px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-saffron-400"
        >
          <Link2 className="h-4 w-4" aria-hidden /> Make link
        </button>
      </form>

      <ol className="mt-6 flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:gap-6">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className="num grid h-6 w-6 place-items-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}
