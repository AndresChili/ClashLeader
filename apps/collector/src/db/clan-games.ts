import type { SupabaseClient } from "@supabase/supabase-js";

export interface OpenClanGamesSeason {
  id: string;
  seasonId: string;
}

export async function getOpenClanGamesSeason(supabase: SupabaseClient, clanId: string): Promise<OpenClanGamesSeason | null> {
  const { data, error } = await supabase
    .from("clan_games_seasons")
    .select("id, season_id")
    .eq("clan_id", clanId)
    .is("end_time", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load open clan games season for clan ${clanId}: ${error.message}`);
  }
  if (!data) return null;

  return { id: data.id as string, seasonId: data.season_id as string };
}

export async function openClanGamesSeason(supabase: SupabaseClient, clanId: string, seasonId: string, startTime: Date): Promise<string> {
  const { data, error } = await supabase
    .from("clan_games_seasons")
    .insert({ clan_id: clanId, season_id: seasonId, start_time: startTime.toISOString() })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to open clan games season for clan ${clanId}: ${error.message}`);
  }

  return data.id as string;
}

export async function closeClanGamesSeason(supabase: SupabaseClient, seasonRowId: string, endTime: Date): Promise<void> {
  const { error } = await supabase
    .from("clan_games_seasons")
    .update({ end_time: endTime.toISOString() })
    .eq("id", seasonRowId);

  if (error) {
    throw new Error(`Failed to close clan games season ${seasonRowId}: ${error.message}`);
  }
}

export interface ClanGamesPointInput {
  playerTag: string;
  playerName: string;
  achievementValueBefore: number;
  achievementValueAfter: number;
  points: number;
}

/**
 * One row per member per season. A member seen for the first time this
 * season (joined mid-window) gets before == after == their current value,
 * so they start earning points from the moment we first see them, same as
 * everyone else's baseline.
 */
export async function upsertClanGamesPoints(
  supabase: SupabaseClient,
  clanGamesSeasonId: string,
  rows: ClanGamesPointInput[],
): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await supabase.from("clan_games_points").upsert(
    rows.map((row) => ({
      clan_games_season_id: clanGamesSeasonId,
      player_tag: row.playerTag,
      player_name: row.playerName,
      achievement_value_before: row.achievementValueBefore,
      achievement_value_after: row.achievementValueAfter,
      points: row.points,
    })),
    { onConflict: "clan_games_season_id,player_tag" },
  );

  if (error) {
    throw new Error(`Failed to upsert clan games points for season ${clanGamesSeasonId}: ${error.message}`);
  }
}

export async function getExistingPointRows(
  supabase: SupabaseClient,
  clanGamesSeasonId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("clan_games_points")
    .select("player_tag, achievement_value_before")
    .eq("clan_games_season_id", clanGamesSeasonId);

  if (error) {
    throw new Error(`Failed to load existing clan games points for season ${clanGamesSeasonId}: ${error.message}`);
  }

  return new Map(data.map((row) => [row.player_tag as string, row.achievement_value_before as number]));
}
