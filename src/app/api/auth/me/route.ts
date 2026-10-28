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

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        referralCode: user.referralCode,
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
