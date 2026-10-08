import { isInactiveBeyondThreshold } from "./inactivity";

export type KickReason = "inactivity" | "no_war_attacks";

export interface KickEvaluation {
  shouldKick: boolean;
  reason: KickReason | null;
}

export interface LastFinishedWarRoster {
  /** Was this member in the lineup for the most recently finished war? */
  wasRostered: boolean;
  attacksUsed: number;
}

/**
 * Expulsar: more than kickInactivityDays with no detected activity, OR
 * zero attacks in the most recently finished war despite being rostered
 * for it. Scoped to the *most recent* finished war (not "ever"), since
 * benching/no-showing an old war that's since been followed by normal
 * play isn't an actionable signal any more.
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
