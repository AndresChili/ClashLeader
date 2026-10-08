import {
  computeIndex,
  evaluateKick,
  isAtRisk,
  isColeaderCandidate,
  isVeteranCandidate,
  type ClanRules,
  type IndexResult,
  type KickEvaluation,
  type LastFinishedWarRoster,
} from "@clashleader/rules";
import type { MemberSummary } from "@/lib/data/members";
import { daysInClan } from "@/lib/format-member";

const NEAR_DAILY_ACTIVITY_WINDOW_DAYS = 2;

export interface MemberEvaluation {
  kick: KickEvaluation;
  atRisk: boolean;
  isVeteranCandidate: boolean;
  isColeaderCandidate: boolean;
  index: IndexResult;
}

export interface MemberEvaluationContext {
  now: Date;
  rules: ClanRules;
  /** From the current in-progress war's roster, or undefined if they aren't in it (no war, or not rostered). */
  currentWarAttacks: number | undefined;
  inCurrentWar: boolean;
  /** null only when the clan has no finished war on record at all. */
  lastFinishedWar: LastFinishedWarRoster | null;
  capitalAttacksUsed: number | null;
  capitalAttacksAvailable: number | null;
  clanGamesPoints: number | null;
}

export function evaluateMember(member: MemberSummary, context: MemberEvaluationContext): MemberEvaluation {
  const joinedAt = new Date(member.manualJoinDate ?? member.firstSeenAt);
  const lastActivityDetectedAt = member.lastActivityDetectedAt ? new Date(member.lastActivityDetectedAt) : null;

  const kick = evaluateKick({
    lastActivityDetectedAt,
    firstSeenAt: joinedAt,
    now: context.now,
    kickInactivityDays: context.rules.kickInactivityDays,
    lastFinishedWar: context.lastFinishedWar,
  });

  const atRisk = isAtRisk({
    inCurrentWar: context.inCurrentWar,
    attacksUsedInCurrentWar: context.currentWarAttacks ?? 0,
  });

  const nearDailyActivity =
    lastActivityDetectedAt != null &&
    context.now.getTime() - lastActivityDetectedAt.getTime() <= NEAR_DAILY_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const veteranCandidate = isVeteranCandidate(
    {
      daysInClan: daysInClan(member, context.now),
      warsRostered: member.warsRostered,
      warsAttacked: member.warsAttacked,
      donationsThisSeason: member.donations ?? 0,
    },
    context.rules,
  );

  const coleaderCandidate = isColeaderCandidate(
    {
      daysInClan: daysInClan(member, context.now),
      attackUsagePct: member.attackUsagePct,
      donationsThisSeason: member.donations ?? 0,
      nearDailyActivity,
    },
    context.rules,
  );

  const index = computeIndex(
    {
      warUsagePct: member.attackUsagePct,
      warAvgStars: member.avgStarsPerAttack,
      donationsThisSeason: member.donations,
      capitalAttacksUsed: context.capitalAttacksUsed,
      capitalAttacksAvailable: context.capitalAttacksAvailable,
      clanGamesPoints: context.clanGamesPoints,
    },
    context.rules,
  );

  return { kick, atRisk, isVeteranCandidate: veteranCandidate, isColeaderCandidate: coleaderCandidate, index };
}
