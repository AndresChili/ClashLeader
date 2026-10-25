import type { SupabaseClient } from "@supabase/supabase-js";
import { getMemberReliability } from "./wars";

export type MemberRole = "member" | "admin" | "coLeader" | "leader";

interface SnapshotRpcRow {
  clan_member_id: string;
  donations: number;
  donations_received: number;
  exp_level: number | null;
  trophies: number | null;
  town_hall_level: number | null;
  league_name: string | null;
  collected_at: string;
}

export interface MemberSummary {
  id: string;
  playerTag: string;
  name: string;
  inGameRole: MemberRole;
  firstSeenAt: string;
  manualJoinDate: string | null;
  lastActivityDetectedAt: string | null;
  onWatch: boolean;
  donations: number | null;
  donationsReceived: number | null;
  leagueName: string | null;
  trophies: number | null;
  townHallLevel: number | null;
  /** De todos los tiempos, a través de cada guerra terminada registrada (ver member_war_reliability()); null hasta la primera guerra terminada del miembro. */
  avgStarsPerAttack: number | null;
  attackUsagePct: number | null;
  attacksUsed: number | null;
  attacksAvailable: number | null;
  warsRostered: number;
  warsAttacked: number;
}

/**
 * Solo hechos crudos — aquí no se evalúa ninguna regla. Los veredictos de
 * expulsión/riesgo/candidato/índice los calcula a partir de esto
 * lib/member-evaluation.ts, que además necesita datos de guerra/capital/
 * juegos del clan que esta función no trae, así que mezclar las dos cosas
 * aquí solo significaría traerlos dos veces.
 */
export async function getClanMembers(supabase: SupabaseClient, clanId: string): Promise<MemberSummary[]> {
  const [{ data: members, error: membersError }, { data: snapshots, error: snapshotsError }, reliabilityByMemberId] =
    await Promise.all([
      supabase
        .from("clan_members")
        .select("id, player_tag, name, in_game_role, first_seen_at, manual_join_date, last_activity_detected_at, on_watch")
        .eq("clan_id", clanId)
        .eq("is_current", true),
      supabase.rpc("latest_member_snapshots_for_viewer", { p_clan_id: clanId }) as unknown as Promise<{
        data: SnapshotRpcRow[] | null;
        error: { message: string } | null;
      }>,
      getMemberReliability(supabase, clanId),
    ]);

  if (membersError) throw new Error(`Failed to load clan members: ${membersError.message}`);
  if (snapshotsError) throw new Error(`Failed to load member snapshots: ${snapshotsError.message}`);

  const snapshotByMemberId = new Map((snapshots ?? []).map((row) => [row.clan_member_id, row]));

  return members.map((member) => {
    const snapshot = snapshotByMemberId.get(member.id as string);
    const reliability = reliabilityByMemberId.get(member.id as string);

    return {
      id: member.id as string,
      playerTag: member.player_tag as string,
      name: member.name as string,
      inGameRole: member.in_game_role as MemberRole,
      firstSeenAt: member.first_seen_at as string,
      manualJoinDate: member.manual_join_date as string | null,
      lastActivityDetectedAt: member.last_activity_detected_at as string | null,
      onWatch: member.on_watch as boolean,
      donations: snapshot?.donations ?? null,
      donationsReceived: snapshot?.donations_received ?? null,
      leagueName: snapshot?.league_name ?? null,
      trophies: snapshot?.trophies ?? null,
      townHallLevel: snapshot?.town_hall_level ?? null,
      avgStarsPerAttack: reliability?.avgStars ?? null,
      attackUsagePct: reliability?.usagePct ?? null,
      attacksUsed: reliability?.attacksUsed ?? null,
      attacksAvailable: reliability?.attacksAvailable ?? null,
      warsRostered: reliability?.warsCounted ?? 0,
      warsAttacked: reliability?.warsAttacked ?? 0,
    };
  });
}

export async function getClanMemberByTag(supabase: SupabaseClient, clanId: string, playerTag: string): Promise<MemberSummary | null> {
  // Un clan tiene como mucho 50 miembros, así que reutilizar la consulta
  // de la lista es más simple y en la práctica no más lento que una
  // consulta de una sola fila hecha a medida.
  const members = await getClanMembers(supabase, clanId);
  return members.find((member) => member.playerTag === playerTag) ?? null;
}

export interface RecentExit {
  playerTag: string;
  name: string;
  leftAt: string;
}

/** Los miembros marcados como salidos (is_current = false) más recientes, para la sección "Movimientos" del Panel. */
export async function getRecentExits(supabase: SupabaseClient, clanId: string, limit = 5): Promise<RecentExit[]> {
  const { data, error } = await supabase
    .from("clan_members")
    .select("player_tag, name, left_at")
    .eq("clan_id", clanId)
    .eq("is_current", false)
    .order("left_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load recent exits: ${error.message}`);

  return data.map((row) => ({
    playerTag: row.player_tag as string,
    name: row.name as string,
    leftAt: row.left_at as string,
  }));
}

/** Suma de donaciones congeladas en cada reinicio de temporada anterior, sin incluir la temporada en curso (eso es member.donations). */
export async function getDonationSeasonsTotal(supabase: SupabaseClient, clanMemberId: string): Promise<number> {
  const { data, error } = await supabase
    .from("donation_season_totals")
    .select("donations")
    .eq("clan_member_id", clanMemberId);

  if (error) throw new Error(`Failed to load donation season totals: ${error.message}`);

  return (data ?? []).reduce((sum, row) => sum + (row.donations as number), 0);
}
