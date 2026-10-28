import { HeroBannerCarousel } from "@/components/home/HeroBannerCarousel";
import { CategoryPills } from "@/components/home/CategoryPills";
import { QuickPromoTiles } from "@/components/home/QuickPromoTiles";
import { TopSellersGrid } from "@/components/home/TopSellersGrid";
import { FlashDealHero } from "@/components/home/FlashDealHero";
import { CategorySectionDeals } from "@/components/home/CategorySectionDeals";
import { DealFeed } from "@/components/DealFeed";
import { getDeals, parseDealFilters } from "@/lib/deals";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseDealFilters(sp);

  // Fetch deals for the view
  const allDeals = await getDeals({ ...filters, page: 1, limit: 30 });
  const items = allDeals.items;

  // Filter deals for category sections
  const flipkartDeals = items.filter((d) => d.store.slug === "flipkart").slice(0, 4);
  const amazonDeals = items.filter((d) => d.store.slug === "amazon").slice(0, 4);
  const fashionDeals = items
    .filter((d) => d.category === "fashion" || d.category === "footwear" || d.category === "accessories" || d.store.slug === "myntra" || d.store.slug === "ajio")
    .slice(0, 4);

  const hasSpecificFilter = Boolean(filters.q || filters.store || (filters.category && filters.category !== "super-sellers"));

  return (
    <div className="space-y-2 pb-8">
      {sp.error === "access-denied" && (
        <div role="alert" className="mt-3 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-800 ring-1 ring-red-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-red-700 font-bold">!</span>
            <span>Access Denied: You must be an authorized administrator to access the Admin Panel.</span>
          </div>
        </div>
      )}

      {sp.link === "not-found" && (
        <div role="status" className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          That short link doesn't exist or has expired.
        </div>
      )}

      {/* 1. Hero Promotional Banner Carousel */}
      <HeroBannerCarousel />

      {/* 2. Horizontal Category Pills */}
      <CategoryPills />

      {/* 3. Quick Promo Tiles */}
      <QuickPromoTiles />

      {/* If user searched or applied a filter, show direct filtered feed */}
      {hasSpecificFilter ? (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
              {filters.q ? `Results for "${filters.q}"` : `${filters.store ? filters.store.toUpperCase() : filters.category?.toUpperCase()} DEALS`}
            </h2>
            <span className="text-xs text-ink-soft">{allDeals.total} Deals</span>
          </div>
          <DealFeed initial={allDeals} filters={filters} />
        </section>
      ) : (
        <>
          {/* 4. Top Sellers 2-Column Grid */}
          <TopSellersGrid deals={items} />

          {/* 5. Flash Deals Red Hero with Countdown */}
          <FlashDealHero />

          {/* 6. Flipkart Top Sellers */}
          <CategorySectionDeals
            title="FLIPKART TOP SELLERS"
            storeBadge="Flipkart"
            badgeBg="bg-[#2874F0]"
            storeSlug="flipkart"
            deals={flipkartDeals.length > 0 ? flipkartDeals : items.slice(0, 4)}
          />

          {/* 7. Amazon Festival */}
          <CategorySectionDeals
            title="AMAZON FESTIVAL"
            storeBadge="Amazon"
            badgeBg="bg-[#FF9900]"
            storeSlug="amazon"
            deals={amazonDeals.length > 0 ? amazonDeals : items.slice(2, 6)}
          />

          {/* 8. Best in Fashion */}
          <CategorySectionDeals
            title="BEST IN FASHION"
            storeBadge="Myntra & Ajio"
            badgeBg="bg-[#E5336A]"
            storeSlug="myntra"
            deals={fashionDeals.length > 0 ? fashionDeals : items.slice(4, 8)}
          />
        </>
      )}
    </div>
  );
}
