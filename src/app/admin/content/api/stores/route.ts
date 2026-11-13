import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import { getPartnerStores, updatePartnerStore, deletePartnerStore } from "../../contentStore";

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

  const stores = await getPartnerStores();
  return NextResponse.json({ stores });
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
  const { slug, name, status, displayedProfitPct, commissionRateBps, logoUrl, brandColor } = body;

  if (!slug) {
    return NextResponse.json({ error: "Store slug is required." }, { status: 400 });
  }

  const updated = await updatePartnerStore(slug, {
    name,
    status,
    displayedProfitPct: displayedProfitPct !== undefined ? Number(displayedProfitPct) : undefined,
    commissionRateBps: commissionRateBps !== undefined ? Number(commissionRateBps) : undefined,
    logoUrl,
    brandColor,
  });

  if (!updated) {
    return NextResponse.json({ error: `Store with slug "${slug}" not found.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    store: updated,
    message: `Store ${updated.name} updated successfully.`,
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
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Store slug is required." }, { status: 400 });
  }

  const success = await deletePartnerStore(slug);
  return NextResponse.json({ success, message: `Store ${slug} deleted.` });
}
