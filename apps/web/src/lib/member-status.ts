import type { IndexBand } from "@clashleader/rules";
import type { PillTone } from "@/components/ui/Pill";
import type { MemberEvaluation } from "@/lib/member-evaluation";

export interface MemberStatus {
  label: string;
  tone: PillTone;
}

export const BAND_TONES: Record<IndexBand, PillTone> = {
  Excelente: "band-excelente",
  Genial: "band-genial",
  Bien: "band-bien",
  Suficiente: "band-suficiente",
  Flojo: "band-flojo",
  "Muy flojo": "band-muy-flojo",
  Expulsar: "bad",
};

/**
 * Expulsar gana al tramo de la puntuación: un miembro sin ataques en la
 * última guerra o inactivo de más sale como Expulsar aunque su puntuación
 * sea buena.
 */
export function getMemberStatus(evaluation: Pick<MemberEvaluation, "kick" | "index">): MemberStatus {
  if (evaluation.kick.shouldKick) {
    return { label: "Expulsar", tone: "bad" };
  }
  return { label: evaluation.index.band, tone: BAND_TONES[evaluation.index.band] };
}

/** Motivo legible para las filas de "Para expulsar" del Panel; cadena vacía si no hay que expulsar. */
export function getKickReasonLabel(evaluation: Pick<MemberEvaluation, "kick" | "index">, kickInactivityDays: number): string {
  if (!evaluation.kick.shouldKick) return "";
  switch (evaluation.kick.reason) {
    case "inactivity":
      return `más de ${kickInactivityDays} días sin actividad detectada`;
    case "no_war_attacks":
      return "sin ataques en la última guerra";
    case "low_score":
      return `puntuación muy baja (${evaluation.index.score})`;
    default:
      return "";
  }
}
