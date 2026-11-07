import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, getLiveStores } from "@/lib/mockData";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface AppBannerItem {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  priority: number;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface FeaturedDealItem {
  id: string;
  title: string;
  price: number;
  dealPrice: number;
  imageUrl?: string | null;
  affiliateUrl: string;
  store: string;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PartnerStoreItem {
  id: string;
  name: string;
  slug: string;
  commissionRateBps: number;
  userShareBps: number;
  status: "ACTIVE" | "PAUSED";
  profitTag: string;
  brandColor?: string;
  logoUrl?: string | null;
}

// In-Memory Global State for runtime persistence and mock environments
const g = globalThis as unknown as {
  __appBanners?: AppBannerItem[];
  __featuredDeals?: FeaturedDealItem[];
};

const DEFAULT_BANNERS: AppBannerItem[] = [
  {
    id: "banner-1",
    title: "Flipkart Big Billion Days - Up to 80% Off",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80",
    link: "/?store=flipkart",
    priority: 10,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "banner-2",
    title: "Amazon Great Indian Festival Specials",
    imageUrl: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&q=80",
    link: "/?store=amazon",
    priority: 9,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "banner-3",
    title: "Myntra End of Reason Carnival - Flat 8.5% Profit",
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
    link: "/?store=myntra",
    priority: 8,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_DEALS: FeaturedDealItem[] = [
  {
    id: "deal-1",
    title: "boAt Airdopes 141 ANC TWS Earbuds (42H Playtime)",
    price: 4490,
    dealPrice: 1299,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    affiliateUrl: "https://www.flipkart.com/search?q=boat+airdopes+141",
    store: "flipkart",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "deal-2",
    title: "Noise ColorFit Pulse Grand Smart Watch 1.69\" Display",
    price: 3999,
    dealPrice: 999,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    affiliateUrl: "https://www.amazon.in/dp/B09NVPSCQT",
    store: "amazon",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "deal-3",
    title: "Roadster Men Solid Bomber Jacket with Ribbed Hem",
    price: 3299,
    dealPrice: 899,
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80",
    affiliateUrl: "https://www.myntra.com/men-jackets",
    store: "myntra",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

function initMemoryStore() {
  if (!g.__appBanners) {
    g.__appBanners = [...DEFAULT_BANNERS];
  }
  if (!g.__featuredDeals) {
    g.__featuredDeals = [...DEFAULT_DEALS];
  }
}
initMemoryStore();

// ==========================================
// 1. HERO BANNERS CMS
// ==========================================
export async function getBanners(includeInactive = false): Promise<AppBannerItem[]> {
  initMemoryStore();

  if (isDatabaseConfigured()) {
    try {
      const rows = await (prisma as any).appBanner.findMany({
        where: {
          deletedAt: null,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          imageUrl: r.imageUrl,
          link: r.link,
          priority: r.priority,
          isActive: r.isActive,
          deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt ? r.updatedAt.toISOString() : undefined,
        }));
      }
    } catch {
      // Fallback to memory
    }
  }

  const memory = g.__appBanners || [];
  return memory
    .filter((b) => !b.deletedAt && (includeInactive || b.isActive))
    .sort((a, b) => b.priority - a.priority);
}

export async function createBanner(data: {
  title: string;
  imageUrl: string;
  link: string;
  priority?: number;
  isActive?: boolean;
}): Promise<AppBannerItem> {
  initMemoryStore();

  const newBanner: AppBannerItem = {
    id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: data.title.trim(),
    imageUrl: data.imageUrl.trim(),
    link: data.link.trim(),
    priority: data.priority ?? 0,
    isActive: data.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  if (isDatabaseConfigured()) {
    try {
      const created = await (prisma as any).appBanner.create({
        data: {
          title: newBanner.title,
          imageUrl: newBanner.imageUrl,
          link: newBanner.link,
          priority: newBanner.priority,
          isActive: newBanner.isActive,
        },
      });
      newBanner.id = created.id;
    } catch {
      // Fallback
    }
  }

  g.__appBanners = [newBanner, ...(g.__appBanners || [])];
  return newBanner;
}

export async function updateBanner(
  id: string,
  data: Partial<Omit<AppBannerItem, "id" | "createdAt">>
): Promise<AppBannerItem | null> {
  initMemoryStore();

  let updated: AppBannerItem | null = null;

  if (isDatabaseConfigured()) {
    try {
      const row = await (prisma as any).appBanner.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
          ...(data.link !== undefined ? { link: data.link } : {}),
          ...(data.priority !== undefined ? { priority: data.priority } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.deletedAt !== undefined ? { deletedAt: data.deletedAt ? new Date(data.deletedAt) : null } : {}),
        },
      });
      updated = {
        id: row.id,
        title: row.title,
        imageUrl: row.imageUrl,
        link: row.link,
        priority: row.priority,
        isActive: row.isActive,
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      };
    } catch {
      // Fallback
    }
  }

  // Update memory
  const idx = (g.__appBanners || []).findIndex((b) => b.id === id);
  if (idx >= 0) {
    g.__appBanners![idx] = {
      ...g.__appBanners![idx]!,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (!updated) updated = g.__appBanners![idx]!;
  }

  return updated;
}

export async function softDeleteBanner(id: string): Promise<boolean> {
  return Boolean(
    await updateBanner(id, {
      isActive: false,
      deletedAt: new Date().toISOString(),
    })
  );
}

// ==========================================
// 2. FEATURED DEALS CMS
// ==========================================
export async function getFeaturedDeals(includeInactive = false): Promise<FeaturedDealItem[]> {
  initMemoryStore();

  if (isDatabaseConfigured()) {
    try {
      const rows = await (prisma as any).featuredDeal.findMany({
        where: {
          deletedAt: null,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { createdAt: "desc" },
      });

      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          price: r.price,
          dealPrice: r.dealPrice,
          imageUrl: r.imageUrl,
          affiliateUrl: r.affiliateUrl,
          store: r.store,
          isActive: r.isActive,
          deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt ? r.updatedAt.toISOString() : undefined,
        }));
      }
    } catch {
      // Fallback
    }
  }

  const memory = g.__featuredDeals || [];
  return memory.filter((d) => !d.deletedAt && (includeInactive || d.isActive));
}

export async function createFeaturedDeal(data: {
  title: string;
  price: number;
  dealPrice: number;
  imageUrl?: string | null;
  affiliateUrl: string;
  store: string;
  isActive?: boolean;
}): Promise<FeaturedDealItem> {
  initMemoryStore();

  const newDeal: FeaturedDealItem = {
    id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: data.title.trim(),
    price: Number(data.price),
    dealPrice: Number(data.dealPrice),
    imageUrl: data.imageUrl?.trim() || null,
    affiliateUrl: data.affiliateUrl.trim(),
    store: data.store.toLowerCase().trim(),
    isActive: data.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  if (isDatabaseConfigured()) {
    try {
      const created = await (prisma as any).featuredDeal.create({
        data: {
          title: newDeal.title,
          price: newDeal.price,
          dealPrice: newDeal.dealPrice,
          imageUrl: newDeal.imageUrl,
          affiliateUrl: newDeal.affiliateUrl,
          store: newDeal.store,
          isActive: newDeal.isActive,
        },
      });
      newDeal.id = created.id;
    } catch {
      // Fallback
    }
  }

  g.__featuredDeals = [newDeal, ...(g.__featuredDeals || [])];
  return newDeal;
}

export async function updateFeaturedDeal(
  id: string,
  data: Partial<Omit<FeaturedDealItem, "id" | "createdAt">>
): Promise<FeaturedDealItem | null> {
  initMemoryStore();

  let updated: FeaturedDealItem | null = null;

  if (isDatabaseConfigured()) {
    try {
      const row = await (prisma as any).featuredDeal.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.price !== undefined ? { price: Number(data.price) } : {}),
          ...(data.dealPrice !== undefined ? { dealPrice: Number(data.dealPrice) } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
          ...(data.affiliateUrl !== undefined ? { affiliateUrl: data.affiliateUrl } : {}),
          ...(data.store !== undefined ? { store: data.store.toLowerCase() } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.deletedAt !== undefined ? { deletedAt: data.deletedAt ? new Date(data.deletedAt) : null } : {}),
        },
      });
      updated = {
        id: row.id,
        title: row.title,
        price: row.price,
        dealPrice: row.dealPrice,
        imageUrl: row.imageUrl,
        affiliateUrl: row.affiliateUrl,
        store: row.store,
        isActive: row.isActive,
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      };
    } catch {
      // Fallback
    }
  }

  const idx = (g.__featuredDeals || []).findIndex((d) => d.id === id);
  if (idx >= 0) {
    g.__featuredDeals![idx] = {
      ...g.__featuredDeals![idx]!,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (!updated) updated = g.__featuredDeals![idx]!;
  }

  return updated;
}

export async function softDeleteFeaturedDeal(id: string): Promise<boolean> {
  return Boolean(
    await updateFeaturedDeal(id, {
      isActive: false,
      deletedAt: new Date().toISOString(),
    })
  );
}

// ==========================================
// 3. PARTNER STORES MANAGER
// ==========================================
export async function getPartnerStores(): Promise<PartnerStoreItem[]> {
  if (isDatabaseConfigured()) {
    try {
      const dbStores = await prisma.partnerStore.findMany({
        orderBy: { sortOrder: "asc" },
      });

      if (dbStores && dbStores.length > 0) {
        return dbStores.map((s) => {
          const userShareBps = s.userShareBps || 6000;
          const effectivePct = ((s.commissionRateBps * userShareBps) / 1000000).toFixed(1);
          return {
            id: s.id,
            name: s.name,
            slug: s.slug,
            commissionRateBps: s.commissionRateBps,
            userShareBps: s.userShareBps,
            status: s.status as "ACTIVE" | "PAUSED",
            profitTag: `Upto ${effectivePct}% Profit`,
            brandColor: s.brandColor,
            logoUrl: s.logoUrl,
          };
        });
      }
    } catch {
      // Fallback
    }
  }

  const live = getLiveStores();
  return live.map((s) => {
    const userShareBps = s.userShareBps || 6000;
    const effectivePct = ((s.commissionRateBps * userShareBps) / 1000000).toFixed(1);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      commissionRateBps: s.commissionRateBps,
      userShareBps: s.userShareBps,
      status: s.status as "ACTIVE" | "PAUSED",
      profitTag: `Upto ${effectivePct}% Profit`,
      brandColor: s.brandColor,
      logoUrl: s.logoUrl,
    };
  });
}

export async function updatePartnerStore(
  slug: string,
  data: {
    status?: "ACTIVE" | "PAUSED";
    displayedProfitPct?: number;
    commissionRateBps?: number;
  }
): Promise<PartnerStoreItem | null> {
  if (isDatabaseConfigured()) {
    try {
      const existing = await prisma.partnerStore.findUnique({ where: { slug } });
      if (existing) {
        const userShareBps = existing.userShareBps || 6000;
        let nextBps = existing.commissionRateBps;
        if (data.displayedProfitPct !== undefined) {
          nextBps = Math.round((data.displayedProfitPct * 1000000) / userShareBps);
        } else if (data.commissionRateBps !== undefined) {
          nextBps = data.commissionRateBps;
        }

        const updated = await prisma.partnerStore.update({
          where: { slug },
          data: {
            ...(data.status ? { status: data.status } : {}),
            commissionRateBps: nextBps,
          },
        });

        const effectivePct = ((updated.commissionRateBps * userShareBps) / 1000000).toFixed(1);
        return {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          commissionRateBps: updated.commissionRateBps,
          userShareBps: updated.userShareBps,
          status: updated.status as "ACTIVE" | "PAUSED",
          profitTag: `Upto ${effectivePct}% Profit`,
          brandColor: updated.brandColor,
          logoUrl: updated.logoUrl,
        };
      }
    } catch {
      // Fallback
    }
  }

  const live = getLiveStores();
  const store = live.find((s) => s.slug === slug);
  if (!store) return null;

  if (data.status) store.status = data.status;
  if (data.displayedProfitPct !== undefined) {
    const userShareBps = store.userShareBps || 6000;
    store.commissionRateBps = Math.round((data.displayedProfitPct * 1000000) / userShareBps);
  } else if (data.commissionRateBps !== undefined) {
    store.commissionRateBps = data.commissionRateBps;
  }

  const userShareBps = store.userShareBps || 6000;
  const effectivePct = ((store.commissionRateBps * userShareBps) / 1000000).toFixed(1);
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    commissionRateBps: store.commissionRateBps,
    userShareBps: store.userShareBps,
    status: store.status as "ACTIVE" | "PAUSED",
    profitTag: `Upto ${effectivePct}% Profit`,
    brandColor: store.brandColor,
    logoUrl: store.logoUrl,
  };
}
