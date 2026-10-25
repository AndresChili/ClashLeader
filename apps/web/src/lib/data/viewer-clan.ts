import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase/server";

export interface ViewerClan {
  clanId: string;
  tag: string;
  name: string;
  role: "admin" | "reader";
  lastCollectedAt: string | null;
}

/**
 * El clan que ve el usuario autenticado. En principio un usuario podría
 * tener acceso a más de un clan (admin de uno, reader de otro); hasta que
 * se añada un selector de clan, esto simplemente toma la concesión más
 * antigua, que para una cuenta de ejemplo de un solo clan es la única que hay.
 */
export async function getViewerClan(supabase: SupabaseClient): Promise<ViewerClan | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("clan_access")
    .select("role, clans(id, tag, name, last_collected_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load viewer's clan: ${error.message}`);
  }
  if (!data || !data.clans) return null;

  const clan = data.clans as unknown as { id: string; tag: string; name: string; last_collected_at: string | null };

  return {
    clanId: clan.id,
    tag: clan.tag,
    name: clan.name,
    role: data.role as "admin" | "reader",
    lastCollectedAt: clan.last_collected_at,
  };
}
