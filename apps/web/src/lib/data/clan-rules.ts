import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CLAN_RULES, type ClanRules } from "@clashleader/rules";

export async function getClanRules(supabase: SupabaseClient, clanId: string): Promise<ClanRules> {
  const { data, error } = await supabase.from("clan_rules").select("*").eq("clan_id", clanId).single();

  if (error) {
    // clan_rules siempre tiene una fila (la crea un trigger al insertar el
    // clan), así que un fallo de lectura aquí significa que algo va mal de
    // verdad; se usan los valores por defecto documentados en vez de
    // tumbar la página.
    console.error(`Failed to load clan_rules for ${clanId}, using defaults:`, error.message);
    return { clanId, ...DEFAULT_CLAN_RULES };
  }

  return {
    clanId: data.clan_id as string,
    kickInactivityDays: data.kick_inactivity_days as number,
    veteranMinDays: data.veteran_min_days as number,
    veteranMinDonationsPerSeason: data.veteran_min_donations_per_season as number,
    coleaderMinDays: data.coleader_min_days as number,
    coleaderMinAttackUsagePct: data.coleader_min_attack_usage_pct as number,
    coleaderMinDonationsPerSeason: data.coleader_min_donations_per_season as number,
    indexWeightWar: data.index_weight_war as number,
    indexWeightActivity: data.index_weight_activity as number,
    indexWeightDonations: data.index_weight_donations as number,
    indexWeightCapital: data.index_weight_capital as number,
    indexWeightGames: data.index_weight_games as number,
    indexDonationsFullScore: data.index_donations_full_score as number,
  };
}
