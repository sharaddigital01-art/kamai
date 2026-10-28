"use client";

import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import type { DealFilters } from "@/lib/deals";
import type { DealPage } from "@/types";
import { DealCard } from "./DealCard";

async function fetchDeals(filters: Omit<DealFilters, "page">, page: number): Promise<DealPage> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, page })) if (v !== undefined && v !== "") qs.set(k, String(v));
  const res = await fetch(`/api/deals?${qs}`);
  if (!res.ok) throw new Error("Failed to load deals");
  return res.json();
}

/**
 * Page 1 is rendered on the server (fast first paint, crawlable); "Load more" pages come from the API.
 * The URL is the source of truth for filters: when it changes the server re-renders with new `initial`.
 */
export function DealFeed({ initial, filters }: { initial: DealPage; filters: DealFilters }) {
  const { page: _page, ...key } = filters;

  const q = useInfiniteQuery({
    queryKey: ["deals", key],
    queryFn: ({ pageParam }) => fetchDeals(key, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
    initialData: { pages: [initial], pageParams: [1] } satisfies InfiniteData<DealPage, number>,
  });

  const items = q.data.pages.flatMap((p) => p.items);
  const total = q.data.pages[0]?.total ?? 0;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-black/5">
        <p className="font-display text-xl font-bold">No deals match those filters</p>
        <p className="mt-1 text-sm text-ink-soft">Try a lower discount or a different category.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="num mb-3 text-sm text-ink-soft">{total.toLocaleString("en-IN")} deals</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {items.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
      </div>

      {q.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => q.fetchNextPage()}
            disabled={q.isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold ring-1 ring-black/10 hover:bg-canvas disabled:opacity-60"
          >
            {q.isFetchingNextPage && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            Load more deals
          </button>
        </div>
      )}
      {q.isError && <p role="alert" className="mt-4 text-center text-sm text-saffron-700">Couldn’t load more deals. Please try again.</p>}
    </div>
  );
}
