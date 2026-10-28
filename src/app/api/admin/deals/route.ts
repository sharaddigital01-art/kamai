import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateProfitPaise } from "@/lib/profit";
import {
  isDatabaseConfigured,
  addMockDeal,
  deleteMockDeal,
  toggleMockDealActive,
  getLiveDeals,
  getLiveStores,
} from "@/lib/mockData";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getApiUser().catch(() => null);
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Access denied. Admin authorization required." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title || !body.price || !body.mrp) {
      return NextResponse.json({ error: "Title, price and MRP are required" }, { status: 400 });
    }

    const price = Number(body.price);
    const mrp = Number(body.mrp);
    const storeSlug = (body.storeSlug || "flipkart").trim().toLowerCase();
    const destinationUrl = body.destinationUrl || body.productUrl || `https://www.${storeSlug}.com/p/deal-${Date.now()}`;
    const offerTag = body.offerTag ? body.offerTag.trim() : null;
    const category = body.category || "electronics";
    const imageUrl = body.imageUrl ? body.imageUrl.trim() : null;
    const isFeatured = Boolean(body.isFeatured);
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    let createdOrUpdated: any = null;

    if (isDatabaseConfigured()) {
      try {
        let store = await prisma.partnerStore.findUnique({ where: { slug: storeSlug } });
        if (!store) {
          store = await prisma.partnerStore.findFirst();
        }

        if (store) {
          const pricePaise = Math.round(price * 100);
          const mrpPaise = Math.round(mrp * 100);
          const discountPct = Math.max(0, Math.round((1 - price / mrp) * 100));
          const estimatedProfitPaise = estimateProfitPaise(pricePaise, store);

          if (body.id && !body.id.startsWith("deal-")) {
            // Update existing deal
            createdOrUpdated = await prisma.deal.update({
              where: { id: body.id },
              data: {
                title: body.title.trim(),
                pricePaise,
                mrpPaise,
                discountPct,
                estimatedProfitPaise,
                category,
                imageUrl,
                productUrl: destinationUrl,
                isFeatured,
                isActive,
                tags: offerTag ? [offerTag, category] : [category],
              },
              include: { store: { select: { slug: true, name: true, brandColor: true } } },
            });
          } else {
            // Create new deal
            createdOrUpdated = await prisma.deal.create({
              data: {
                storeId: store.id,
                title: body.title.trim(),
                pricePaise,
                mrpPaise,
                discountPct,
                estimatedProfitPaise,
                category,
                imageUrl,
                productUrl: destinationUrl,
                isFeatured,
                isActive,
                tags: offerTag ? [offerTag, category] : [category],
              },
              include: { store: { select: { slug: true, name: true, brandColor: true } } },
            });
          }
        }
      } catch (dbErr) {
        console.warn("DB deal save notice, updating runtime state:", dbErr);
      }
    }

    // Always update live memory state
    const memoryDeal = addMockDeal({
      title: body.title.trim(),
      storeSlug,
      price,
      mrp,
      imageUrl: imageUrl || undefined,
      offerTag: offerTag || undefined,
      productUrl: destinationUrl,
      category,
      isFeatured,
      isActive,
    });

    return NextResponse.json({
      deal: createdOrUpdated || memoryDeal,
      deals: getLiveDeals(),
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save deal" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getApiUser().catch(() => null);
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Access denied. Admin authorization required." }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
    }

    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.deal.findUnique({ where: { id } });
        if (existing) {
          await prisma.deal.update({
            where: { id },
            data: { isActive: !existing.isActive },
          });
        }
      } catch (e) {
        console.warn("DB toggle active notice:", e);
      }
    }

    const toggled = toggleMockDealActive(id);
    return NextResponse.json({ success: true, deal: toggled, deals: getLiveDeals() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to toggle deal status" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getApiUser().catch(() => null);
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Access denied. Admin authorization required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
    }

    if (isDatabaseConfigured()) {
      try {
        await prisma.deal.delete({ where: { id } });
      } catch (e) {
        console.warn("DB deal delete notice:", e);
      }
    }

    const deleted = deleteMockDeal(id);
    return NextResponse.json({ success: true, deleted, deals: getLiveDeals() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete deal" }, { status: 500 });
  }
}
