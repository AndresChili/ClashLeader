export interface DonationCounts {
  donations: number;
  donationsReceived: number;
}

/**
 * Donations only ever go up within a season; a drop between two
 * consecutive polls is the only signal we get that a season reset
 * happened in between. When that happens, the *previous* poll's value was
 * the season's real total and must be saved before it's gone.
 */
export function didSeasonReset(previous: DonationCounts, current: DonationCounts): boolean {
  return current.donations < previous.donations || current.donationsReceived < previous.donationsReceived;
}

/**
 * Clash of Clans seasons don't line up with calendar months (they end on
 * the last Monday of the month), but we only need a stable, sortable label
 * for "which season was this", not the exact boundary — so the label is
 * approximate: the UTC year-month in which the reset was observed.
 */
export function seasonIdForDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
