/**
 * There is no Clan Games endpoint (see prompt's Datos section): the
 * "Games Champion" achievement only ever increases while a Clan Games
 * event is actually live (it's a lifetime point total, but points are
 * only awarded during the event), so a baseline taken at the start of a
 * tracking window and compared to the latest value correctly isolates
 * that window's points — without needing to know the real event calendar.
 *
 * The tracking window is "one UTC month" (reusing donation-season.ts's
 * seasonIdForDate), which comfortably contains exactly one Clan Games
 * event. See run-clan.ts for how this plugs into the collector loop.
 */
export function shouldOpenNewSeason(currentOpenSeasonId: string | null, currentSeasonId: string): boolean {
  return currentOpenSeasonId !== currentSeasonId;
}

export function computeClanGamesPoints(before: number, after: number): number {
  // The achievement value should never decrease, but never emit a
  // negative score if something odd happens upstream (e.g. a manual
  // in-game reset we don't know about).
  return Math.max(0, after - before);
}
