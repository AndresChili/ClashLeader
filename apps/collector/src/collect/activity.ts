/**
 * The API never reports "last seen"; every signal is indirect. Phase 2
 * only has donation counts to compare between polls. Later phases (war
 * attacks, capital attacks) add more signals here — the shape stays
 * open-ended on purpose so adding one is a new key, not a rewrite.
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
