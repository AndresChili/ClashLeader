const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysInClan(member: { manualJoinDate: string | null; firstSeenAt: string }, now: Date = new Date()): number {
  const joined = new Date(member.manualJoinDate ?? member.firstSeenAt);
  return Math.max(0, Math.floor((now.getTime() - joined.getTime()) / MS_PER_DAY));
}

/** Always phrased as a detection, never a certainty — the API has no "last seen". */
export function formatLastActivity(lastActivityDetectedAt: string | null, now: Date = new Date()): string {
  if (!lastActivityDetectedAt) return "sin actividad detectada";

  const days = Math.floor((now.getTime() - new Date(lastActivityDetectedAt).getTime()) / MS_PER_DAY);
  if (days <= 0) return "actividad detectada hoy";
  if (days === 1) return "actividad detectada hace 1 día";
  return `actividad detectada hace ${days} días`;
}
