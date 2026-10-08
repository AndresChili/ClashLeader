/**
 * The API never reports "last seen"; every signal is indirect: donation
 * count changes (phase 2), plus a new war or capital attack appearing
 * since the last poll (phase 4, via hasNewAttacks — checked at the call
 * site in run-clan-war.ts/run-clan-capital.ts since those already have
 * the before/after attack counts on hand from their own upserts).
 */
export interface ActivitySignals {
  donationsChanged: boolean;
  donationsReceivedChanged: boolean;
}

export function hasDetectableActivity(signals: ActivitySignals): boolean {
  return Object.values(signals).some(Boolean);
}

export function donationActivitySignals(
  previous: { donations: number; donationsReceived: number } | undefined,
  current: { donations: number; donationsReceived: number },
): ActivitySignals {
  if (!previous) {
    // First time we see this member: nothing to compare against yet.
    return { donationsChanged: false, donationsReceivedChanged: false };
  }
  return {
    donationsChanged: current.donations !== previous.donations,
    donationsReceivedChanged: current.donationsReceived !== previous.donationsReceived,
  };
}

/** A new war/capital attack appeared since the last poll (undefined previous = first time seeing this member here). */
export function hasNewAttacks(previousCount: number | undefined, currentCount: number): boolean {
  return currentCount > (previousCount ?? 0);
}
