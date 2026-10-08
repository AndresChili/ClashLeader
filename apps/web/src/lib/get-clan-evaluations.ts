import type { SupabaseClient } from "@supabase/supabase-js";
import type { LastFinishedWarRoster } from "@clashleader/rules";
import { getLatestCapitalSeason } from "@/lib/data/capital";
import { getClanRules } from "@/lib/data/clan-rules";
import { getCurrentClanGamesPoints } from "@/lib/data/clan-games";
import { getClanMembers, type MemberSummary } from "@/lib/data/members";
import { getCurrentWar, getWarHistory, type WarSummary } from "@/lib/data/wars";
import { evaluateMember, type MemberEvaluation } from "@/lib/member-evaluation";

export interface ClanEvaluations {
  members: MemberSummary[];
  evaluations: Map<string, MemberEvaluation>;
  currentWar: WarSummary | null;
}

/** Everything Miembros, Ficha and Ascensos need: the raw data plus every member run through packages/rules. */
export async function getClanEvaluations(supabase: SupabaseClient, clanId: string, now: Date = new Date()): Promise<ClanEvaluations> {
  const [rules, members, currentWar, lastFinishedWars, capitalSeason, clanGamesPoints] = await Promise.all([
    getClanRules(supabase, clanId),
    getClanMembers(supabase, clanId),
    getCurrentWar(supabase, clanId),
    getWarHistory(supabase, clanId, 1),
    getLatestCapitalSeason(supabase, clanId),
    getCurrentClanGamesPoints(supabase, clanId),
  ]);

  const currentWarAttacksByTag = new Map(currentWar?.members.map((m) => [m.playerTag, m.attacksUsed]) ?? []);
  const lastFinishedWar = lastFinishedWars[0] ?? null;
  const lastFinishedWarRosterByTag = new Map(lastFinishedWar?.members.map((m) => [m.playerTag, m.attacksUsed]) ?? []);
  const capitalByTag = new Map(capitalSeason?.contributions.map((c) => [c.playerTag, c]) ?? []);

  const evaluations = new Map<string, MemberEvaluation>();

  for (const member of members) {
    const lastFinishedWarRoster: LastFinishedWarRoster | null = lastFinishedWar
      ? {
          wasRostered: lastFinishedWarRosterByTag.has(member.playerTag),
          attacksUsed: lastFinishedWarRosterByTag.get(member.playerTag) ?? 0,
        }
      : null;

    const capital = capitalByTag.get(member.playerTag);

    evaluations.set(
      member.id,
      evaluateMember(member, {
        now,
        rules,
        inCurrentWar: currentWarAttacksByTag.has(member.playerTag),
        currentWarAttacks: currentWarAttacksByTag.get(member.playerTag),
        lastFinishedWar: lastFinishedWarRoster,
        capitalAttacksUsed: capital?.attacksUsed ?? null,
        capitalAttacksAvailable: capital?.attackLimit ?? null,
        clanGamesPoints: clanGamesPoints.get(member.playerTag) ?? null,
      }),
    );
  }

  return { members, evaluations, currentWar };
}
