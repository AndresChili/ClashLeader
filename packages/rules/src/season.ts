const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Hora UTC a la que termina la temporada de Clash of Clans. */
const SEASON_END_HOUR_UTC = 5;

/** Último lunes del mes (year, month 0-11) a las 05:00 UTC. */
function lastMondayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0, SEASON_END_HOUR_UTC));
  const daysBack = (lastDay.getUTCDay() + 6) % 7; // 0 si ya es lunes
  return new Date(lastDay.getTime() - daysBack * MS_PER_DAY);
}

/**
 * Inicio y fin de la temporada en curso: cada temporada termina el último
 * lunes del mes a las 05:00 UTC, que es cuando el juego reinicia las
 * donaciones.
 */
export function currentSeasonBounds(now: Date): { start: Date; end: Date } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const thisMonthEnd = lastMondayOfMonth(year, month);

  if (now < thisMonthEnd) {
    return { start: lastMondayOfMonth(year, month - 1), end: thisMonthEnd };
  }
  return { start: thisMonthEnd, end: lastMondayOfMonth(year, month + 1) };
}

/** Días completos desde que empezó la temporada en curso (con decimales). */
export function daysIntoSeason(now: Date): number {
  return (now.getTime() - currentSeasonBounds(now).start.getTime()) / MS_PER_DAY;
}

/** Fracción de la temporada en curso ya transcurrida, de 0 a 1. */
export function seasonProgress(now: Date): number {
  const { start, end } = currentSeasonBounds(now);
  return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
}
