function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export function formatRemainingTime(endTime: string | null, now: Date = new Date()): string | null {
  if (!endTime) return null;
  const ms = new Date(endTime).getTime() - now.getTime();
  if (ms <= 0) return null;
  return `Quedan ${formatDuration(ms)}`;
}

export interface WarPhase {
  label: "Preparación" | "En guerra" | "Terminada";
  /** "Empieza en 5 h 12 min" / "Quedan 3 h 10 min"; null si no hay hora. */
  countdown: string | null;
}

/**
 * Fase de la guerra a partir de las horas, no solo del state guardado: el
 * state es el de la última consulta del recolector y puede ir unos minutos
 * por detrás (p. ej. seguir en "preparation" cuando la guerra ya empezó).
 */
export function warPhase(
  war: { state: "preparation" | "inWar" | "warEnded"; startTime: string | null; endTime: string | null },
  now: Date = new Date(),
): WarPhase {
  const start = war.startTime ? new Date(war.startTime).getTime() : null;
  const end = war.endTime ? new Date(war.endTime).getTime() : null;
  const t = now.getTime();

  if (war.state === "warEnded" || (end !== null && t >= end)) return { label: "Terminada", countdown: null };
  if (start !== null && t < start) return { label: "Preparación", countdown: `Empieza en ${formatDuration(start - t)}` };
  if (start === null && war.state === "preparation") return { label: "Preparación", countdown: null };
  return { label: "En guerra", countdown: end !== null ? `Quedan ${formatDuration(end - t)}` : null };
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
