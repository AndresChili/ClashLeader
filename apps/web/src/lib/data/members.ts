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

export interface MemberIdentity {
  id: string;
  playerTag: string;
  name: string;
}

/**
 * Solo quién está ahora en el clan, sin snapshots ni fiabilidad de guerra:
 * para pantallas que traen sus propios datos (Juegos, Capital) y no deben
 * pagar las consultas pesadas de getClanMembers.
 */
export async function getCurrentMemberIdentities(supabase: SupabaseClient, clanId: string): Promise<MemberIdentity[]> {
  const { data, error } = await supabase
    .from("clan_members")
    .select("id, player_tag, name")
    .eq("clan_id", clanId)
    .eq("is_current", true);

  if (error) throw new Error(`Failed to load current members: ${error.message}`);

  return data.map((row) => ({ id: row.id as string, playerTag: row.player_tag as string, name: row.name as string }));
}

export async function getClanMemberByTag(supabase: SupabaseClient, clanId: string, playerTag: string): Promise<MemberSummary | null> {
  // Un clan tiene como mucho 50 miembros, así que reutilizar la consulta
  // de la lista es más simple y en la práctica no más lento que una
  // consulta de una sola fila hecha a medida.
  const members = await getClanMembers(supabase, clanId);
  return members.find((member) => member.playerTag === playerTag) ?? null;
}

export interface Movement {
  id: number;
  playerName: string;
  eventType: "joined" | "left";
  detectedAt: string;
}

export interface MovementsPage {
  items: Movement[];
  total: number;
}

/**
 * Entradas y salidas del clan, de la más reciente a la más antigua, de
 * pageSize en pageSize (page empieza en 0). Se descartan las "entradas" de
 * la primera recogida del clan: ahí todos los que ya estaban aparecen como
 * entrados a la vez, y no son movimientos reales. Esa primera recogida es
 * un único insert, así que todas comparten el mismo detected_at.
 */
export async function getMovements(
  supabase: SupabaseClient,
  clanId: string,
  page: number,
  pageSize: number,
): Promise<MovementsPage> {
  const { data: first, error: firstError } = await supabase
    .from("membership_events")
    .select("detected_at")
    .eq("clan_id", clanId)
    .order("detected_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstError) throw new Error(`Failed to load first membership event: ${firstError.message}`);
  if (!first) return { items: [], total: 0 };

  const from = page * pageSize;
  const { data, error, count } = await supabase
    .from("membership_events")
    .select("id, player_name, event_type, detected_at", { count: "exact" })
    .eq("clan_id", clanId)
    .or(`event_type.eq.left,detected_at.gt."${first.detected_at as string}"`)
    .order("detected_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(`Failed to load membership events: ${error.message}`);

  return {
    items: data.map((row) => ({
      id: row.id as number,
      playerName: row.player_name as string,
      eventType: row.event_type as Movement["eventType"],
      detectedAt: row.detected_at as string,
    })),
    total: count ?? 0,
  };
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
