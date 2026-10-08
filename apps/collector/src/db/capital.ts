import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClashApiCapitalRaidSeason } from "@clashleader/clash-api";

/** No stable id in the API response; startTime is unique per raid weekend. */
export function capitalSeasonId(season: ClashApiCapitalRaidSeason): string {
  return season.startTime;
}

export async function upsertCapitalSeason(
  supabase: SupabaseClient,
  clanId: string,
  season: ClashApiCapitalRaidSeason,
): Promise<string> {
  const { data, error } = await supabase
    .from("capital_seasons")
    .upsert(
      {
        clan_id: clanId,
        season_id: capitalSeasonId(season),
        start_time: season.startTime,
        end_time: season.endTime,
      },
      { onConflict: "clan_id,season_id" },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to upsert capital season for clan ${clanId}: ${error.message}`);
  }

  return data.id as string;
}

/** Used to detect "this member made a new capital attack since the last poll" (an activity signal). */
export async function getCapitalAttacksUsedByTag(supabase: SupabaseClient, capitalSeasonRowId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("capital_contributions")
    .select("player_tag, attacks_used")
    .eq("capital_season_id", capitalSeasonRowId);
  if (error) {
    throw new Error(`Failed to load existing capital contributions for season ${capitalSeasonRowId}: ${error.message}`);
  }
  return new Map(data.map((row) => [row.player_tag as string, row.attacks_used as number]));
}

export async function upsertCapitalContributions(
  supabase: SupabaseClient,
  capitalSeasonRowId: string,
  season: ClashApiCapitalRaidSeason,
): Promise<void> {
  const rows = (season.members ?? []).map((member) => ({
    capital_season_id: capitalSeasonRowId,
    player_tag: member.tag,
    player_name: member.name,
    attacks_used: member.attacks,
    attack_limit: member.attackLimit + member.bonusAttackLimit,
    capital_gold_looted: member.capitalResourcesLooted,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("capital_contributions")
    .upsert(rows, { onConflict: "capital_season_id,player_tag" });

  if (error) {
    throw new Error(`Failed to upsert capital contributions for season ${capitalSeasonRowId}: ${error.message}`);
  }
}
