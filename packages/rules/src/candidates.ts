import type { ClanRules } from "./types";

export interface VeteranCandidateInput {
  daysInClan: number;
  warsRostered: number;
  warsAttacked: number;
  donationsThisSeason: number;
}

/** Candidato a veterano: al menos 1 mes, atacó en todas sus guerras, donó 500+ por temporada. */
export function isVeteranCandidate(
  input: VeteranCandidateInput,
  rules: Pick<ClanRules, "veteranMinDays" | "veteranMinDonationsPerSeason">,
): boolean {
  const attackedEveryWar = input.warsRostered > 0 && input.warsAttacked === input.warsRostered;
  return input.daysInClan >= rules.veteranMinDays && attackedEveryWar && input.donationsThisSeason >= rules.veteranMinDonationsPerSeason;
}

export interface ColeaderCandidateInput {
  daysInClan: number;
  attackUsagePct: number | null;
  donationsThisSeason: number;
  /**
   * "Actividad casi diaria" has no exact definition in the data: the
   * collector only keeps the latest detected-activity timestamp, not a
   * day-by-day log (see README "Decisiones técnicas"). This is a
   * documented proxy — recent, consistent detection — computed by the
   * caller and passed in, so the rule itself stays a simple, testable gate.
   */
  nearDailyActivity: boolean;
}

/** Candidato a colíder: al menos 3 meses, usa 90%+ de sus ataques, dona 1000+ por temporada, casi a diario. */
export function isColeaderCandidate(
  input: ColeaderCandidateInput,
  rules: Pick<ClanRules, "coleaderMinDays" | "coleaderMinAttackUsagePct" | "coleaderMinDonationsPerSeason">,
): boolean {
  return (
    input.daysInClan >= rules.coleaderMinDays &&
    (input.attackUsagePct ?? 0) >= rules.coleaderMinAttackUsagePct &&
    input.donationsThisSeason >= rules.coleaderMinDonationsPerSeason &&
    input.nearDailyActivity
  );
}
