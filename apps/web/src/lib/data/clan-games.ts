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

export interface ClanGamesSeason {
  id: string;
  /** "AAAA-MM": la ventana de seguimiento es un mes UTC (ver apps/collector/src/collect/clan-games.ts). */
  seasonId: string;
  isOpen: boolean;
}

/** Todas las temporadas registradas, de la más reciente a la más antigua. */
export async function getClanGamesSeasons(supabase: SupabaseClient, clanId: string): Promise<ClanGamesSeason[]> {
  const { data, error } = await supabase
    .from("clan_games_seasons")
    .select("id, season_id, end_time")
    .eq("clan_id", clanId)
    .order("season_id", { ascending: false });

  if (error) throw new Error(`Failed to load clan games seasons: ${error.message}`);

  return data.map((row) => ({
    id: row.id as string,
    seasonId: row.season_id as string,
    isOpen: row.end_time == null,
  }));
}

export interface ClanGamesPlayerPoints {
  playerTag: string;
  playerName: string;
  points: number;
}

export async function getClanGamesSeasonPoints(supabase: SupabaseClient, seasonRowId: string): Promise<ClanGamesPlayerPoints[]> {
  const { data, error } = await supabase
    .from("clan_games_points")
    .select("player_tag, player_name, points")
    .eq("clan_games_season_id", seasonRowId);

  if (error) throw new Error(`Failed to load clan games season points: ${error.message}`);

  return data.map((row) => ({
    playerTag: row.player_tag as string,
    playerName: row.player_name as string,
    points: (row.points as number | null) ?? 0,
  }));
}
