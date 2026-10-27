import { activityScore } from "@clashleader/rules";

/** Tamaños de guerra que permite el juego. */
export const WAR_SIZES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;

/** Cuántos suplentes se sugieren detrás de los elegidos. */
const RESERVES = 5;

/** Reparto de la nota de guerra: lo que más pesa es que use sus ataques. */
const USAGE_WEIGHT = 0.45;
const STARS_WEIGHT = 0.25;
const ACTIVITY_WEIGHT = 0.3;
/** Sin guerras registradas no se le puede juzgar: nota neutra, por debajo de quien cumple. */
const NO_HISTORY_USAGE = 60;
const NO_HISTORY_STARS = 50;
/** Restan de la nota, pero no le dejan fuera: puede haber sido algo puntual. */
const MISSED_LAST_WAR_PENALTY = 25;
const FLAGGED_FOR_KICK_PENALTY = 15;
const LOW_USAGE_WARNING_PCT = 75;

export interface LineupCandidate {
  id: string;
  playerTag: string;
  name: string;
  townHallLevel: number | null;
  /** % de ataques usados en sus últimas 10 guerras en alineación; null si no ha estado en ninguna. */
  recentUsagePct: number | null;
  recentAvgStars: number | null;
  recentWars: number;
  daysSinceActivity: number;
  /** Estuvo en la última guerra terminada y no atacó. */
  missedLastWar: boolean;
  flaggedForKick: boolean;
}

export type LineupStatus = "recomendado" | "reserva" | "fuera";

export interface LineupPick extends LineupCandidate {
  /** 0 a 100: lo fiable que es para atacar en esta guerra. */
  score: number;
  status: LineupStatus;
  /** Lo que hay que saber de él al elegirle (o motivo por el que queda fuera). */
  notes: string[];
}

export interface LineupResult {
  /** En el orden sugerido para el mapa: los más fuertes arriba. */
  recommended: LineupPick[];
  reserves: LineupPick[];
  out: LineupPick[];
  /** Cuántos faltan para llenar el tamaño elegido con jugadores disponibles. */
  shortBy: number;
}

export function scoreCandidate(candidate: LineupCandidate, kickInactivityDays: number): { score: number; available: boolean; notes: string[] } {
  const notes: string[] = [];
  // Quien ya pasó el límite de inactividad de expulsión no va a atacar.
  const available = candidate.daysSinceActivity <= kickInactivityDays;
  if (!available) notes.push(`Sin actividad desde hace ${Math.floor(candidate.daysSinceActivity)} días`);

  const hasHistory = candidate.recentUsagePct != null;
  const usage = candidate.recentUsagePct ?? NO_HISTORY_USAGE;
  const stars = candidate.recentAvgStars != null ? (candidate.recentAvgStars / 3) * 100 : NO_HISTORY_STARS;
  const activity = activityScore(candidate.daysSinceActivity, kickInactivityDays);

  let score = USAGE_WEIGHT * usage + STARS_WEIGHT * stars + ACTIVITY_WEIGHT * activity;

  if (!hasHistory) notes.push("Sin guerras registradas");
  else if (usage < LOW_USAGE_WARNING_PCT) notes.push(`Usa solo el ${Math.round(usage)} % de sus ataques`);
  if (candidate.missedLastWar) {
    score -= MISSED_LAST_WAR_PENALTY;
    notes.push("No atacó en la última guerra");
  }
  if (candidate.flaggedForKick) {
    score -= FLAGGED_FOR_KICK_PENALTY;
    notes.push("Marcado para expulsar");
  }
  if (available && activity < 50) notes.push(`Poco activo (${Math.floor(candidate.daysSinceActivity)} días)`);

  return { score: Math.max(0, Math.min(100, Math.round(score))), available, notes };
}

/** Más ayuntamiento arriba; a igualdad, quien mete más estrellas. */
function byStrength(a: LineupPick, b: LineupPick): number {
  return (b.townHallLevel ?? 0) - (a.townHallLevel ?? 0) || (b.recentAvgStars ?? 0) - (a.recentAvgStars ?? 0) || b.score - a.score;
}

/**
 * Los size mejores para una guerra: se eligen por nota de guerra (que use
 * sus ataques, estrellas, actividad, sin fallos recientes) y se ordenan por
 * fuerza para el mapa. A igualdad de nota entra el de más ayuntamiento.
 */
export function recommendLineup(candidates: LineupCandidate[], size: number, kickInactivityDays: number): LineupResult {
  const scored = candidates.map((c) => {
    const { score, available, notes } = scoreCandidate(c, kickInactivityDays);
    return { pick: { ...c, score, notes, status: "fuera" as LineupStatus }, available };
  });

  const available = scored
    .filter((s) => s.available)
    .map((s) => s.pick)
    .sort((a, b) => b.score - a.score || (b.townHallLevel ?? 0) - (a.townHallLevel ?? 0) || a.name.localeCompare(b.name, "es"));

  const recommended = available.slice(0, size).map((p) => ({ ...p, status: "recomendado" as const })).sort(byStrength);
  const reserves = available.slice(size, size + RESERVES).map((p) => ({ ...p, status: "reserva" as const }));
  const out = [
    ...available.slice(size + RESERVES),
    ...scored.filter((s) => !s.available).map((s) => s.pick),
  ].sort((a, b) => b.score - a.score);

  return { recommended, reserves, out, shortBy: Math.max(0, size - recommended.length) };
}
