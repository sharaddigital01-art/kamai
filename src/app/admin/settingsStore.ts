import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface AppSettings {
  userSplitPct: number;
  adminCutPct: number;
  minWithdrawalInr: number;
  amazonMasterTag: string;
  updatedAt: string;
  source?: "supabase" | "memory";
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  userSplitPct: 70,
  adminCutPct: 30,
  minWithdrawalInr: 50,
  amazonMasterTag: process.env.AMAZON_ASSOCIATE_TAG || "kamaikaro02-21",
  updatedAt: new Date().toISOString(),
};

// In-memory runtime persistence
const g = globalThis as unknown as { __appSettings?: AppSettings };
if (!g.__appSettings) {
  g.__appSettings = { ...DEFAULT_APP_SETTINGS };
}

/**
 * Retrieves current platform runtime settings.
 * Checks Supabase `app_settings` table first, falls back to in-memory defaults.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const adminClient = getSupabaseAdmin();
  if (adminClient) {
    try {
      const { data, error } = await adminClient
        .from("app_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (!error && data) {
        return {
          userSplitPct: Number(data.user_split_pct ?? data.userSplitPct ?? 70),
          adminCutPct: Number(data.admin_cut_pct ?? data.adminCutPct ?? 30),
          minWithdrawalInr: Number(data.min_withdrawal_inr ?? data.minWithdrawalInr ?? 50),
          amazonMasterTag: String(data.amazon_master_tag ?? data.amazonMasterTag ?? DEFAULT_APP_SETTINGS.amazonMasterTag),
          updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
          source: "supabase",
        };
      }
    } catch {
      // Supabase table not present or connection offline — proceed with memory fallback
    }
  }

  return {
    ...(g.__appSettings || DEFAULT_APP_SETTINGS),
    source: "memory",
  };
}

/**
 * Saves updated platform runtime settings.
 * Upserts to Supabase `app_settings` table and syncs in-memory store.
 */
export async function saveAppSettings(
  updates: Partial<Omit<AppSettings, "updatedAt" | "source">>
): Promise<AppSettings> {
  const current = await getAppSettings();

  const userSplitPct =
    updates.userSplitPct !== undefined ? Math.max(1, Math.min(99, Math.round(updates.userSplitPct))) : current.userSplitPct;
  const adminCutPct =
    updates.adminCutPct !== undefined ? Math.max(1, Math.min(99, Math.round(updates.adminCutPct))) : 100 - userSplitPct;
  const minWithdrawalInr =
    updates.minWithdrawalInr !== undefined ? Math.max(1, Math.round(updates.minWithdrawalInr)) : current.minWithdrawalInr;
  const amazonMasterTag =
    updates.amazonMasterTag?.trim() || current.amazonMasterTag || DEFAULT_APP_SETTINGS.amazonMasterTag;

  const newSettings: AppSettings = {
    userSplitPct,
    adminCutPct,
    minWithdrawalInr,
    amazonMasterTag,
    updatedAt: new Date().toISOString(),
  };

  // Sync in-memory runtime store
  g.__appSettings = { ...newSettings };

  // Sync Supabase `app_settings` table if available
  const adminClient = getSupabaseAdmin();
  if (adminClient) {
    try {
      const payload = {
        id: "default",
        user_split_pct: userSplitPct,
        admin_split_pct: adminCutPct,
        min_withdrawal_inr: minWithdrawalInr,
        amazon_master_tag: amazonMasterTag,
        updated_at: newSettings.updatedAt,
      };

      const { error } = await adminClient
        .from("app_settings")
        .upsert(payload, { onConflict: "id" });

      if (!error) {
        newSettings.source = "supabase";
        return newSettings;
      }
    } catch {
      // Table may not exist yet in Postgres schema, memory store acts as authoritative runtime
    }
  }

  newSettings.source = "memory";
  return newSettings;
}
