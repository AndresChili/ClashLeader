import type { SupabaseClient } from "@supabase/supabase-js";

export interface ViewerClan {
  clanId: string;
  tag: string;
  name: string;
  role: "admin" | "reader";
}

/**
 * The clan the signed-in user sees. A user could in principle have access
 * to more than one clan (admin of one, reader of another); until phase 6
 * adds a clan switcher, this just takes the oldest grant, which for a
 * single-clan demo account is the only one anyway.
 */
export async function getViewerClan(supabase: SupabaseClient): Promise<ViewerClan | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("clan_access")
    .select("role, clans(id, tag, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load viewer's clan: ${error.message}`);
  }
  if (!data || !data.clans) return null;

  const clan = data.clans as unknown as { id: string; tag: string; name: string };

  return {
    clanId: clan.id,
    tag: clan.tag,
    name: clan.name,
    role: data.role as "admin" | "reader",
  };
}
