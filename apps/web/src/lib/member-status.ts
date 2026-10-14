import type { PillTone } from "@/components/ui/Pill";
import type { MemberEvaluation } from "@/lib/member-evaluation";

export interface MemberStatus {
  label: string;
  tone: PillTone;
}

/**
 * Expulsar gana a En riesgo, que gana al veredicto del índice: un miembro
 * ya marcado para expulsar, o callado en la guerra en vivo, es una señal
 * más urgente que su estado general.
 */
export function getMemberStatus(evaluation: Pick<MemberEvaluation, "kick" | "atRisk" | "index">): MemberStatus {
  if (evaluation.kick.shouldKick) {
    return { label: "Expulsar", tone: "bad" };
  }
  if (evaluation.atRisk) {
    return { label: "En riesgo", tone: "warn" };
  }
  return evaluation.index.verdict === "Cumple"
    ? { label: "Cumple", tone: "good" }
    : { label: "Flojo", tone: "warn" };
}

/** Motivo legible para las filas de "Para expulsar" del Panel; cadena vacía si no aplica ninguna de las dos señales. */
export function getKickReasonLabel(evaluation: Pick<MemberEvaluation, "kick" | "atRisk">, kickInactivityDays: number): string {
  if (evaluation.kick.shouldKick) {
    return evaluation.kick.reason === "inactivity"
      ? `más de ${kickInactivityDays} días sin actividad detectada`
      : "sin ataques en la última guerra";
  }
  if (evaluation.atRisk) {
    return "todavía no ha atacado en la guerra en curso";
  }
  return "";
}
