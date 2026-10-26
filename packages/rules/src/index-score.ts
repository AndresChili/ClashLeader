import type { ClanRules } from "./types";

/**
 * Puntuación de 0 a 100 de cada miembro. Cada parte da una nota de 0 a 100
 * y la puntuación es su media ponderada con los pesos de clan_rules, pero
 * solo con las partes que se le pueden exigir al jugador ahora mismo: una
 * parte que no aplica (null en la entrada) no resta, sale de la media y su
 * peso se reparte entre las demás.
 *
 * - Guerra: solo las guerras en las que estuvo en la alineación (las
 *   últimas 10). 70 % ataques usados, 30 % estrellas por ataque sobre 3.
 *   No cuenta si no ha estado en ninguna: quien se pone fuera de guerra
 *   (p. ej. mejorando héroes) no queda penalizado.
 * - Actividad: 100 si hay actividad detectada en el último día y baja en
 *   línea recta hasta 0 cuando se alcanza el límite de inactividad de
 *   expulsión (kickInactivityDays días después). Siempre cuenta.
 * - Capital: ataques usados frente a disponibles en el último fin de
 *   semana de asaltos terminado. No cuenta si entró después.
 * - Juegos: puntos / 100 (10 000 puntos = 100, 9400 = 94). No cuenta
 *   mientras los Juegos de esta temporada no hayan empezado.
 * - Donaciones: frente al objetivo de veterano repartido a lo largo de la
 *   temporada (a mitad de temporada se espera la mitad). No cuenta los
 *   primeros días de temporada, cuando todo el mundo está a cero.
 */
const MAX_STARS_PER_ATTACK = 3;
const WAR_USAGE_SHARE = 0.7;
const CLAN_GAMES_FULL_SCORE_POINTS = 10_000;

export interface IndexInputs {
  /** null = no ha estado en ninguna alineación reciente: guerra no cuenta. */
  war: { usagePct: number; avgStars: number | null } | null;
  daysSinceActivity: number;
  /** null = no aplica (entró después del último fin de semana de asaltos, o no hay ninguno registrado). */
  capital: { attacksUsed: number; attacksAvailable: number } | null;
  /** null = los Juegos de esta temporada no han empezado. */
  clanGamesPoints: number | null;
  /** null = primeros días de temporada. expected = donaciones esperadas a estas alturas. */
  donations: { donated: number; expected: number } | null;
}

export interface IndexBreakdown {
  war: number | null;
  activity: number;
  capital: number | null;
  games: number | null;
  donations: number | null;
}

export type IndexBand = "Excelente" | "Genial" | "Bien" | "Suficiente" | "Flojo" | "Muy flojo" | "Expulsar";

export interface IndexResult {
  score: number;
  band: IndexBand;
  breakdown: IndexBreakdown;
}

const BANDS: { min: number; band: IndexBand }[] = [
  { min: 85, band: "Excelente" },
  { min: 70, band: "Genial" },
  { min: 60, band: "Bien" },
  { min: 50, band: "Suficiente" },
  { min: 30, band: "Flojo" },
  { min: 20, band: "Muy flojo" },
];

export function indexBand(score: number): IndexBand {
  return BANDS.find((b) => score >= b.min)?.band ?? "Expulsar";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function activityScore(daysSinceActivity: number, kickInactivityDays: number): number {
  const overdueDays = Math.max(0, daysSinceActivity - 1);
  return clampScore(100 * (1 - overdueDays / kickInactivityDays));
}

export function computeIndex(
  inputs: IndexInputs,
  rules: Pick<
    ClanRules,
    | "indexWeightWar"
    | "indexWeightActivity"
    | "indexWeightDonations"
    | "indexWeightCapital"
    | "indexWeightGames"
    | "kickInactivityDays"
  >,
): IndexResult {
  const war = inputs.war
    ? clampScore(
        WAR_USAGE_SHARE * inputs.war.usagePct +
          (1 - WAR_USAGE_SHARE) * ((inputs.war.avgStars ?? 0) / MAX_STARS_PER_ATTACK) * 100,
      )
    : null;

  const activity = activityScore(inputs.daysSinceActivity, rules.kickInactivityDays);

  const capital =
    inputs.capital && inputs.capital.attacksAvailable > 0
      ? clampScore((inputs.capital.attacksUsed / inputs.capital.attacksAvailable) * 100)
      : null;

  const games = inputs.clanGamesPoints == null ? null : clampScore((inputs.clanGamesPoints / CLAN_GAMES_FULL_SCORE_POINTS) * 100);

  const donations =
    inputs.donations == null
      ? null
      : inputs.donations.expected <= 0
        ? 100
        : clampScore((inputs.donations.donated / inputs.donations.expected) * 100);

  const parts: [number | null, number][] = [
    [war, rules.indexWeightWar],
    [activity, rules.indexWeightActivity],
    [capital, rules.indexWeightCapital],
    [games, rules.indexWeightGames],
    [donations, rules.indexWeightDonations],
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [value, weight] of parts) {
    if (value == null) continue;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const round = (value: number | null) => (value == null ? null : Math.round(value));

  return {
    score,
    band: indexBand(score),
    breakdown: {
      war: round(war),
      activity: Math.round(activity),
      capital: round(capital),
      games: round(games),
      donations: round(donations),
    },
  };
}
