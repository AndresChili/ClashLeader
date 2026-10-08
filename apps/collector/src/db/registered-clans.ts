import type { SupabaseClient } from "@supabase/supabase-js";

export interface RegisteredClan {
  id: string;
  tag: string;
  name: string;
}

/**
 * Clans due for a collector pass, oldest-collected first (nulls — never
 * collected — come first) so that under the MAX_CLANS_PER_RUN cap, no
 * single clan gets starved forever.
 */
export async function getRegisteredClans(supabase: SupabaseClient, maxClans: number): Promise<RegisteredClan[]> {
  const { data, error } = await supabase
    .from("clans")
    .select("id, tag, name")
    .eq("collector_enabled", true)
    .order("last_collected_at", { ascending: true, nullsFirst: true })
    .limit(maxClans);

  if (error) {
    throw new Error(`Failed to load registered clans: ${error.message}`);
  }

  return data;
}

export async function markClanCollected(supabase: SupabaseClient, clanId: string): Promise<void> {
  const { error } = await supabase.from("clans").update({ last_collected_at: new Date().toISOString() }).eq(
    "id",
    clanId,
  );

  if (error) {
    throw new Error(`Failed to update last_collected_at for clan ${clanId}: ${error.message}`);
  }
}
