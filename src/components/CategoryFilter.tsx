"use client";

import { clsx } from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CATEGORIES, DISCOUNT_STEPS, SORTS } from "@/lib/constants";
import type { StoreView } from "@/types";

const PRICE_PRESETS = [
  { value: "", label: "Any price", min: null, max: null },
  { value: "0-500", label: "Under ₹500", min: "0", max: "500" },
  { value: "500-1000", label: "₹500 – ₹1,000", min: "500", max: "1000" },
  { value: "1000-2500", label: "₹1,000 – ₹2,500", min: "1000", max: "2500" },
  { value: "2500-", label: "Above ₹2,500", min: "2500", max: null },
] as const;

const chip = (active: boolean) =>
  clsx(
    "shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition",
    active ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-black/10 hover:bg-canvas",
  );

const select =
  "rounded-full bg-white px-3.5 py-2 text-sm font-medium text-ink-soft ring-1 ring-black/10 outline-none focus:ring-ink/40";

export function CategoryFilter({ stores }: { stores: StoreView[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const category = params.get("category") ?? "";
  const store = params.get("store") ?? "";
  const minDiscount = params.get("minDiscount") ?? "";
  const sort = params.get("sort") ?? "trending";
  const min = params.get("minPrice");
  const max = params.get("maxPrice");
  const priceValue = PRICE_PRESETS.find((p) => (p.min ?? null) === min && (p.max ?? null) === max)?.value ?? "";

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}#deals`, { scroll: false }));
  }

  const hasFilters = Boolean(category || store || minDiscount || min || max || params.get("q"));

  return (
    <div className={clsx("space-y-3 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Categories">
        <button type="button" className={chip(!category)} onClick={() => update({ category: null })} aria-pressed={!category}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.slug} type="button" className={chip(category === c.slug)} onClick={() => update({ category: c.slug })} aria-pressed={category === c.slug}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <select aria-label="Store" className={select} value={store} onChange={(e) => update({ store: e.target.value || null })}>
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Price range"
          className={select}
          value={priceValue}
          onChange={(e) => {
            const p = PRICE_PRESETS.find((x) => x.value === e.target.value);
            update({ minPrice: p?.min ?? null, maxPrice: p?.max ?? null });
          }}
        >
          {PRICE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="flex shrink-0 gap-2" role="group" aria-label="Minimum discount">
          {DISCOUNT_STEPS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={minDiscount === String(d)}
              onClick={() => update({ minDiscount: minDiscount === String(d) ? null : String(d) })}
              className={clsx(chip(minDiscount === String(d)), "num py-2")}
            >
              {d}%+ off
            </button>
          ))}
        </div>

        <select aria-label="Sort deals" className={select} value={sort} onChange={(e) => update({ sort: e.target.value === "trending" ? null : e.target.value })}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => startTransition(() => router.replace(`${pathname}#deals`, { scroll: false }))}
            className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-saffron-700 underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
