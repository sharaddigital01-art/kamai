import { estimateProfitPaise, profitPercent } from "./profit";
import type { DealFilters } from "./deals";
import type { DealPage, DealView, StoreView } from "@/types";
import type { Balances } from "./ledger";
import type { User, LedgerStatus, WithdrawalStatus, PayoutMethod } from "@prisma/client";

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  if (url.includes("YOUR-REF") || url.includes("YOUR-PROJECT") || url.includes("PASSWORD")) {
    return false;
  }
  return true;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  if (url.includes("YOUR-PROJECT") || anon.includes("your-anon-key")) {
    return false;
  }
  return true;
}

export interface MockStore {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
  commissionRateBps: number;
  userShareBps: number;
  sortOrder: number;
  status: "ACTIVE" | "PAUSED";
  confirmationDays: number;
  category?: string;
  logoUrl?: string;
}

export const INITIAL_STORES: MockStore[] = [
  {
    id: "00000000-0000-0000-0000-000000000011",
    slug: "flipkart",
    name: "Flipkart",
    brandColor: "#2874F0",
    commissionRateBps: 1250,
    userShareBps: 6000,
    sortOrder: 1,
    status: "ACTIVE",
    confirmationDays: 60,
    category: "electronics",
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    slug: "amazon",
    name: "Amazon",
    brandColor: "#FF9900",
    commissionRateBps: 1333,
    userShareBps: 6000,
    sortOrder: 2,
    status: "ACTIVE",
    confirmationDays: 45,
    category: "electronics",
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    slug: "myntra",
    name: "Myntra",
    brandColor: "#E5336A",
    commissionRateBps: 1416,
    userShareBps: 6000,
    sortOrder: 3,
    status: "ACTIVE",
    confirmationDays: 45,
    category: "fashion",
  },
  {
    id: "00000000-0000-0000-0000-000000000014",
    slug: "ajio",
    name: "Ajio",
    brandColor: "#3D4F5E",
    commissionRateBps: 1533,
    userShareBps: 6000,
    sortOrder: 4,
    status: "ACTIVE",
    confirmationDays: 60,
    category: "fashion",
  },
  {
    id: "00000000-0000-0000-0000-000000000015",
    slug: "shopsy",
    name: "Shopsy",
    brandColor: "#842993",
    commissionRateBps: 1000,
    userShareBps: 6000,
    sortOrder: 5,
    status: "ACTIVE",
    confirmationDays: 60,
    category: "fashion",
  },
  {
    id: "00000000-0000-0000-0000-000000000016",
    slug: "nykaa",
    name: "Nykaa",
    brandColor: "#FC2779",
    commissionRateBps: 1666,
    userShareBps: 6000,
    sortOrder: 6,
    status: "ACTIVE",
    confirmationDays: 45,
    category: "beauty",
  },
  {
    id: "00000000-0000-0000-0000-000000000017",
    slug: "tatacliq",
    name: "Tata CLiQ",
    brandColor: "#0F223D",
    commissionRateBps: 916,
    userShareBps: 6000,
    sortOrder: 7,
    status: "ACTIVE",
    confirmationDays: 60,
    category: "electronics",
  },
  {
    id: "00000000-0000-0000-0000-000000000018",
    slug: "croma",
    name: "Croma",
    brandColor: "#00E9BF",
    commissionRateBps: 700,
    userShareBps: 6000,
    sortOrder: 8,
    status: "ACTIVE",
    confirmationDays: 60,
    category: "electronics",
  },
  {
    id: "00000000-0000-0000-0000-000000000019",
    slug: "jiomart",
    name: "JioMart",
    brandColor: "#0078AD",
    commissionRateBps: 1083,
    userShareBps: 6000,
    sortOrder: 9,
    status: "ACTIVE",
    confirmationDays: 45,
    category: "grocery",
  },
];

export const MOCK_STORES = INITIAL_STORES;

export interface MockDealItem {
  id: string;
  storeId: string;
  externalId: string;
  title: string;
  category: string;
  pricePaise: number;
  mrpPaise: number;
  discountPct: number;
  estimatedProfitPaise: number;
  productUrl: string;
  imageUrl: string | null;
  offerTag?: string | null;
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  clickCount: number;
  shareCount: number;
  createdAt: Date;
  expiresAt: Date | null;
  store: { slug: string; name: string; brandColor: string };
}

const rawDeals = [
  {
    id: "00000000-0000-0000-0000-000000000099",
    store: "flipkart",
    ext: "fk-luggage",
    title: "NASHER MILES Luggage Set of 3 Hard Trolley Bags (55, 65, 75 cm)",
    category: "accessories",
    price: 4999,
    mrp: 47985,
    url: "https://www.flipkart.com/search?q=nasher+miles+luggage+set",
    imageUrl: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&auto=format&fit=crop&q=80",
    tags: ["luggage", "travel", "festive"],
    featured: true,
    clickCount: 120,
  },
  {
    id: "00000000-0000-0000-0000-000000000098",
    store: "myntra",
    ext: "my-adidas",
    title: "ADIDAS Running Shoes for Men (Ultralight Mesh Sole)",
    category: "footwear",
    price: 1899,
    mrp: 5999,
    url: "https://www.myntra.com/adidas-shoes",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    tags: ["shoes", "adidas", "sneakers"],
    featured: true,
    clickCount: 95,
  },
  {
    id: "00000000-0000-0000-0000-000000000097",
    store: "amazon",
    ext: "az-lamp",
    title: "Wipro Smart LED Desk Lamp with 3 Color Modes & Touch Dimmer",
    category: "electronics",
    price: 699,
    mrp: 2499,
    url: "https://www.amazon.in/s?k=wipro+led+desk+lamp",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
    tags: ["home", "lighting", "study"],
    featured: true,
    clickCount: 80,
  },
  {
    id: "00000000-0000-0000-0000-000000000096",
    store: "flipkart",
    ext: "fk-creditcard",
    title: "Flipkart Axis Bank Credit Card (Flat ₹1,000 Welcome Voucher + 5% Cashback)",
    category: "electronics",
    price: 499,
    mrp: 1500,
    url: "https://www.flipkart.com/search?q=axis+bank+credit+card",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
    tags: ["creditcard", "finance", "exclusive"],
    featured: true,
    clickCount: 150,
  },
  {
    id: "00000000-0000-0000-0000-000000000101",
    store: "flipkart",
    ext: "seed-1",
    title: "True wireless earbuds with 40h playtime",
    category: "electronics",
    price: 1299,
    mrp: 4999,
    url: "https://www.flipkart.com/search?q=wireless+earbuds",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    tags: ["audio", "electronics"],
    featured: true,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    store: "flipkart",
    ext: "seed-2",
    title: "Smartwatch with AMOLED display and Bluetooth calling",
    category: "electronics",
    price: 1799,
    mrp: 6999,
    url: "https://www.flipkart.com/search?q=smartwatch",
    imageUrl: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80",
    tags: ["wearables", "electronics"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    store: "flipkart",
    ext: "seed-3",
    title: "Stainless steel insulated water bottle 1L",
    category: "home",
    price: 399,
    mrp: 899,
    url: "https://www.flipkart.com/search?q=insulated+bottle",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    tags: ["kitchen", "home"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000104",
    store: "flipkart",
    ext: "seed-4",
    title: "Cotton bedsheet set, double bed with pillow covers",
    category: "home",
    price: 549,
    mrp: 1999,
    url: "https://www.flipkart.com/search?q=bedsheet",
    imageUrl: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&auto=format&fit=crop&q=80",
    tags: ["bedding", "home"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000105",
    store: "myntra",
    ext: "seed-5",
    title: "Men’s regular fit cotton t-shirt, pack of 3",
    category: "fashion",
    price: 699,
    mrp: 2397,
    url: "https://www.myntra.com/men-tshirts",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    tags: ["menswear", "fashion"],
    featured: true,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000106",
    store: "myntra",
    ext: "seed-6",
    title: "Women’s printed straight ethnic kurta",
    category: "fashion",
    price: 599,
    mrp: 1999,
    url: "https://www.myntra.com/women-kurtas",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80",
    tags: ["womenswear", "fashion"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000107",
    store: "myntra",
    ext: "seed-7",
    title: "Unisex running sneakers, lightweight breathable",
    category: "footwear",
    price: 1499,
    mrp: 3999,
    url: "https://www.myntra.com/sneakers",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    tags: ["shoes", "footwear"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000108",
    store: "myntra",
    ext: "seed-8",
    title: "Matte liquid lipstick long-stay combo",
    category: "beauty",
    price: 349,
    mrp: 899,
    url: "https://www.myntra.com/lipstick",
    imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80",
    tags: ["makeup", "beauty"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000109",
    store: "ajio",
    ext: "seed-9",
    title: "Slim fit stretch denim jeans for men",
    category: "fashion",
    price: 899,
    mrp: 2999,
    url: "https://www.ajio.com/search/?text=jeans",
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
    tags: ["menswear", "fashion"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000110",
    store: "ajio",
    ext: "seed-10",
    title: "Canvas tote bag with multi zip pockets",
    category: "accessories",
    price: 449,
    mrp: 1299,
    url: "https://www.ajio.com/search/?text=tote+bag",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
    tags: ["bags", "accessories"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000111",
    store: "ajio",
    ext: "seed-11",
    title: "Casual slip-on canvas sneakers for daily wear",
    category: "footwear",
    price: 799,
    mrp: 2499,
    url: "https://www.ajio.com/search/?text=sneakers",
    imageUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80",
    tags: ["shoes", "footwear"],
    featured: false,
    clickCount: 0,
  },
  {
    id: "00000000-0000-0000-0000-000000000112",
    store: "ajio",
    ext: "seed-12",
    title: "Analog watch with classic genuine leather strap",
    category: "accessories",
    price: 999,
    mrp: 3499,
    url: "https://www.ajio.com/search/?text=watch",
    imageUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
    tags: ["watches", "accessories"],
    featured: true,
    clickCount: 0,
  },
];

export const INITIAL_DEALS: MockDealItem[] = rawDeals.map((d, index) => {
  const store = INITIAL_STORES.find((s) => s.slug === d.store) || INITIAL_STORES[0]!;
  const pricePaise = d.price * 100;
  const mrpPaise = d.mrp * 100;
  return {
    id: d.id,
    storeId: store.id,
    externalId: d.ext,
    title: d.title,
    category: d.category,
    pricePaise,
    mrpPaise,
    discountPct: Math.round((1 - d.price / d.mrp) * 100),
    estimatedProfitPaise: estimateProfitPaise(pricePaise, store),
    productUrl: d.url,
    imageUrl: d.imageUrl,
    tags: d.tags,
    isFeatured: Boolean(d.featured),
    isActive: true,
    clickCount: d.clickCount,
    shareCount: 0,
    createdAt: new Date(Date.now() - (index + 1) * 3600_000 * 4),
    expiresAt: null,
    store: { slug: store.slug, name: store.name, brandColor: store.brandColor },
  };
});

export const MOCK_DEALS = INITIAL_DEALS;

// --- Global Dynamic State Definition ---

export interface MockLink {
  id: string;
  userId: string;
  storeId: string;
  dealId: string | null;
  code: string;
  subId: string;
  originalUrl: string;
  canonicalUrl: string;
  urlHash: string;
  destinationUrl: string;
  clickCount: number;
  lastClickedAt: Date | null;
  createdAt: Date;
  store: { name: string; slug?: string };
  deal?: { title: string } | null;
}

export interface MockLedgerRow {
  id: string;
  store: { name: string } | null;
  externalOrderId: string;
  orderAmountPaise: number;
  userAmountPaise: number;
  status: LedgerStatus;
  createdAt: Date;
}

export interface MockWithdrawalItem {
  id: string;
  userId: string;
  userName?: string;
  amountPaise: number;
  method: PayoutMethod;
  upiId: string;
  status: WithdrawalStatus;
  requestedAt: Date;
}

export interface MockClickEvent {
  code: string;
  timestamp: Date;
  store: string;
  ip: string;
}

export interface MockUserRecord {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  role: "USER" | "ADMIN";
  isVerified?: boolean;
  referralCode: string;
  subIdPrefix: string;
  createdAt: Date;
}

export interface TelegramChannelItem {
  id: string | number;
  title: string;
  username?: string | null;
}

export interface MockTelegramChannelConfig {
  id: string;
  userId: string;
  telegramUserId: string | null;
  telegramUsername: string | null;
  sessionString?: string | null;
  sourceChannels: any;
  targetChannels?: any;
  targetChannelId: string | null;
  targetChannelName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockConversionRecord {
  id: string;
  transactionId: string;
  storeName: string;
  saleAmount: number;
  commission: number;
  status: string;
  subid: string | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const g = globalThis as unknown as {
  mockLinks?: Map<string, MockLink>;
  mockBalances?: Balances;
  mockPayout?: { upiId: string | null; accountHolder: string | null };
  mockWithdrawals?: MockWithdrawalItem[];
  mockLedger?: MockLedgerRow[];
  mockStores?: MockStore[];
  mockDeals?: MockDealItem[];
  mockClicks?: MockClickEvent[];
  mockUsers?: Map<string, MockUserRecord>;
  userBalances?: Map<string, Balances>;
  mockTelegramConfigs?: Map<string, MockTelegramChannelConfig>;
  mockConversions?: Map<string, MockConversionRecord>;
  mockShortLinks?: Map<string, MockShortLink>;
  totalClicks?: number;
  adminRevenuePaise?: number;
};

if (!g.mockUsers) {
  g.mockUsers = new Map();
  // Add seed admin and default user
  g.mockUsers.set("admin@earnkaro.com", {
    id: "00000000-0000-0000-0000-000000000002",
    email: "admin@earnkaro.com",
    name: "EarnKaro Admin",
    role: "ADMIN",
    referralCode: "EKADMIN",
    subIdPrefix: "ADMIN1",
    createdAt: new Date(),
  });
}

// Initialize Fresh Default States (starts at 0 as requested)
if (!g.mockBalances) {
  g.mockBalances = {
    pending: 0,
    available: 0,
    inWithdrawal: 0,
    paid: 0,
    lifetime: 0,
  };
}

if (!g.mockLedger) {
  g.mockLedger = [];
}

if (!g.mockWithdrawals) {
  g.mockWithdrawals = [];
}

if (!g.mockClicks) {
  g.mockClicks = [];
}

if (g.totalClicks === undefined) {
  g.totalClicks = 0;
}

if (!g.mockStores) {
  g.mockStores = [...INITIAL_STORES];
}

if (!g.mockDeals) {
  g.mockDeals = [...INITIAL_DEALS];
}

if (!g.mockLinks) {
  g.mockLinks = new Map();
}

// Accessors for Dynamic Live State
export function getLiveStores(): MockStore[] {
  return g.mockStores || INITIAL_STORES;
}

export function getLiveDeals(): MockDealItem[] {
  return g.mockDeals || INITIAL_DEALS;
}

export function getLiveBalances(): Balances {
  return (
    g.mockBalances || {
      pending: 0,
      available: 0,
      inWithdrawal: 0,
      paid: 0,
      lifetime: 0,
    }
  );
}

export function getLiveLedger(): MockLedgerRow[] {
  return g.mockLedger || [];
}

export function getLiveWithdrawals(): MockWithdrawalItem[] {
  return g.mockWithdrawals || [];
}

export function getLiveClicks(): MockClickEvent[] {
  return g.mockClicks || [];
}

export function getLiveTotalClicks(): number {
  return g.totalClicks || 0;
}

export function getLiveStats() {
  const balances = getLiveBalances();
  const totalClicks = getLiveTotalClicks();
  const ledger = getLiveLedger();
  const totalTxns = ledger.filter((l) => l.status === "CONFIRMED" || l.status === "PAID").length;
  const convRate = totalClicks > 0 ? `${((totalTxns / totalClicks) * 100).toFixed(1)}%` : "0.0%";

  return {
    totalProfitPaise: balances.lifetime,
    availablePaise: balances.available,
    pendingPaise: balances.pending,
    paidPaise: balances.paid,
    inWithdrawalPaise: balances.inWithdrawal,
    totalClicks,
    totalTransactions: totalTxns,
    convRate,
    registeredUsersCount: 1,
    adminRevenuePaise: (g as any).adminRevenuePaise || 0,
  };
}

export const MOCK_BALANCES: Balances = {
  get pending() {
    return getLiveBalances().pending;
  },
  get available() {
    return getLiveBalances().available;
  },
  get inWithdrawal() {
    return getLiveBalances().inWithdrawal;
  },
  get paid() {
    return getLiveBalances().paid;
  },
  get lifetime() {
    return getLiveBalances().lifetime;
  },
};

export const MOCK_LEDGER_ROWS: MockLedgerRow[] = [];
export const MOCK_WITHDRAWALS: any[] = [];

export const MOCK_STORE_VIEWS: StoreView[] = INITIAL_STORES.map((s) => ({
  slug: s.slug,
  name: s.name,
  brandColor: s.brandColor,
  profitPct: profitPercent(s),
}));

export function filterMockDeals(f: DealFilters): DealPage {
  let list = getLiveDeals().filter((d) => d.isActive);

  if (f.store) {
    list = list.filter((d) => d.store.slug === f.store);
  }
  if (f.category) {
    list = list.filter((d) => d.category.toLowerCase() === f.category!.toLowerCase());
  }
  if (f.minDiscount !== undefined) {
    list = list.filter((d) => d.discountPct >= f.minDiscount!);
  }
  if (f.minPrice !== undefined) {
    list = list.filter((d) => d.pricePaise >= f.minPrice! * 100);
  }
  if (f.maxPrice !== undefined) {
    list = list.filter((d) => d.pricePaise <= f.maxPrice! * 100);
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)) ||
        d.store.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }

  // Sort
  if (f.sort === "discount") {
    list.sort((a, b) => b.discountPct - a.discountPct);
  } else if (f.sort === "profit") {
    list.sort((a, b) => b.estimatedProfitPaise - a.estimatedProfitPaise);
  } else if (f.sort === "new") {
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    // trending
    list.sort((a, b) => b.clickCount - a.clickCount);
  }

  const total = list.length;
  const start = (f.page - 1) * f.limit;
  const paged = list.slice(start, start + f.limit);

  const items: DealView[] = paged.map((d) => ({
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

  return {
    items,
    total,
    page: f.page,
    pageCount: Math.max(1, Math.ceil(total / f.limit)),
  };
}

// User Profile
export const DEMO_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@kamai.local",
  phone: "+919876543210",
  name: "Demo Partner",
  role: "USER",
  referralCode: "KAMAIDEMO",
  subIdPrefix: "DEMO12",
  referredById: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export function saveMockLink(link: MockLink) {
  g.mockLinks!.set(link.code, link);
}

export function getMockLinks(userId: string): MockLink[] {
  return Array.from(g.mockLinks!.values())
    .filter((l) => l.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getMockLinkByCode(code: string): MockLink | undefined {
  return g.mockLinks!.get(code);
}

// Clicks Tracker: Real dynamic counting
export function incrementMockLinkClick(code: string) {
  if (g.totalClicks === undefined) g.totalClicks = 0;
  g.totalClicks += 1;

  if (!g.mockClicks) g.mockClicks = [];

  const item = g.mockLinks?.get(code);
  let storeName = "Flipkart";
  if (item) {
    item.clickCount += 1;
    item.lastClickedAt = new Date();
    storeName = item.store.name;
  }

  g.mockClicks.unshift({
    code,
    timestamp: new Date(),
    store: storeName,
    ip: "192.168.1." + Math.floor(Math.random() * 200 + 10),
  });

  if (g.mockClicks.length > 50) g.mockClicks.pop();
}

// Real conversion simulation: increments profit from ₹0.00 upwards
export function recordLiveConversion(
  storeSlug = "flipkart",
  orderAmountPaise = 149900,
  userAmountPaise = 11242
) {
  if (!g.mockBalances) {
    g.mockBalances = { pending: 0, available: 0, inWithdrawal: 0, paid: 0, lifetime: 0 };
  }
  if (!g.mockLedger) g.mockLedger = [];

  const store = getLiveStores().find((s) => s.slug === storeSlug) || getLiveStores()[0]!;
  const newRow: MockLedgerRow = {
    id: "od-" + Date.now(),
    store: { name: store.name },
    externalOrderId: "OD" + Math.floor(Math.random() * 900000000 + 100000000),
    orderAmountPaise,
    userAmountPaise,
    status: "CONFIRMED",
    createdAt: new Date(),
  };

  g.mockLedger.unshift(newRow);
  g.mockBalances.available += userAmountPaise;
  g.mockBalances.lifetime += userAmountPaise;
  return newRow;
}

export function recordCuelinksPostback(data: {
  txId: string;
  subId: string;
  storeName?: string;
  orderAmountPaise: number;
  totalCommissionPaise: number;
  userEarningsPaise: number;
  adminProfitPaise: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
}) {
  if (!g.mockBalances) {
    g.mockBalances = { pending: 0, available: 0, inWithdrawal: 0, paid: 0, lifetime: 0 };
  }
  if (!g.mockLedger) g.mockLedger = [];

  const storeName = data.storeName || "Partner Store";
  const existingIdx = g.mockLedger.findIndex((l) => l.externalOrderId === data.txId);

  const ledgerRow: MockLedgerRow = {
    id: data.txId,
    store: { name: storeName },
    externalOrderId: data.txId,
    orderAmountPaise: data.orderAmountPaise,
    userAmountPaise: data.userEarningsPaise,
    status: data.status,
    createdAt: new Date(),
  };

  if (existingIdx >= 0) {
    const prev = g.mockLedger[existingIdx]!;
    // Subtract previous balance credit
    if (prev.status === "CONFIRMED") {
      g.mockBalances.available = Math.max(0, g.mockBalances.available - prev.userAmountPaise);
      g.mockBalances.lifetime = Math.max(0, g.mockBalances.lifetime - prev.userAmountPaise);
    } else if (prev.status === "PENDING") {
      g.mockBalances.pending = Math.max(0, g.mockBalances.pending - prev.userAmountPaise);
      g.mockBalances.lifetime = Math.max(0, g.mockBalances.lifetime - prev.userAmountPaise);
    }
    g.mockLedger[existingIdx] = ledgerRow;
  } else {
    g.mockLedger.unshift(ledgerRow);
  }

  // Credit new status
  if (data.status === "CONFIRMED") {
    g.mockBalances.available += data.userEarningsPaise;
    g.mockBalances.lifetime += data.userEarningsPaise;
  } else if (data.status === "PENDING") {
    g.mockBalances.pending += data.userEarningsPaise;
    g.mockBalances.lifetime += data.userEarningsPaise;
  }

  // Track admin revenue
  (g as any).adminRevenuePaise = ((g as any).adminRevenuePaise || 0) + data.adminProfitPaise;

  return {
    row: ledgerRow,
    balances: g.mockBalances,
    adminRevenuePaise: (g as any).adminRevenuePaise,
  };
}

export function getUserBalances(userId?: string): Balances {
  if (!g.userBalances) {
    g.userBalances = new Map();
  }
  if (!userId || userId === DEMO_USER.id) {
    if (!g.mockBalances) {
      g.mockBalances = { pending: 0, available: 0, inWithdrawal: 0, paid: 0, lifetime: 0 };
    }
    return g.mockBalances;
  }
  if (!g.userBalances.has(userId)) {
    g.userBalances.set(userId, {
      pending: 0,
      available: 0,
      inWithdrawal: 0,
      paid: 0,
      lifetime: 0,
    });
  }
  return g.userBalances.get(userId)!;
}

export function creditUserBalance(userId: string, amountPaise: number) {
  const balances = getUserBalances(userId);
  balances.available += amountPaise;
  balances.lifetime += amountPaise;
  if (userId === DEMO_USER.id && g.mockBalances) {
    g.mockBalances.available = balances.available;
    g.mockBalances.lifetime = balances.lifetime;
  }
  return balances;
}

// Withdrawals
export function recordWithdrawalRequest(
  amountPaise: number,
  upiId: string,
  accountHolder = "EarnKaro User",
  userId = DEMO_USER.id
) {
  const balances = getUserBalances(userId);
  if (!g.mockWithdrawals) g.mockWithdrawals = [];

  if (amountPaise > balances.available) {
    throw new Error("Withdrawal amount exceeds available balance.");
  }

  balances.available -= amountPaise;
  balances.inWithdrawal += amountPaise;
  if (userId === DEMO_USER.id && g.mockBalances) {
    g.mockBalances.available = balances.available;
    g.mockBalances.inWithdrawal = balances.inWithdrawal;
  }

  const w: MockWithdrawalItem = {
    id: "wd-" + Date.now(),
    userId,
    userName: accountHolder,
    amountPaise,
    method: "UPI",
    upiId,
    status: "REQUESTED",
    requestedAt: new Date(),
  };

  g.mockWithdrawals.unshift(w);
  return w;
}

export function updateWithdrawalStatus(id: string, newStatus: WithdrawalStatus) {
  if (!g.mockWithdrawals) return null;
  const w = g.mockWithdrawals.find((x) => x.id === id);
  if (!w) return null;

  const oldStatus = w.status;
  w.status = newStatus;

  if (oldStatus === "REQUESTED" || oldStatus === "PROCESSING") {
    if (newStatus === "PAID") {
      g.mockBalances!.inWithdrawal = Math.max(0, (g.mockBalances!.inWithdrawal || 0) - w.amountPaise);
      g.mockBalances!.paid = (g.mockBalances!.paid || 0) + w.amountPaise;
    } else if (newStatus === "FAILED" || (newStatus as any) === "REJECTED") {
      g.mockBalances!.inWithdrawal = Math.max(0, (g.mockBalances!.inWithdrawal || 0) - w.amountPaise);
      g.mockBalances!.available = (g.mockBalances!.available || 0) + w.amountPaise;
    }
  }
  return w;
}

// Store Management
export function addOrUpdateMockStore(storeData: Partial<MockStore> & { name: string; slug: string }) {
  if (!g.mockStores) g.mockStores = [...INITIAL_STORES];

  const existingIdx = g.mockStores.findIndex((s) => s.slug === storeData.slug);
  if (existingIdx >= 0) {
    g.mockStores[existingIdx] = { ...g.mockStores[existingIdx]!, ...storeData };
    return g.mockStores[existingIdx]!;
  } else {
    const newStore: MockStore = {
      id: "store-" + Date.now(),
      slug: storeData.slug,
      name: storeData.name,
      brandColor: storeData.brandColor || "#134024",
      commissionRateBps: storeData.commissionRateBps || 1000,
      userShareBps: storeData.userShareBps || 6000,
      sortOrder: (g.mockStores.length || 0) + 1,
      status: storeData.status || "ACTIVE",
      confirmationDays: storeData.confirmationDays || 60,
      category: storeData.category || "all",
      logoUrl: storeData.logoUrl,
    };
    g.mockStores.push(newStore);
    return newStore;
  }
}

// User Management
export function findMockUserByEmail(email: string): MockUserRecord | undefined {
  if (!email || !g.mockUsers) return undefined;
  return g.mockUsers.get(email.toLowerCase().trim());
}

export function findMockUserByPhone(phone: string): MockUserRecord | undefined {
  if (!phone || !g.mockUsers) return undefined;
  const clean = phone.replace(/\D/g, "");
  for (const user of g.mockUsers.values()) {
    if (user.phone && user.phone.replace(/\D/g, "") === clean) {
      return user;
    }
  }
  return undefined;
}

export function findMockUserById(id: string): MockUserRecord | undefined {
  if (!id) return undefined;
  if (!g.mockUsers) return undefined;
  for (const user of g.mockUsers.values()) {
    if (user.id === id) {
      return user;
    }
  }
  if (id === DEMO_USER.id) {
    return {
      id: DEMO_USER.id,
      email: DEMO_USER.email || "demo@earnkaro.local",
      phone: "+919876543210",
      name: DEMO_USER.name || "Demo Partner",
      role: "ADMIN",
      isVerified: true,
      referralCode: DEMO_USER.referralCode,
      subIdPrefix: DEMO_USER.subIdPrefix,
      createdAt: DEMO_USER.createdAt,
    };
  }
  return undefined;
}

export function createMockUser(userData: {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  role: "USER" | "ADMIN";
  isVerified?: boolean;
  referralCode: string;
  subIdPrefix: string;
}): MockUserRecord {
  if (!g.mockUsers) g.mockUsers = new Map();
  const user: MockUserRecord = {
    ...userData,
    email: userData.email.toLowerCase().trim(),
    phone: userData.phone || null,
    isVerified: userData.isVerified !== undefined ? userData.isVerified : true,
    createdAt: new Date(),
  };
  g.mockUsers.set(user.email, user);
  return user;
}

export function getMockUsersCount(): number {
  return g.mockUsers ? g.mockUsers.size : 1;
}

// Deal Management
export function addMockDeal(dealData: {
  title: string;
  storeSlug: string;
  price: number;
  mrp: number;
  imageUrl?: string;
  offerTag?: string;
  productUrl?: string;
  category?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}) {
  if (!g.mockDeals) g.mockDeals = [...INITIAL_DEALS];

  const store = getLiveStores().find((s) => s.slug === dealData.storeSlug) || getLiveStores()[0]!;
  const pricePaise = Math.round(dealData.price * 100);
  const mrpPaise = Math.round(dealData.mrp * 100);

  const newDeal: MockDealItem = {
    id: "deal-" + Date.now(),
    storeId: store.id,
    externalId: "ext-" + Date.now(),
    title: dealData.title,
    category: dealData.category || "electronics",
    pricePaise,
    mrpPaise,
    discountPct: Math.max(0, Math.round((1 - dealData.price / dealData.mrp) * 100)),
    estimatedProfitPaise: estimateProfitPaise(pricePaise, store),
    productUrl: dealData.productUrl || `https://www.${store.slug}.com/p/item-${Date.now()}`,
    imageUrl: dealData.imageUrl || null,
    offerTag: dealData.offerTag || null,
    tags: [dealData.category || "general"],
    isFeatured: Boolean(dealData.isFeatured),
    isActive: dealData.isActive !== undefined ? Boolean(dealData.isActive) : true,
    clickCount: 0,
    shareCount: 0,
    createdAt: new Date(),
    expiresAt: null,
    store: { slug: store.slug, name: store.name, brandColor: store.brandColor },
  };

  g.mockDeals.unshift(newDeal);
  return newDeal;
}

export function toggleMockDealActive(dealId: string) {
  if (!g.mockDeals) return null;
  const deal = g.mockDeals.find((d) => d.id === dealId);
  if (!deal) return null;
  deal.isActive = !deal.isActive;
  return deal;
}

export function deleteMockDeal(dealId: string) {
  if (!g.mockDeals) return false;
  const initialLen = g.mockDeals.length;
  g.mockDeals = g.mockDeals.filter((d) => d.id !== dealId);
  return g.mockDeals.length < initialLen;
}

export function getAdminPlatformOverview() {
  const registeredUsersCount = getMockUsersCount();
  const totalConvertedLinks = g.mockLinks ? g.mockLinks.size : 0;
  const platformRevenuePaise = (g as any).adminRevenuePaise || 0;
  const withdrawals = getLiveWithdrawals();
  const pendingPayoutsPaise = withdrawals
    .filter((w) => w.status === "REQUESTED" || w.status === "PROCESSING")
    .reduce((sum, w) => sum + w.amountPaise, 0);

  return {
    totalRegisteredUsers: registeredUsersCount,
    totalConvertedLinks,
    totalPlatformRevenuePaise: platformRevenuePaise,
    pendingPayoutsPaise,
  };
}

export const MOCK_PAYOUT: {
  id: string;
  userId: string;
  method: PayoutMethod;
  upiId: string | null;
  accountHolder: string | null;
  accountNumberEnc: string | null;
  accountLast4: string | null;
  ifsc: string | null;
  createdAt: Date;
  updatedAt: Date;
} = {
  id: "00000000-0000-0000-0000-000000000501",
  userId: DEMO_USER.id,
  method: "UPI" as PayoutMethod,
  upiId: "demo@upi",
  accountHolder: "Demo Partner",
  accountNumberEnc: null,
  accountLast4: null,
  ifsc: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Telegram Channel Automation Helpers
export const DEFAULT_SOURCE_CHANNELS = [
  "@lootdealsindia",
  "@flipkart_loot_offers",
  "@amazon_great_indian_deals",
  "@fashion_discount_hub",
  "@earnkaro_hot_deals",
];

export function getMockTelegramConfigByUserId(userId: string): MockTelegramChannelConfig | null {
  if (!g.mockTelegramConfigs) g.mockTelegramConfigs = new Map();
  return g.mockTelegramConfigs.get(userId) || null;
}

export function getMockTelegramConfigByTelegramId(telegramUserId: string): MockTelegramChannelConfig | null {
  if (!g.mockTelegramConfigs) g.mockTelegramConfigs = new Map();
  for (const cfg of g.mockTelegramConfigs.values()) {
    if (cfg.telegramUserId === telegramUserId) {
      return cfg;
    }
  }
  return null;
}

export function saveMockTelegramConfig(data: {
  userId: string;
  telegramUserId?: string | null;
  telegramUsername?: string | null;
  sessionString?: string | null;
  sourceChannels?: any;
  targetChannels?: any;
  targetChannelId?: string | null;
  targetChannelName?: string | null;
  isActive?: boolean;
}): MockTelegramChannelConfig {
  if (!g.mockTelegramConfigs) g.mockTelegramConfigs = new Map();
  const existing = g.mockTelegramConfigs.get(data.userId);

  const updated: MockTelegramChannelConfig = {
    id: existing?.id || "tg-cfg-" + Date.now(),
    userId: data.userId,
    telegramUserId: data.telegramUserId !== undefined ? data.telegramUserId : existing?.telegramUserId || null,
    telegramUsername: data.telegramUsername !== undefined ? data.telegramUsername : existing?.telegramUsername || null,
    sessionString: data.sessionString !== undefined ? data.sessionString : existing?.sessionString || null,
    sourceChannels: data.sourceChannels !== undefined ? data.sourceChannels : existing?.sourceChannels || [],
    targetChannels: data.targetChannels !== undefined ? data.targetChannels : existing?.targetChannels || [],
    targetChannelId: data.targetChannelId !== undefined ? data.targetChannelId : existing?.targetChannelId || null,
    targetChannelName: data.targetChannelName !== undefined ? data.targetChannelName : existing?.targetChannelName || null,
    isActive: data.isActive !== undefined ? data.isActive : (existing?.isActive !== undefined ? existing.isActive : true),
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  g.mockTelegramConfigs.set(data.userId, updated);
  return updated;
}

export function getAllMockTelegramConfigs(activeOnly = false): MockTelegramChannelConfig[] {
  if (!g.mockTelegramConfigs) g.mockTelegramConfigs = new Map();

  if (g.mockTelegramConfigs.size === 0) {
    const seed: MockTelegramChannelConfig = {
      id: "tg-seed-001",
      userId: DEMO_USER.id,
      telegramUserId: "123456789",
      telegramUsername: "demopartner_deals",
      sourceChannels: [],
      targetChannelId: "@demopartner_deals",
      targetChannelName: "Demo Loot Deals",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    g.mockTelegramConfigs.set(DEMO_USER.id, seed);
  }

  const all = Array.from(g.mockTelegramConfigs.values());
  if (activeOnly) {
    return all.filter((c) => c.isActive);
  }
  return all;
}

// Cuelinks Conversions Sync Helpers
export function upsertMockConversion(data: {
  transactionId: string;
  storeName: string;
  saleAmount: number;
  commission: number;
  status: string;
  subid?: string | null;
  userId?: string | null;
}): { conversion: MockConversionRecord; isNew: boolean } {
  if (!g.mockConversions) g.mockConversions = new Map();
  const txId = data.transactionId;
  const existing = g.mockConversions.get(txId);
  const now = new Date();
  const effectiveUserId = data.userId || DEMO_USER.id;

  const normalizedStatus = data.status.toLowerCase();
  const isApproved = normalizedStatus === "approved" || normalizedStatus === "confirmed" || normalizedStatus === "validated";
  const isPending = normalizedStatus === "pending" || normalizedStatus === "open";

  const userCommissionPercent = Number(process.env.USER_COMMISSION_PERCENT || 70);
  const userRatio = Math.max(0, Math.min(100, userCommissionPercent)) / 100;
  const userEarningsPaise = Math.round(data.commission * 100 * userRatio);
  const adminProfitPaise = Math.round(data.commission * 100) - userEarningsPaise;

  const userBalances = getUserBalances(effectiveUserId);

  if (existing) {
    const prevStatus = existing.status.toLowerCase();
    const prevIsApproved = prevStatus === "approved" || prevStatus === "confirmed" || prevStatus === "validated";
    const prevIsPending = prevStatus === "pending" || prevStatus === "open";
    const prevUserEarningsPaise = Math.round(existing.commission * 100 * userRatio);

    if (prevIsApproved) {
      userBalances.available = Math.max(0, userBalances.available - prevUserEarningsPaise);
      userBalances.lifetime = Math.max(0, userBalances.lifetime - prevUserEarningsPaise);
    } else if (prevIsPending) {
      userBalances.pending = Math.max(0, userBalances.pending - prevUserEarningsPaise);
      userBalances.lifetime = Math.max(0, userBalances.lifetime - prevUserEarningsPaise);
    }
  }

  // Credit new status
  if (isApproved) {
    userBalances.available += userEarningsPaise;
    userBalances.lifetime += userEarningsPaise;
  } else if (isPending) {
    userBalances.pending += userEarningsPaise;
    userBalances.lifetime += userEarningsPaise;
  }

  // Update demo global balances if applicable
  if (effectiveUserId === DEMO_USER.id && g.mockBalances) {
    g.mockBalances.available = userBalances.available;
    g.mockBalances.pending = userBalances.pending;
    g.mockBalances.lifetime = userBalances.lifetime;
  }

  // Record in mockLedger
  if (!g.mockLedger) g.mockLedger = [];
  const existingLedgerIdx = g.mockLedger.findIndex((l) => l.externalOrderId === txId);
  const ledgerStatus: "PENDING" | "CONFIRMED" | "REJECTED" = isApproved
    ? "CONFIRMED"
    : isPending
    ? "PENDING"
    : "REJECTED";

  const ledgerRow: MockLedgerRow = {
    id: txId,
    store: { name: data.storeName },
    externalOrderId: txId,
    orderAmountPaise: Math.round(data.saleAmount * 100),
    userAmountPaise: userEarningsPaise,
    status: ledgerStatus,
    createdAt: existing ? existing.createdAt : now,
  };

  if (existingLedgerIdx >= 0) {
    g.mockLedger[existingLedgerIdx] = ledgerRow;
  } else {
    g.mockLedger.unshift(ledgerRow);
  }

  // Update admin revenue
  (g as any).adminRevenuePaise = ((g as any).adminRevenuePaise || 0) + adminProfitPaise;

  const record: MockConversionRecord = {
    id: existing?.id || "conv-" + Date.now(),
    transactionId: txId,
    storeName: data.storeName,
    saleAmount: data.saleAmount,
    commission: data.commission,
    status: data.status,
    subid: data.subid || null,
    userId: effectiveUserId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  g.mockConversions.set(txId, record);
  return { conversion: record, isNew: !existing };
}

export function getMockConversions(userId?: string): MockConversionRecord[] {
  if (!g.mockConversions) g.mockConversions = new Map();
  const all = Array.from(g.mockConversions.values());
  if (userId) {
    return all.filter((c) => c.userId === userId);
  }
  return all;
}

// Short Links
export interface MockShortLink {
  id: string;
  slug: string;
  originalUrl: string;
  targetUrl: string;
  userId?: string | null;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function saveMockShortLink(data: {
  slug: string;
  originalUrl?: string;
  targetUrl?: string;
  userId?: string | null;
}): MockShortLink {
  if (!g.mockShortLinks) g.mockShortLinks = new Map();
  const existing = g.mockShortLinks.get(data.slug);
  const now = new Date();
  const originalUrl = data.originalUrl || data.targetUrl || "";
  const targetUrl = data.targetUrl || data.originalUrl || "";
  const record: MockShortLink = {
    id: existing?.id || "short-" + Date.now(),
    slug: data.slug,
    originalUrl,
    targetUrl,
    userId: data.userId || null,
    clickCount: existing?.clickCount || 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  g.mockShortLinks.set(data.slug, record);
  return record;
}

export function getMockShortLinkBySlug(slug: string): MockShortLink | null {
  if (!g.mockShortLinks) g.mockShortLinks = new Map();
  return g.mockShortLinks.get(slug) || null;
}

export function incrementMockShortLinkClick(slug: string): void {
  if (!g.mockShortLinks) g.mockShortLinks = new Map();
  const item = g.mockShortLinks.get(slug);
  if (item) {
    item.clickCount = (item.clickCount || 0) + 1;
    item.updatedAt = new Date();
  }
  if (g.totalClicks === undefined) g.totalClicks = 0;
  g.totalClicks += 1;
  if (!g.mockClicks) g.mockClicks = [];
  g.mockClicks.unshift({
    code: slug,
    timestamp: new Date(),
    store: "ShortLink",
    ip: "192.168.1." + Math.floor(Math.random() * 200 + 10),
  });
}
