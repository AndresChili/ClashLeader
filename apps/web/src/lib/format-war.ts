export function formatRemainingTime(endTime: string | null, now: Date = new Date()): string | null {
  if (!endTime) return null;
  const ms = new Date(endTime).getTime() - now.getTime();
  if (ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `Quedan ${hours} h ${minutes} min` : `Quedan ${minutes} min`;
}

export function formatScore(clanStars: number | null, opponentStars: number | null): string {
  if (clanStars == null || opponentStars == null) return "—";
  return `${clanStars} a ${opponentStars} estrellas`;
}

export function attacksAllowedFor(warType: "random" | "friendly" | "cwl"): number {
  return warType === "cwl" ? 1 : 2;
}
