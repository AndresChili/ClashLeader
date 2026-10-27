/** Tope de puntos por jugador en unos Juegos del Clan. */
export const CLAN_GAMES_PLAYER_MAX = 4000;

/** Puntos totales del clan para desbloquear cada nivel de recompensas. */
export const CLAN_GAMES_TIERS = [3000, 7500, 12000, 18000, 30000, 50000] as const;

export interface ClanGamesTierProgress {
  /** Niveles ya desbloqueados (0 a 6). */
  reached: number;
  /** Puntos que hacen falta en total para el siguiente nivel; null si ya están todos. */
  nextTarget: number | null;
}

export function clanGamesTierProgress(totalPoints: number): ClanGamesTierProgress {
  const reached = CLAN_GAMES_TIERS.filter((threshold) => totalPoints >= threshold).length;
  return { reached, nextTarget: CLAN_GAMES_TIERS[reached] ?? null };
}

/** "2026-10" → "octubre de 2026". */
export function formatClanGamesSeason(seasonId: string): string {
  return new Date(`${seasonId}-01T00:00:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
}
