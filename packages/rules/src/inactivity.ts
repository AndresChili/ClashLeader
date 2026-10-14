const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Solo la mitad de inactividad de la regla "Expulsar" — "más de
 * kickInactivityDays días sin actividad detectada". La otra mitad ("una
 * guerra terminada sin ningún ataque estando en la alineación") necesita
 * datos de guerra que no existían hasta la fase 4, así que no estaba en
 * este paquete al principio; ver README "Fases".
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
