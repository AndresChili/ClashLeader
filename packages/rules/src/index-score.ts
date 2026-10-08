import type { ClanRules } from "./types";

/**
 * The spec fixes the four category *weights* (and makes them editable via
 * clan_rules), but doesn't define how each raw stat maps to a 0–100
 * sub-score — that mapping is this file's own design decision, documented
 * here rather than hidden in magic numbers:
 *
 * - Guerra: half attack-usage%, half average stars (out of the max 3 a
 *   single attack can earn).
 * - Donaciones: donations this season against the clan's own colíder
 *   donation threshold as "full marks" — reuses an existing editable
 *   threshold instead of inventing a new one.
 * - Capital: capital attacks used this season against the attacks
 *   available (usage%, same idea as guerra).
 * - Juegos: points this season against the classic single-event cap.
 */
const MAX_STARS_PER_ATTACK = 3;
const CLAN_GAMES_FULL_SCORE_POINTS = 4000;

export interface IndexInputs {
  warUsagePct: number | null;
  warAvgStars: number | null;
  donationsThisSeason: number | null;
  capitalAttacksUsed: number | null;
  capitalAttacksAvailable: number | null;
  clanGamesPoints: number | null;
}

export interface IndexBreakdown {
  war: number;
  donations: number;
  capital: number;
  games: number;
}

export interface IndexResult {
  score: number;
  verdict: "Cumple" | "Flojo";
  breakdown: IndexBreakdown;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function computeIndex(
  inputs: IndexInputs,
  rules: Pick<
    ClanRules,
    "indexWeightWar" | "indexWeightDonations" | "indexWeightCapital" | "indexWeightGames" | "indexPassThreshold" | "coleaderMinDonationsPerSeason"
  >,
): IndexResult {
  const war =
    inputs.warUsagePct == null && inputs.warAvgStars == null
      ? 0
      : clampScore(0.5 * (inputs.warUsagePct ?? 0) + 0.5 * ((inputs.warAvgStars ?? 0) / MAX_STARS_PER_ATTACK) * 100);

  const donations = clampScore(((inputs.donationsThisSeason ?? 0) / rules.coleaderMinDonationsPerSeason) * 100);

  const capital = !inputs.capitalAttacksAvailable
    ? 0
    : clampScore(((inputs.capitalAttacksUsed ?? 0) / inputs.capitalAttacksAvailable) * 100);

  const games = clampScore(((inputs.clanGamesPoints ?? 0) / CLAN_GAMES_FULL_SCORE_POINTS) * 100);

  const weightedSum =
    war * rules.indexWeightWar + donations * rules.indexWeightDonations + capital * rules.indexWeightCapital + games * rules.indexWeightGames;

  const score = Math.round(weightedSum / 100);

  return {
    score,
    verdict: score >= rules.indexPassThreshold ? "Cumple" : "Flojo",
    breakdown: {
      war: Math.round(war),
      donations: Math.round(donations),
      capital: Math.round(capital),
      games: Math.round(games),
    },
  };
}
