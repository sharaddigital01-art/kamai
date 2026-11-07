import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import {
  getBanners,
  createBanner,
  updateBanner,
  softDeleteBanner,
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

  const banners = await getBanners(true);
  return NextResponse.json({ banners });
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
  const { id, action, title, imageUrl, link, priority, isActive } = body;

  // Toggle active / inactive
  if (action === "toggle_active" && id) {
    const updated = await updateBanner(id, { isActive: Boolean(isActive) });
    return NextResponse.json({ success: true, banner: updated });
  }

  // Soft delete
  if (action === "delete" && id) {
    await softDeleteBanner(id);
    return NextResponse.json({ success: true, message: "Banner soft deleted." });
  }

  // Edit existing
  if (id) {
    const updated = await updateBanner(id, {
      title,
      imageUrl,
      link,
      priority: priority !== undefined ? Number(priority) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });
    return NextResponse.json({ success: true, banner: updated });
  }

  // Create new banner
  if (!title || !imageUrl || !link) {
    return NextResponse.json(
      { error: "Title, Image URL, and Redirect Link are required." },
      { status: 400 }
    );
  }

  const created = await createBanner({
    title,
    imageUrl,
    link,
    priority: priority !== undefined ? Number(priority) : 0,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  return NextResponse.json({
    success: true,
    banner: created,
    message: "Banner published successfully.",
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
    return NextResponse.json({ error: "Banner ID is required." }, { status: 400 });
  }

  await softDeleteBanner(id);
  return NextResponse.json({ success: true, message: "Banner soft deleted." });
}
