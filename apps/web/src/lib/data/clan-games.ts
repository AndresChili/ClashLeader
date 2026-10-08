import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentClanGamesPoints(supabase: SupabaseClient, clanId: string): Promise<Map<string, number>> {
  const { data: season, error: seasonError } = await supabase
    .from("clan_games_seasons")
    .select("id")
    .eq("clan_id", clanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) throw new Error(`Failed to load clan games season: ${seasonError.message}`);
  if (!season) return new Map();

  const { data: points, error: pointsError } = await supabase
    .from("clan_games_points")
    .select("player_tag, points")
    .eq("clan_games_season_id", season.id);

  if (pointsError) throw new Error(`Failed to load clan games points: ${pointsError.message}`);

  return new Map(points.map((row) => [row.player_tag as string, (row.points as number | null) ?? 0]));
}
