import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import { getPartnerStores, updatePartnerStore } from "../../contentStore";

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
  const { slug, status, displayedProfitPct, commissionRateBps } = body;

  if (!slug) {
    return NextResponse.json({ error: "Store slug is required." }, { status: 400 });
  }

  const updated = await updatePartnerStore(slug, {
    status,
    displayedProfitPct: displayedProfitPct !== undefined ? Number(displayedProfitPct) : undefined,
    commissionRateBps: commissionRateBps !== undefined ? Number(commissionRateBps) : undefined,
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
