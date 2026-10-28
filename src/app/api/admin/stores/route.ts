import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addOrUpdateMockStore, getLiveStores, isDatabaseConfigured } from "@/lib/mockData";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getApiUser().catch(() => null);
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Access denied. Admin authorization required." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: "Store name and slug are required" }, { status: 400 });
    }

    const slug = body.slug.trim().toLowerCase();
    const name = body.name.trim();
    const commissionRateBps = Number(body.commissionRateBps) || 1000;
    const userShareBps = Number(body.userShareBps) || 6000;
    const status = body.status === "PAUSED" ? "PAUSED" : "ACTIVE";
    const brandColor = body.brandColor || "#134024";
    const confirmationDays = Number(body.confirmationDays) || 60;
    const logoUrl = body.logoUrl || null;

    let updatedStore: any = null;

    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.partnerStore.findUnique({ where: { slug } });
        if (existing) {
          updatedStore = await prisma.partnerStore.update({
            where: { slug },
            data: {
              name,
              commissionRateBps,
              userShareBps,
              status,
              brandColor,
              confirmationDays,
              logoUrl,
            },
          });
        } else {
          updatedStore = await prisma.partnerStore.create({
            data: {
              slug,
              name,
              commissionRateBps,
              userShareBps,
              status,
              brandColor,
              confirmationDays,
              logoUrl,
            },
          });
        }
      } catch (dbErr) {
        console.warn("DB store save notice, updating memory store:", dbErr);
      }
    }

    const memoryStore = addOrUpdateMockStore({
      name,
      slug,
      brandColor,
      commissionRateBps,
      userShareBps,
      status,
      confirmationDays,
      logoUrl: logoUrl || undefined,
    });

    return NextResponse.json({
      store: updatedStore || memoryStore,
      stores: getLiveStores(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update store" }, { status: 500 });
  }
}
