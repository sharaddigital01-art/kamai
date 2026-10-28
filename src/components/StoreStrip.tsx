import Link from "next/link";
import type { StoreView } from "@/types";

export function StoreStrip({ stores }: { stores: StoreView[] }) {
  if (stores.length === 0) return null;
  return (
    <section aria-labelledby="stores-h" className="mt-8">
      <h2 id="stores-h" className="mb-3 font-display text-xl font-extrabold tracking-tight">
        Shop from top stores
      </h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {stores.map((s) => (
          <li key={s.slug} className="snap-start">
            <Link
              href={`/?store=${s.slug}#deals`}
              className="flex w-40 items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5 transition hover:shadow-md"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold text-white"
                style={{ backgroundColor: s.brandColor }}
                aria-hidden
              >
                {s.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{s.name}</span>
                <span className="num block text-xs font-semibold text-leaf-700">Up to {s.profitPct}% profit</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
