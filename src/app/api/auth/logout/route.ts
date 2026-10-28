import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mockData";
import { AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    // 1. Sign out of Supabase Auth if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServer();
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase Auth signOut notice:", err);
      }
    }

    // 2. Clear application auth cookie
    const store = await cookies();
    store.delete(AUTH_COOKIE);

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to log out" },
      { status: 500 }
    );
  }
}
