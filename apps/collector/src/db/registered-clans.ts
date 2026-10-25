import type { SupabaseClient } from "@supabase/supabase-js";

export interface RegisteredClan {
  id: string;
  tag: string;
  name: string;
}

/**
 * Clanes a los que les toca pasada del recolector, los recolectados hace
 * más tiempo primero (los null — nunca recolectados — van primero) para
 * que bajo el tope MAX_CLANS_PER_RUN ningún clan se quede sin pasada para
 * siempre.
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

/** Refresca el escudo del clan desde la API; no hace nada si la respuesta no trae badgeUrls. */
export async function updateClanBadge(supabase: SupabaseClient, clanId: string, badgeUrl: string | undefined): Promise<void> {
  if (!badgeUrl) return;

  const { error } = await supabase.from("clans").update({ badge_url: badgeUrl }).eq("id", clanId);

  if (error) {
    throw new Error(`Failed to update badge_url for clan ${clanId}: ${error.message}`);
  }
}
