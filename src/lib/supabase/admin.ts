import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Returns a Supabase Admin client with service role privileges.
 * Falls back to anon key if service role key is not yet configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cachedAdminClient;
}

/**
 * Transparent proxy to supabaseAdmin client allowing direct usage like
 * supabaseAdmin.auth.admin.updateUserById(...) or supabaseAdmin.auth.admin.createUser(...)
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    if (!client) {
      return undefined;
    }
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
