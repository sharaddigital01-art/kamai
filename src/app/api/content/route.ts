import { NextResponse } from "next/server";
import { getBanners, getFeaturedDeals, getPartnerStores } from "@/app/admin/content/contentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [banners, featuredDeals, partnerStores] = await Promise.all([
    getBanners(false),
    getFeaturedDeals(false),
    getPartnerStores(),
  ]);

  return NextResponse.json({
    banners,
    featuredDeals,
    partnerStores: partnerStores.filter((s) => s.status === "ACTIVE"),
  });
}
