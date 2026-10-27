import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClanRules, LastFinishedWarRoster } from "@clashleader/rules";
import { getLatestFinishedCapitalSeason } from "@/lib/data/capital";
import { getClanRules } from "@/lib/data/clan-rules";
import { getCurrentClanGamesPoints } from "@/lib/data/clan-games";
import { getClanMembers, type MemberSummary } from "@/lib/data/members";
import { getCurrentWar, getMemberReliability, getWarHistory, type WarSummary } from "@/lib/data/wars";
import { evaluateMember, type MemberEvaluation } from "@/lib/member-evaluation";

/** La parte de guerra del índice mira las últimas N guerras en las que cada miembro estuvo en la alineación. */
const INDEX_RECENT_WARS = 10;

export interface ClanEvaluations {
  rules: ClanRules;
  members: MemberSummary[];
  evaluations: Map<string, MemberEvaluation>;
  currentWar: WarSummary | null;
}

/** Todo lo que necesitan Miembros, Ficha y Ascensos: los datos crudos más cada miembro pasado por packages/rules. */
export async function getClanEvaluations(supabase: SupabaseClient, clanId: string, now: Date = new Date()): Promise<ClanEvaluations> {
  const [rules, members, currentWar, lastFinishedWars, capitalSeason, clanGamesPoints, recentWarsByMemberId] = await Promise.all([
    getClanRules(supabase, clanId),
    getClanMembers(supabase, clanId),
    getCurrentWar(supabase, clanId),
    getWarHistory(supabase, clanId, 1),
    getLatestFinishedCapitalSeason(supabase, clanId, now),
    getCurrentClanGamesPoints(supabase, clanId),
    getMemberReliability(supabase, clanId, INDEX_RECENT_WARS),
  ]);

  const lastFinishedWar = lastFinishedWars[0] ?? null;
  // Por episodio de membresía, no por tag: a quien echaron y volvió a
  // entrar no se le puede pedir cuentas de una guerra de antes de volver.
  const lastFinishedWarRosterByMemberId = new Map(
    lastFinishedWar?.members.flatMap((m) => (m.clanMemberId ? [[m.clanMemberId, m.attacksUsed] as const] : [])) ?? [],
  );
  const capitalByTag = new Map(capitalSeason?.contributions.map((c) => [c.playerTag, c]) ?? []);
  // Los Juegos han empezado en cuanto alguien del clan ha sumado puntos esta temporada.
  const clanGamesStarted = [...clanGamesPoints.values()].some((points) => points > 0);

  const evaluations = new Map<string, MemberEvaluation>();

  for (const member of members) {
    const lastFinishedWarRoster: LastFinishedWarRoster | null = lastFinishedWar
      ? {
          wasRostered: lastFinishedWarRosterByMemberId.has(member.id),
          attacksUsed: lastFinishedWarRosterByMemberId.get(member.id) ?? 0,
        }
      : null;

    const capital = capitalByTag.get(member.playerTag);
    const recentWar = recentWarsByMemberId.get(member.id);

    evaluations.set(
      member.id,
      evaluateMember(member, {
        now,
        rules,
        lastFinishedWar: lastFinishedWarRoster,
        recentWar:
          recentWar && recentWar.warsCounted > 0 && recentWar.usagePct != null
            ? { usagePct: Number(recentWar.usagePct), avgStars: recentWar.avgStars == null ? null : Number(recentWar.avgStars) }
            : null,
        capitalSeason: capitalSeason
          ? { startTime: capitalSeason.startTime, attacksUsed: capital?.attacksUsed ?? null, attackLimit: capital?.attackLimit ?? null }
          : null,
        clanGamesPoints: clanGamesStarted ? (clanGamesPoints.get(member.playerTag) ?? 0) : null,
      }),
    );
  }

  return { rules, members, evaluations, currentWar };
}
