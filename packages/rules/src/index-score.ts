import type { ClanRules } from "./types";

/**
 * El encargo fija los cuatro *pesos* de categoría (y los hace editables vía
 * clan_rules), pero no define cómo convertir cada estadística cruda en un
 * sub-score de 0 a 100 — esa conversión es una decisión de diseño de este
 * archivo, documentada aquí en vez de escondida en números mágicos:
 *
 * - Guerra: mitad % de ataques usados, mitad media de estrellas (sobre el
 *   máximo de 3 que puede dar un solo ataque).
 * - Donaciones: donaciones de la temporada frente al propio umbral
 *   editable de colíder como "nota máxima" — reutiliza un umbral ya
 *   existente en vez de inventar uno nuevo.
 * - Capital: ataques de capital usados esta temporada frente a los
 *   disponibles (% de uso, misma idea que guerra).
 * - Juegos: puntos de esta temporada frente al tope clásico de un solo
 *   evento.
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
