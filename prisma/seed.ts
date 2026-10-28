/**
 * Seed script for Kamai / EarnKaro Clone.
 * Populates PartnerStores and authentic festive Deals with high-res product cutout images.
 */
import { PrismaClient } from "@prisma/client";
import { estimateProfitPaise } from "../src/lib/profit";

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: directUrl ? { db: { url: directUrl } } : undefined,
});

const STORES = [
  { slug: "flipkart",  name: "Flipkart",    brandColor: "#2874F0", commissionRateBps: 400,  userShareBps: 6000, sortOrder: 1  },
  { slug: "amazon",    name: "Amazon",       brandColor: "#FF9900", commissionRateBps: 350,  userShareBps: 6000, sortOrder: 2  },
  { slug: "myntra",    name: "Myntra",       brandColor: "#E5336A", commissionRateBps: 700,  userShareBps: 6000, sortOrder: 3  },
  { slug: "ajio",      name: "Ajio",         brandColor: "#3D4F5E", commissionRateBps: 800,  userShareBps: 6000, sortOrder: 4  },
  { slug: "shopsy",    name: "Shopsy",       brandColor: "#6C3BF5", commissionRateBps: 500,  userShareBps: 6000, sortOrder: 5  },
  { slug: "nykaa",     name: "Nykaa",        brandColor: "#FC2779", commissionRateBps: 600,  userShareBps: 6000, sortOrder: 6  },
  { slug: "tatacliq",  name: "Tata CLiQ",    brandColor: "#9B1D5E", commissionRateBps: 450,  userShareBps: 6000, sortOrder: 7  },
  { slug: "croma",     name: "Croma",        brandColor: "#00796B", commissionRateBps: 300,  userShareBps: 6000, sortOrder: 8  },
  { slug: "jiomart",   name: "JioMart",      brandColor: "#0A3D8F", commissionRateBps: 350,  userShareBps: 6000, sortOrder: 9  },
];

type DealSeed = {
  store: string;
  ext: string;
  title: string;
  category: string;
  price: number;
  mrp: number;
  url: string;
  imageUrl: string;
  tags: string[];
  featured?: boolean;
};

const DEALS: DealSeed[] = [
  // ──────── FLIPKART (Festive Deals & Top Sellers) ────────
  {
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
  },
  {
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
  },
  {
    store: "flipkart",
    ext: "fk-earbuds",
    title: "boAt Airdopes 141 ANC True Wireless Earbuds (42H Playtime)",
    category: "electronics",
    price: 1299,
    mrp: 4990,
    url: "https://www.flipkart.com/search?q=boat+airdopes+141",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    tags: ["audio", "earbuds"],
    featured: true,
  },
  {
    store: "flipkart",
    ext: "fk-smartwatch",
    title: "Fire-Boltt AMOLED Bluetooth Calling Smartwatch with AI Assistant",
    category: "electronics",
    price: 1799,
    mrp: 6999,
    url: "https://www.flipkart.com/search?q=smartwatch",
    imageUrl: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80",
    tags: ["wearables", "smartwatch"],
    featured: true,
  },

  // ──────── AMAZON (Amazon Great Indian Festival) ────────
  {
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
  },
  {
    store: "amazon",
    ext: "az-firetv",
    title: "Fire TV Stick 4K with Alexa Voice Remote (Latest Gen)",
    category: "electronics",
    price: 3999,
    mrp: 5999,
    url: "https://www.amazon.in/s?k=fire+tv+stick",
    imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
    tags: ["streaming", "tv"],
    featured: true,
  },
  {
    store: "amazon",
    ext: "az-echo",
    title: "Echo Dot 5th Gen Smart Speaker with Alexa (Deep Bass Audio)",
    category: "electronics",
    price: 2999,
    mrp: 5499,
    url: "https://www.amazon.in/s?k=echo+dot",
    imageUrl: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&auto=format&fit=crop&q=80",
    tags: ["smart-home", "speaker"],
  },
  {
    store: "amazon",
    ext: "az-bottle",
    title: "Milton Stainless Steel Thermosteel Insulated Flask 1L",
    category: "home",
    price: 649,
    mrp: 1199,
    url: "https://www.amazon.in/s?k=milton+thermosteel",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    tags: ["kitchen", "bottle"],
  },

  // ──────── MYNTRA (Best in Fashion & Lifestyle) ────────
  {
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
  },
  {
    store: "myntra",
    ext: "my-tshirt",
    title: "Puma Men's Graphic Regular Fit Pure Cotton Crew-Neck T-shirt",
    category: "fashion",
    price: 699,
    mrp: 1999,
    url: "https://www.myntra.com/puma-tshirts",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    tags: ["menswear", "tshirt"],
    featured: true,
  },
  {
    store: "myntra",
    ext: "my-kurta",
    title: "Libas Women's Floral Printed Pure Cotton Kurta with Palazzos",
    category: "fashion",
    price: 899,
    mrp: 2799,
    url: "https://www.myntra.com/women-kurtas",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80",
    tags: ["ethnic", "womenswear"],
  },

  // ──────── AJIO (Trendy Deals) ────────
  {
    store: "ajio",
    ext: "aj-watch",
    title: "Fossil Minimalist Analog Brown Leather Watch for Men",
    category: "accessories",
    price: 4495,
    mrp: 9995,
    url: "https://www.ajio.com/search/?text=fossil+watch",
    imageUrl: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
    tags: ["watches", "accessories"],
    featured: true,
  },
  {
    store: "ajio",
    ext: "aj-jeans",
    title: "Levis Men's 511 Slim Fit Stretchable Denim Jeans",
    category: "fashion",
    price: 1799,
    mrp: 3999,
    url: "https://www.ajio.com/search/?text=levis+jeans",
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
    tags: ["menswear", "jeans"],
  },

  // ──────── NYKAA (Beauty & Personal Care) ────────
  {
    store: "nykaa",
    ext: "nk-serum",
    title: "Nykaa SKINRX 10% Vitamin C Spot Corrector Face Serum (30ml)",
    category: "beauty",
    price: 499,
    mrp: 799,
    url: "https://www.nykaa.com/search/result/?q=vitamin+c+serum",
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    tags: ["skincare", "serum"],
    featured: true,
  },

  // ──────── SHOPSY (Budget & Kitchen Deals) ────────
  {
    store: "shopsy",
    ext: "sh-cookware",
    title: "Pigeon Non-Stick Aluminum 3-Piece Cookware Set (Kadai, Tawa, Fry Pan)",
    category: "home",
    price: 799,
    mrp: 2495,
    url: "https://www.shopsy.in/search?q=cookware",
    imageUrl: "https://images.unsplash.com/photo-1584990347449-30df2b29f041?w=600&auto=format&fit=crop&q=80",
    tags: ["kitchen", "cookware"],
  },

  // ──────── CROMA (Appliances & Gadgets) ────────
  {
    store: "croma",
    ext: "cr-tv",
    title: "OnePlus 43-inch Y Series 4K Ultra HD Smart Android LED TV",
    category: "electronics",
    price: 21990,
    mrp: 39999,
    url: "https://www.croma.com/searchB?q=smart+tv",
    imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80",
    tags: ["tv", "electronics"],
    featured: true,
  },

  // ──────── JIOMART (Groceries & Essentials) ────────
  {
    store: "jiomart",
    ext: "jm-rice",
    title: "Daawat Rozana Gold Premium Basmati Rice (5 Kg)",
    category: "grocery",
    price: 449,
    mrp: 695,
    url: "https://www.jiomart.com/search/basmati+rice",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
    tags: ["groceries", "rice"],
    featured: true,
  },
];

async function main() {
  console.log("Connecting to Supabase...");

  // Upsert all 9 stores
  const storeMap = new Map<string, { id: string; commissionRateBps: number; userShareBps: number }>();
  for (const s of STORES) {
    const row = await prisma.partnerStore.upsert({
      where: { slug: s.slug },
      create: s,
      update: s,
    });
    storeMap.set(s.slug, row);
    console.log(`  ✓ Store: ${s.name} (${s.slug}) → ${row.id}`);
  }

  console.log("\nDeleting previous deals to sync fresh festive catalog...");
  await prisma.deal.deleteMany({});

  console.log("Inserting authentic festive deals with cutout image mockups...");
  const dealRows = DEALS.map((d) => {
    const store = storeMap.get(d.store)!;
    const pricePaise = d.price * 100;
    return {
      storeId: store.id,
      externalId: d.ext,
      title: d.title,
      category: d.category,
      pricePaise,
      mrpPaise: d.mrp * 100,
      discountPct: Math.round((1 - d.price / d.mrp) * 100),
      estimatedProfitPaise: estimateProfitPaise(pricePaise, store),
      productUrl: d.url,
      imageUrl: d.imageUrl,
      tags: d.tags,
      isFeatured: Boolean(d.featured),
    };
  });

  const result = await prisma.deal.createMany({
    data: dealRows,
    skipDuplicates: true,
  });

  console.log(`  ✓ Inserted ${result.count} festive deals into Supabase!`);
  console.log(`\n🎉 Seed finished successfully: 9 stores & ${result.count} deals.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
