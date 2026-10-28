import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { profitPercent } from "./profit";
import type { DealPage, DealView, StoreView } from "@/types";
import { isDatabaseConfigured, MOCK_STORE_VIEWS, filterMockDeals } from "./mockData";

const slug = z.string().regex(/^[a-z0-9-]{2,30}$/);

export const dealFiltersSchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  store: slug.optional(),
  category: slug.optional(),
  minDiscount: z.coerce.number().int().min(0).max(90).optional(),
  /** rupees */
  minPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  sort: z.enum(["trending", "discount", "profit", "new"]).default("trending"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(40).default(20),
});
export type DealFilters = z.infer<typeof dealFiltersSchema>;

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

/** Never throws: bad or empty params fall back to defaults. */
export function parseDealFilters(input: RawParams): DealFilters {
  const flat: Record<string, string> = {};
  const entries = input instanceof URLSearchParams ? [...input.entries()] : Object.entries(input);
  for (const [k, v] of entries) {
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === "string" && first.trim() !== "") flat[k] = first;
  }
  const parsed = dealFiltersSchema.safeParse(flat);
  return parsed.success ? parsed.data : dealFiltersSchema.parse({});
}

const ORDER: Record<DealFilters["sort"], Prisma.DealOrderByWithRelationInput[]> = {
  trending: [{ clickCount: "desc" }, { id: "asc" }],
  discount: [{ discountPct: "desc" }, { id: "asc" }],
  profit: [{ estimatedProfitPaise: "desc" }, { id: "asc" }],
  new: [{ createdAt: "desc" }, { id: "asc" }],
};

export async function getDeals(f: DealFilters): Promise<DealPage> {
  if (!isDatabaseConfigured()) {
    return filterMockDeals(f);
  }

  try {
    const now = new Date();
    const price: Prisma.IntFilter = {};
    if (f.minPrice !== undefined) price.gte = f.minPrice * 100;
    if (f.maxPrice !== undefined) price.lte = f.maxPrice * 100;

    const where: Prisma.DealWhereInput = {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      store: { status: "ACTIVE", ...(f.store ? { slug: f.store } : {}) },
      ...(f.category ? { category: f.category } : {}),
      ...(f.minDiscount ? { discountPct: { gte: f.minDiscount } } : {}),
      ...(Object.keys(price).length ? { pricePaise: price } : {}),
      ...(f.q ? { title: { contains: f.q, mode: "insensitive" } } : {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.deal.count({ where }),
      prisma.deal.findMany({
        where,
        orderBy: ORDER[f.sort],
        skip: (f.page - 1) * f.limit,
        take: f.limit,
        include: { store: { select: { slug: true, name: true, brandColor: true } } },
      }),
    ]);

    const items: DealView[] = rows.map((d) => ({
      id: d.id,
      title: d.title,
      imageUrl: d.imageUrl,
      productUrl: d.productUrl,
      pricePaise: d.pricePaise,
      mrpPaise: d.mrpPaise,
      discountPct: d.discountPct,
      estimatedProfitPaise: d.estimatedProfitPaise,
      category: d.category,
      isFeatured: d.isFeatured,
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      store: d.store,
    }));

    return { items, total, page: f.page, pageCount: Math.max(1, Math.ceil(total / f.limit)) };
  } catch (err) {
    console.warn("Database error in getDeals, using fallback mock data:", err);
    return filterMockDeals(f);
  }
}

export async function getStores(): Promise<StoreView[]> {
  if (!isDatabaseConfigured()) {
    return MOCK_STORE_VIEWS;
  }

  try {
    const stores = await prisma.partnerStore.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return stores.map((s) => ({ slug: s.slug, name: s.name, brandColor: s.brandColor, profitPct: profitPercent(s) }));
  } catch (err) {
    console.warn("Database error in getStores, using fallback mock data:", err);
    return MOCK_STORE_VIEWS;
  }
}
