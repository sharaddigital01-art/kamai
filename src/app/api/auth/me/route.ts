import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        isAdmin: false,
      });
    }

    const userReferralCode =
      user.referralCode && user.referralCode !== "KAMAIDEMO"
        ? user.referralCode
        : (user as any).subIdPrefix || user.id.replace(/-/g, "").slice(0, 8).toUpperCase();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        phone: (user as any).phone || null,
        name: user.name,
        role: user.role,
        referralCode: userReferralCode,
        subIdPrefix: (user as any).subIdPrefix || userReferralCode.slice(0, 6),
      },
      isAdmin: isAdminUser(user),
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, user: null, isAdmin: false, error: err?.message },
      { status: 500 }
    );
  }
}
