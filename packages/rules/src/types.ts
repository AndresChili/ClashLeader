/** Refleja la tabla public.clan_rules (supabase/migrations/20261008183314_init_schema.sql). */
export interface ClanRules {
  clanId: string;
  kickInactivityDays: number;
  veteranMinDays: number;
  veteranMinDonationsPerSeason: number;
  coleaderMinDays: number;
  coleaderMinAttackUsagePct: number;
  coleaderMinDonationsPerSeason: number;
  indexWeightWar: number;
  indexWeightActivity: number;
  indexWeightDonations: number;
  indexWeightCapital: number;
  indexWeightGames: number;
  /** Donaciones de la temporada que dan la nota máxima en la parte de donaciones de la puntuación. */
  indexDonationsFullScore: number;
}

export const DEFAULT_CLAN_RULES: Omit<ClanRules, "clanId"> = {
  kickInactivityDays: 3,
  veteranMinDays: 30,
  veteranMinDonationsPerSeason: 500,
  coleaderMinDays: 90,
  coleaderMinAttackUsagePct: 90,
  coleaderMinDonationsPerSeason: 1000,
  indexWeightWar: 45,
  indexWeightActivity: 25,
  indexWeightDonations: 5,
  indexWeightCapital: 15,
  indexWeightGames: 10,
  indexDonationsFullScore: 2000,
};
