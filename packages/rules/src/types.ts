/** Mirrors the public.clan_rules table (supabase/migrations/20261008183314_init_schema.sql). */
export interface ClanRules {
  clanId: string;
  kickInactivityDays: number;
  veteranMinDays: number;
  veteranMinDonationsPerSeason: number;
  coleaderMinDays: number;
  coleaderMinAttackUsagePct: number;
  coleaderMinDonationsPerSeason: number;
  indexWeightWar: number;
  indexWeightDonations: number;
  indexWeightCapital: number;
  indexWeightGames: number;
  indexPassThreshold: number;
}

export const DEFAULT_CLAN_RULES: Omit<ClanRules, "clanId"> = {
  kickInactivityDays: 3,
  veteranMinDays: 30,
  veteranMinDonationsPerSeason: 500,
  coleaderMinDays: 90,
  coleaderMinAttackUsagePct: 90,
  coleaderMinDonationsPerSeason: 1000,
  indexWeightWar: 40,
  indexWeightDonations: 30,
  indexWeightCapital: 15,
  indexWeightGames: 15,
  indexPassThreshold: 70,
};
