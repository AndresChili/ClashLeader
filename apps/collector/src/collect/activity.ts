/**
 * La API nunca da "visto por última vez"; toda señal es indirecta:
 * cambios en el contador de donaciones (fase 2), logros del perfil que
 * suben (playerActivityScore, abajo), más un ataque nuevo de
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

/**
 * Logros del perfil que solo avanzan cuando el propio jugador juega:
 * atacar, saquear, quitar obstáculos, donar, desafíos de temporada,
 * capital. Se excluyen a propósito los que pueden moverse estando
 * desconectado (defensas ganadas) y los que se acreditan al terminar la
 * guerra (estrellas de guerra), que fecharían la actividad tarde.
 */
export const PLAYER_ACTIVITY_ACHIEVEMENTS: readonly string[] = [
  "Gold Grab",
  "Elixir Escapade",
  "Heroic Heist",
  "Conqueror",
  "Humiliator",
  "Un-Build It",
  "Nice and Tidy",
  "Friend in Need",
  "Sharing is caring",
  "Siege Sharer",
  "Well Seasoned",
  "Games Champion",
  "Aggressive Capitalism",
  "Most Valuable Clanmate",
];

/** Suma de los logros de PLAYER_ACTIVITY_ACHIEVEMENTS; todos son contadores que solo crecen, así que la suma también. */
export function playerActivityScore(achievements: { name: string; value: number }[]): number {
  return achievements
    .filter((a) => PLAYER_ACTIVITY_ACHIEVEMENTS.includes(a.name))
    .reduce((sum, a) => sum + a.value, 0);
}

/** previous null = primera vez que tenemos puntuación para este miembro: solo fija la referencia. */
export function hasNewPlayerActivity(previous: number | null, current: number): boolean {
  return previous !== null && current > previous;
}

/** Apareció un ataque nuevo de guerra/capital desde la última consulta (previous undefined = primera vez que vemos a este miembro aquí). */
export function hasNewAttacks(previousCount: number | undefined, currentCount: number): boolean {
  return currentCount > (previousCount ?? 0);
}
