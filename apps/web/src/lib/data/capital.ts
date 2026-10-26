import type { SupabaseClient } from "@supabase/supabase-js";

export interface CapitalContribution {
  playerTag: string;
  attacksUsed: number;
  attackLimit: number;
  capitalGoldLooted: number;
}

export interface CapitalSeasonSummary {
  seasonId: string;
  startTime: string | null;
  capitalTotalLoot: number;
  contributions: CapitalContribution[];
}

/** El último fin de semana de asaltos ya terminado: uno en curso todavía no se le puede exigir a nadie. */
export async function getLatestFinishedCapitalSeason(
  supabase: SupabaseClient,
  clanId: string,
  now: Date,
): Promise<CapitalSeasonSummary | null> {
  const { data: season, error: seasonError } = await supabase
    .from("capital_seasons")
    .select("id, season_id, start_time")
    .eq("clan_id", clanId)
    .lte("end_time", now.toISOString())
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) throw new Error(`Failed to load latest capital season: ${seasonError.message}`);
  if (!season) return null;

  const { data: contributions, error: contributionsError } = await supabase
    .from("capital_contributions")
    .select("player_tag, attacks_used, attack_limit, capital_gold_looted")
    .eq("capital_season_id", season.id);

  if (contributionsError) throw new Error(`Failed to load capital contributions: ${contributionsError.message}`);

  const total = contributions.reduce((sum, row) => sum + (row.capital_gold_looted as number), 0);

  return {
    seasonId: season.season_id as string,
    startTime: season.start_time as string | null,
    capitalTotalLoot: total,
    contributions: contributions.map((row) => ({
      playerTag: row.player_tag as string,
      attacksUsed: row.attacks_used as number,
      attackLimit: row.attack_limit as number,
      capitalGoldLooted: row.capital_gold_looted as number,
    })),
  };
}

/**
 * Suma del oro de capital saqueado por un jugador en todos los fines de
 * semana de asalto registrados desde que entró al clan (start_time >=
 * fecha de entrada). Se filtra por tag, no por clan_member_id, así que si
 * el jugador salió y volvió a entrar antes solo cuenta lo de este episodio.
 */
export async function getCapitalLootSinceJoin(
  supabase: SupabaseClient,
  clanId: string,
  playerTag: string,
  joinedAt: Date,
): Promise<number> {
  const { data: seasons, error: seasonsError } = await supabase
    .from("capital_seasons")
    .select("id")
    .eq("clan_id", clanId)
    .gte("start_time", joinedAt.toISOString());

  if (seasonsError) throw new Error(`Failed to load capital seasons since join: ${seasonsError.message}`);
  if (!seasons || seasons.length === 0) return 0;

  const { data: contributions, error: contributionsError } = await supabase
    .from("capital_contributions")
    .select("capital_gold_looted")
    .eq("player_tag", playerTag)
    .in(
      "capital_season_id",
      seasons.map((s) => s.id as string),
    );

  if (contributionsError) throw new Error(`Failed to load capital contributions since join: ${contributionsError.message}`);

  return (contributions ?? []).reduce((sum, row) => sum + (row.capital_gold_looted as number), 0);
}
