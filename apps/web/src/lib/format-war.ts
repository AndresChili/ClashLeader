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

/** "Actualizado hace X min" para la cabecera del Panel; el recolector corre cada 15 min, así que los minutos son la unidad útil. */
export function formatUpdatedAgo(lastCollectedAt: string | null, now: Date = new Date()): string {
  if (!lastCollectedAt) return "todavía sin datos del recolector";

  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(lastCollectedAt).getTime()) / 60_000));
  if (minutes < 1) return "actualizado justo ahora";
  if (minutes === 1) return "actualizado hace 1 min";
  if (minutes < 60) return `actualizado hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "actualizado hace 1 h" : `actualizado hace ${hours} h`;
}
