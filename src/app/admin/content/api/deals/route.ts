import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import {
  getFeaturedDeals,
  createFeaturedDeal,
  updateFeaturedDeal,
  softDeleteFeaturedDeal,
} from "../../contentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdminAuth(user: any): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  return (
    user.role === "ADMIN" ||
    user.is_admin === true ||
    email === "support@kamaikaro.in" ||
    email === "admin@kamaikaro.in" ||
    isAdminEmail(email)
  );
}

export async function GET() {
  const admin = await getApiUser().catch(() => null);
  if (!checkAdminAuth(admin)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  const deals = await getFeaturedDeals(true);
  return NextResponse.json({ deals });
}

export async function POST(req: Request) {
  const admin = await getApiUser().catch(() => null);
  if (!checkAdminAuth(admin)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { id, action, title, price, dealPrice, imageUrl, affiliateUrl, store, isActive } = body;

  // Toggle active / inactive
  if (action === "toggle_active" && id) {
    const updated = await updateFeaturedDeal(id, { isActive: Boolean(isActive) });
    return NextResponse.json({ success: true, deal: updated });
  }

  // Soft delete
  if (action === "delete" && id) {
    await softDeleteFeaturedDeal(id);
    return NextResponse.json({ success: true, message: "Deal soft deleted." });
  }

  // Edit existing
  if (id) {
    const updated = await updateFeaturedDeal(id, {
      title,
      price: price !== undefined ? Number(price) : undefined,
      dealPrice: dealPrice !== undefined ? Number(dealPrice) : undefined,
      imageUrl,
      affiliateUrl,
      store,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });
    return NextResponse.json({ success: true, deal: updated });
  }

  // Create new featured deal
  if (!title || price === undefined || dealPrice === undefined || !affiliateUrl || !store) {
    return NextResponse.json(
      { error: "Title, Original Price, Deal Price, Target Store, and Affiliate URL are required." },
      { status: 400 }
    );
  }

  const created = await createFeaturedDeal({
    title,
    price: Number(price),
    dealPrice: Number(dealPrice),
    imageUrl: imageUrl || null,
    affiliateUrl,
    store,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  return NextResponse.json({
    success: true,
    deal: created,
    message: "Handpicked featured deal published successfully.",
  });
}

export async function DELETE(req: Request) {
  const admin = await getApiUser().catch(() => null);
  if (!checkAdminAuth(admin)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Deal ID is required." }, { status: 400 });
  }

  await softDeleteFeaturedDeal(id);
  return NextResponse.json({ success: true, message: "Deal soft deleted." });
}
