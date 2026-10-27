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

export interface CapitalWeekend {
  startTime: string;
  endTime: string | null;
}

export async function getLatestCapitalWeekend(supabase: SupabaseClient, clanId: string): Promise<CapitalWeekend | null> {
  const { data, error } = await supabase
    .from("capital_seasons")
    .select("start_time, end_time")
    .eq("clan_id", clanId)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load latest capital weekend: ${error.message}`);
  if (!data?.start_time) return null;

  return { startTime: data.start_time as string, endTime: data.end_time as string | null };
}

export interface MemberCapitalStats {
  weekends: number;
  attacksUsed: number;
  attacksAvailable: number;
  goldLooted: number;
  /** null = todavía no hay datos de oro aportado para este miembro. */
  goldContributed: number | null;
}

/**
 * Asaltos (member_capital_raids) y oro aportado (member_capital_contributed)
 * de cada miembro actual desde since (null = desde que hay datos), por
 * clan_member_id. Quien no tiene fila no estuvo en ningún fin de semana del periodo.
 */
export async function getMemberCapitalStats(
  supabase: SupabaseClient,
  clanId: string,
  since: Date | null,
): Promise<{ byMemberId: Map<string, MemberCapitalStats>; contributionsTrackedSince: string | null }> {
  const params = { p_clan_id: clanId, p_since: since?.toISOString() ?? null };
  const [raids, contributed] = await Promise.all([
    supabase.rpc("member_capital_raids", params),
    supabase.rpc("member_capital_contributed", params),
  ]);

  if (raids.error) throw new Error(`Failed to load member capital raids: ${raids.error.message}`);
  if (contributed.error) throw new Error(`Failed to load member capital contributions: ${contributed.error.message}`);

  const contributedRows = (contributed.data ?? []) as Record<string, unknown>[];
  const contributedById = new Map<string, number>(contributedRows.map((row) => [row.clan_member_id as string, Number(row.contributed)]));
  // Desde cuándo hay datos de oro aportado (el primer valor guardado de cualquiera).
  const contributionsTrackedSince =
    contributedRows.map((row) => row.tracked_since as string).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;

  const stats = new Map<string, MemberCapitalStats>();
  for (const row of (raids.data ?? []) as Record<string, unknown>[]) {
    const id = row.clan_member_id as string;
    stats.set(id, {
      weekends: row.weekends as number,
      attacksUsed: row.attacks_used as number,
      attacksAvailable: row.attacks_available as number,
      goldLooted: Number(row.gold_looted),
      goldContributed: contributedById.get(id) ?? null,
    });
  }
  // Puede haber oro aportado sin ningún fin de semana de asalto en el periodo.
  for (const [id, gold] of contributedById) {
    if (!stats.has(id)) stats.set(id, { weekends: 0, attacksUsed: 0, attacksAvailable: 0, goldLooted: 0, goldContributed: gold });
  }
  return { byMemberId: stats, contributionsTrackedSince };
}
