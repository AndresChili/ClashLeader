import { isInactiveBeyondThreshold } from "./inactivity";

export type KickReason = "inactivity" | "no_war_attacks";

export interface KickEvaluation {
  shouldKick: boolean;
  reason: KickReason | null;
}

export interface LastFinishedWarRoster {
  /** ¿Estaba este miembro en la alineación de la guerra terminada más reciente? */
  wasRostered: boolean;
  attacksUsed: number;
}

/**
 * Expulsar: más de kickInactivityDays sin actividad detectada, O cero
 * ataques en la guerra terminada más reciente pese a estar en la
 * alineación. Se mira solo la guerra terminada *más reciente* (no
 * "siempre"), porque faltar a una guerra antigua seguida de juego normal
 * ya no es una señal sobre la que actuar.
 */
export function evaluateKick(params: {
  lastActivityDetectedAt: Date | null;
  firstSeenAt: Date;
  now: Date;
  kickInactivityDays: number;
  lastFinishedWar: LastFinishedWarRoster | null;
}): KickEvaluation {
  if (isInactiveBeyondThreshold(params)) {
    return { shouldKick: true, reason: "inactivity" };
  }

  if (params.lastFinishedWar?.wasRostered && params.lastFinishedWar.attacksUsed === 0) {
    return { shouldKick: true, reason: "no_war_attacks" };
  }

  return { shouldKick: false, reason: null };
}
