import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import { getAppSettings, saveAppSettings } from "../../settingsStore";

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

  const settings = await getAppSettings();
  return NextResponse.json({ settings });
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
  const { userSplitPct, adminCutPct, minWithdrawalInr, amazonMasterTag } = body;

  const updated = await saveAppSettings({
    userSplitPct: userSplitPct !== undefined ? Number(userSplitPct) : undefined,
    adminCutPct: adminCutPct !== undefined ? Number(adminCutPct) : undefined,
    minWithdrawalInr: minWithdrawalInr !== undefined ? Number(minWithdrawalInr) : undefined,
    amazonMasterTag: amazonMasterTag !== undefined ? String(amazonMasterTag) : undefined,
  });

  return NextResponse.json({
    success: true,
    settings: updated,
    message: "Platform settings updated successfully.",
  });
}
