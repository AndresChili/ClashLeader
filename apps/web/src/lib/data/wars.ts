import type { SupabaseClient } from "@supabase/supabase-js";

export interface WarMemberRow {
  clanMemberId: string | null;
  playerTag: string;
  playerName: string;
  mapPosition: number;
  attacksUsed: number;
}

export interface WarSummary {
  id: string;
  warType: "random" | "friendly" | "cwl";
  state: "preparation" | "inWar" | "warEnded";
  teamSize: number;
  opponentName: string | null;
  startTime: string | null;
  endTime: string | null;
  clanStars: number | null;
  clanDestructionPct: number | null;
  opponentStars: number | null;
  opponentDestructionPct: number | null;
  result: "win" | "lose" | "tie" | null;
  members: WarMemberRow[];
}

const WAR_COLUMNS =
  "id, war_type, state, team_size, opponent_name, start_time, end_time, clan_stars, clan_destruction_pct, opponent_stars, opponent_destruction_pct, result, war_members(clan_member_id, player_tag, player_name, map_position, attacks_used)";

function mapWarRow(row: Record<string, unknown>): WarSummary {
  return {
    id: row.id as string,
    warType: row.war_type as WarSummary["warType"],
    state: row.state as WarSummary["state"],
    teamSize: row.team_size as number,
    opponentName: row.opponent_name as string | null,
    startTime: row.start_time as string | null,
    endTime: row.end_time as string | null,
    clanStars: row.clan_stars as number | null,
    clanDestructionPct: row.clan_destruction_pct as number | null,
    opponentStars: row.opponent_stars as number | null,
    opponentDestructionPct: row.opponent_destruction_pct as number | null,
    result: row.result as WarSummary["result"],
    members: ((row.war_members as Record<string, unknown>[] | null) ?? [])
      .map((m) => ({
        clanMemberId: m.clan_member_id as string | null,
        playerTag: m.player_tag as string,
        playerName: m.player_name as string,
        mapPosition: m.map_position as number,
        attacksUsed: m.attacks_used as number,
      }))
      .sort((a, b) => a.mapPosition - b.mapPosition),
  };
}

export async function getCurrentWar(supabase: SupabaseClient, clanId: string): Promise<WarSummary | null> {
  const { data, error } = await supabase
    .from("wars")
    .select(WAR_COLUMNS)
    .eq("clan_id", clanId)
    .in("state", ["preparation", "inWar"])
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load current war: ${error.message}`);
  return data ? mapWarRow(data) : null;
}

export async function getWarHistory(supabase: SupabaseClient, clanId: string, limit = 20): Promise<WarSummary[]> {
  const { data, error } = await supabase
    .from("wars")
    .select(WAR_COLUMNS)
    .eq("clan_id", clanId)
    .eq("state", "warEnded")
    .order("end_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load war history: ${error.message}`);
  return data.map(mapWarRow);
}

export interface CwlGroupSummary {
  season: string;
  state: string;
  wars: WarSummary[];
}

export async function getCwlGroup(supabase: SupabaseClient, clanId: string): Promise<CwlGroupSummary | null> {
  const { data: group, error: groupError } = await supabase
    .from("cwl_groups")
    .select("id, season, state")
    .eq("clan_id", clanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (groupError) throw new Error(`Failed to load CWL group: ${groupError.message}`);
  if (!group) return null;

  const { data: wars, error: warsError } = await supabase
    .from("wars")
    .select(WAR_COLUMNS)
    .eq("cwl_group_id", group.id)
    .order("start_time", { ascending: true });

  if (warsError) throw new Error(`Failed to load CWL wars: ${warsError.message}`);

  return { season: group.season as string, state: group.state as string, wars: wars.map(mapWarRow) };
}

export interface MemberReliability {
  warsCounted: number;
  attacksUsed: number;
  attacksAvailable: number;
  usagePct: number | null;
  avgStars: number | null;
}

export async function getMemberReliability(supabase: SupabaseClient, clanId: string): Promise<Map<string, MemberReliability>> {
  const { data, error } = await supabase.rpc("member_war_reliability", { p_clan_id: clanId });
  if (error) throw new Error(`Failed to load member war reliability: ${error.message}`);

  const byMemberId = new Map<string, MemberReliability>();
  for (const row of data ?? []) {
    byMemberId.set(row.clan_member_id as string, {
      warsCounted: row.wars_counted as number,
      attacksUsed: row.attacks_used as number,
      attacksAvailable: row.attacks_available as number,
      usagePct: row.usage_pct as number | null,
      avgStars: row.avg_stars as number | null,
    });
  }
  return byMemberId;
}

export interface RecentWar {
  warId: string;
  endTime: string | null;
  stars: number;
}

export async function getMemberRecentWars(supabase: SupabaseClient, clanMemberId: string, limit = 10): Promise<RecentWar[]> {
  const { data, error } = await supabase.rpc("member_recent_wars", { p_clan_member_id: clanMemberId, p_limit: limit });
  if (error) throw new Error(`Failed to load recent wars for member ${clanMemberId}: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    warId: row.war_id as string,
    endTime: row.end_time as string | null,
    stars: row.stars as number,
  }));
}
