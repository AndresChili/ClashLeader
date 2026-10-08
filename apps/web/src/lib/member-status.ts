import type { PillTone } from "@/components/ui/Pill";
import type { MemberEvaluation } from "@/lib/member-evaluation";

export interface MemberStatus {
  label: string;
  tone: PillTone;
}

/**
 * Expulsar beats En riesgo beats the índice verdict: a member already
 * flagged for removal, or silent in the live war, is a more urgent signal
 * than their general standing.
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
