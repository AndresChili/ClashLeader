/**
 * La API nunca da "visto por última vez"; toda señal es indirecta:
 * cambios en el contador de donaciones (fase 2), más un ataque nuevo de
 * guerra o capital desde la última consulta (fase 4, vía hasNewAttacks —
 * comprobado en run-clan-war.ts/run-clan-capital.ts, que ya tienen a mano
 * los contadores de ataques antes/después de sus propios upserts).
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
    // Primera vez que vemos a este miembro: todavía no hay nada con qué comparar.
    return { donationsChanged: false, donationsReceivedChanged: false };
  }
  return {
    donationsChanged: current.donations !== previous.donations,
    donationsReceivedChanged: current.donationsReceived !== previous.donationsReceived,
  };
}

/** Apareció un ataque nuevo de guerra/capital desde la última consulta (previous undefined = primera vez que vemos a este miembro aquí). */
export function hasNewAttacks(previousCount: number | undefined, currentCount: number): boolean {
  return currentCount > (previousCount ?? 0);
}
