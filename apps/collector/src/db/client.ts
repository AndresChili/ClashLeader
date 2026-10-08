import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectorConfig } from "../config";

/**
 * The only place in the whole codebase that uses the Supabase service role
 * key. It bypasses RLS entirely, which is exactly what the collector needs
 * (it writes data for every registered clan, not just one), and exactly
 * why this key must never reach apps/web.
 */
export function createServiceRoleClient(config: Pick<CollectorConfig, "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY">): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
