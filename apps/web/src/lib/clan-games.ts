/** Tope de puntos por jugador en unos Juegos del Clan (el mismo que usa la puntuación, ver packages/rules/src/index-score.ts). */
export const CLAN_GAMES_PLAYER_MAX = 10000;

/** Clave de la vista "total de todos los meses" en Juegos, junto a las de cada mes ("AAAA-MM"). */
export const CLAN_GAMES_TOTAL_VIEW = "total";

/** "2026-10" → "octubre de 2026". */
export function formatClanGamesSeason(seasonId: string): string {
  return new Date(`${seasonId}-01T00:00:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
}
