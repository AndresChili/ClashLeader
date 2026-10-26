import {
  computeIndex,
  daysIntoSeason,
  evaluateKick,
  isColeaderCandidate,
  isVeteranCandidate,
  type ClanRules,
  type IndexResult,
  type KickEvaluation,
  type LastFinishedWarRoster,
  seasonProgress,
} from "@clashleader/rules";
import type { MemberSummary } from "@/lib/data/members";
import { daysInClan } from "@/lib/format-member";

const NEAR_DAILY_ACTIVITY_WINDOW_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Los primeros días de temporada todo el mundo está a cero donaciones: no se puntúan. */
const DONATIONS_GRACE_DAYS = 3;
/** Ataques de capital base cuando el jugador no aparece en el fin de semana (no atacó). */
const DEFAULT_CAPITAL_ATTACK_LIMIT = 5;

export interface MemberEvaluation {
  kick: KickEvaluation;
  isVeteranCandidate: boolean;
  isColeaderCandidate: boolean;
  index: IndexResult;
}

export interface MemberEvaluationContext {
  now: Date;
  rules: ClanRules;
  /** null solo cuando el clan no tiene ninguna guerra terminada registrada. */
  lastFinishedWar: LastFinishedWarRoster | null;
  /** Sus últimas 10 guerras en alineación; null si no ha estado en ninguna. */
  recentWar: { usagePct: number; avgStars: number | null } | null;
  /** Último fin de semana de asaltos terminado; null si no hay ninguno registrado. */
  capitalSeason: { startTime: string | null; attacksUsed: number | null; attackLimit: number | null } | null;
  /** null = los Juegos del Clan de esta temporada todavía no han empezado. */
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

  const activityReference = lastActivityDetectedAt ?? joinedAt;
  const capitalSeasonStart = context.capitalSeason?.startTime ? new Date(context.capitalSeason.startTime) : null;
  const wasInClanForCapital = context.capitalSeason != null && (capitalSeasonStart == null || joinedAt <= capitalSeasonStart);

  const index = computeIndex(
    {
      war: context.recentWar,
      daysSinceActivity: (context.now.getTime() - activityReference.getTime()) / MS_PER_DAY,
      capital: wasInClanForCapital
        ? {
            attacksUsed: context.capitalSeason?.attacksUsed ?? 0,
            attacksAvailable: context.capitalSeason?.attackLimit ?? DEFAULT_CAPITAL_ATTACK_LIMIT,
          }
        : null,
      clanGamesPoints: context.clanGamesPoints,
      donations:
        daysIntoSeason(context.now) < DONATIONS_GRACE_DAYS
          ? null
          : {
              donated: member.donations ?? 0,
              expected: context.rules.veteranMinDonationsPerSeason * seasonProgress(context.now),
            },
    },
    context.rules,
  );

  // Una puntuación en el tramo "Expulsar" también marca para expulsar,
  // aunque no salte ninguna de las dos reglas directas.
  const finalKick: KickEvaluation =
    !kick.shouldKick && index.band === "Expulsar" ? { shouldKick: true, reason: "low_score" } : kick;

  return { kick: finalKick, isVeteranCandidate: veteranCandidate, isColeaderCandidate: coleaderCandidate, index };
}
