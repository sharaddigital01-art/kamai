"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Re-fetches server data when this user's ledger changes (Supabase Realtime).
 * Row Level Security (supabase/rls.sql) already limits events to the signed-in user's rows,
 * so no client-side filter is needed. Renders nothing.
 */
export function LiveEarnings() {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes("YOUR-PROJECT") || key.includes("your-anon-key")) {
      return;
    }
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel("my-ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "EarningsLedger" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "Withdrawal" }, () => router.refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
