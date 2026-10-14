/**
 * No hay endpoint de Juegos del Clan: el logro "Games Champion" solo sube
 * mientras un evento de Juegos del Clan está activo de verdad (es un
 * contador de puntos acumulado de por vida, pero solo se dan puntos
 * durante el evento), así que una base tomada al abrir una ventana de
 * seguimiento y comparada con el valor más reciente aísla correctamente
 * los puntos de esa ventana — sin necesitar conocer el calendario real
 * del evento.
 *
 * La ventana de seguimiento es "un mes UTC" (reutiliza seasonIdForDate de
 * donation-season.ts), que contiene cómodamente un único evento de Juegos
 * del Clan. Ver run-clan.ts para cómo encaja esto en el bucle del
 * recolector.
 */
export function shouldOpenNewSeason(currentOpenSeasonId: string | null, currentSeasonId: string): boolean {
  return currentOpenSeasonId !== currentSeasonId;
}

export function computeClanGamesPoints(before: number, after: number): number {
  // El valor del logro nunca debería bajar, pero nunca se emite un
  // puntaje negativo si algo raro pasa aguas arriba (por ejemplo, un
  // reinicio manual dentro del juego que no conocemos).
  return Math.max(0, after - before);
}
