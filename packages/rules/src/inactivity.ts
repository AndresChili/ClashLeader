const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Only the inactivity half of the "Expulsar" rule — "más de
 * kickInactivityDays días sin actividad detectada". The other half ("una
 * guerra terminada sin ningún ataque estando en la alineación") needs war
 * data that doesn't exist until phase 4, so it isn't in this package yet;
 * see README "Fases".
 */
export function daysSinceLastActivity(params: {
  lastActivityDetectedAt: Date | null;
  firstSeenAt: Date;
  now: Date;
}): number {
  const reference = params.lastActivityDetectedAt ?? params.firstSeenAt;
  const elapsedMs = params.now.getTime() - reference.getTime();
  return Math.max(0, elapsedMs / MS_PER_DAY);
}

export function isInactiveBeyondThreshold(params: {
  lastActivityDetectedAt: Date | null;
  firstSeenAt: Date;
  now: Date;
  kickInactivityDays: number;
}): boolean {
  return daysSinceLastActivity(params) > params.kickInactivityDays;
}
