import type { SupabaseClient } from "@supabase/supabase-js";
import { CLAN_GAMES_PLAYER_MAX } from "@/lib/clan-games";

export async function getCurrentClanGamesPoints(supabase: SupabaseClient, clanId: string): Promise<Map<string, number>> {
  const { data: season, error: seasonError } = await supabase
    .from("clan_games_seasons")
    .select("id, excluded")
    .eq("clan_id", clanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) throw new Error(`Failed to load clan games season: ${seasonError.message}`);
  // Una temporada que no cuenta (ver clan_games_seasons.excluded) se trata como "sin Juegos".
  if (!season || season.excluded) return new Map();

  const { data: points, error: pointsError } = await supabase
    .from("clan_games_points")
    .select("player_tag, points")
    .eq("clan_games_season_id", season.id);

  if (pointsError) throw new Error(`Failed to load clan games points: ${pointsError.message}`);

  return new Map(points.map((row) => [row.player_tag as string, Math.min((row.points as number | null) ?? 0, CLAN_GAMES_PLAYER_MAX)]));
}

export interface ClanGamesSeason {
  id: string;
  /** "AAAA-MM": la ventana de seguimiento es un mes UTC (ver apps/collector/src/collect/clan-games.ts). */
  seasonId: string;
  startTime: string | null;
  isOpen: boolean;
  /** No cuenta (datos incompletos): no se muestra ni puntúa. */
  excluded: boolean;
}

/** Todas las temporadas registradas, de la más reciente a la más antigua. */
export async function getClanGamesSeasons(supabase: SupabaseClient, clanId: string): Promise<ClanGamesSeason[]> {
  const { data, error } = await supabase
    .from("clan_games_seasons")
    .select("id, season_id, start_time, end_time, excluded")
    .eq("clan_id", clanId)
    .order("season_id", { ascending: false });

  if (error) throw new Error(`Failed to load clan games seasons: ${error.message}`);

  return data.map((row) => ({
    id: row.id as string,
    seasonId: row.season_id as string,
    startTime: row.start_time as string | null,
    isOpen: row.end_time == null,
    excluded: row.excluded as boolean,
  }));
}

export interface ClanGamesPlayerPoints {
  seasonId: string;
  playerTag: string;
  playerName: string;
  points: number;
}

/**
 * Puntos de cada jugador en todas las temporadas del clan, de una vez (son
 * unas 50 filas por mes), para cambiar de mes o ver el total sin volver al
 * servidor. Sin las temporadas que no cuentan. Se recortan al tope por jugador: el logro del que salen puede
 * sumar algo más que los puntos reales de los Juegos.
 */
export async function getAllClanGamesPoints(supabase: SupabaseClient, clanId: string): Promise<ClanGamesPlayerPoints[]> {
  const { data, error } = await supabase
    .from("clan_games_points")
    .select("player_tag, player_name, points, clan_games_seasons!inner(season_id, clan_id, excluded)")
    .eq("clan_games_seasons.clan_id", clanId)
    .eq("clan_games_seasons.excluded", false);

  if (error) throw new Error(`Failed to load clan games points: ${error.message}`);

  return data.map((row) => ({
    seasonId: (row.clan_games_seasons as unknown as { season_id: string }).season_id,
    playerTag: row.player_tag as string,
    playerName: row.player_name as string,
    points: Math.min((row.points as number | null) ?? 0, CLAN_GAMES_PLAYER_MAX),
  }));
}
