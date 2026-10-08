import type { SupabaseClient } from "@supabase/supabase-js";

export interface CapitalContribution {
  playerTag: string;
  attacksUsed: number;
  attackLimit: number;
  capitalGoldLooted: number;
}

export interface CapitalSeasonSummary {
  seasonId: string;
  capitalTotalLoot: number;
  contributions: CapitalContribution[];
}

export async function getLatestCapitalSeason(supabase: SupabaseClient, clanId: string): Promise<CapitalSeasonSummary | null> {
  const { data: season, error: seasonError } = await supabase
    .from("capital_seasons")
    .select("id, season_id")
    .eq("clan_id", clanId)
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
    capitalTotalLoot: total,
    contributions: contributions.map((row) => ({
      playerTag: row.player_tag as string,
      attacksUsed: row.attacks_used as number,
      attackLimit: row.attack_limit as number,
      capitalGoldLooted: row.capital_gold_looted as number,
    })),
  };
}
