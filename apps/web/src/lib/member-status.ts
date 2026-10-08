import type { PillTone } from "@/components/ui/Pill";
import type { MemberSummary } from "@/lib/data/members";

export interface MemberStatus {
  label: string;
  tone: PillTone;
}

/**
 * The design's full status vocabulary (Cumple / Flojo / En riesgo /
 * Expulsar) comes from the weighted índice and the war-attendance rule,
 * neither of which exist until phases 4–5. Until then this only ever
 * returns "Expulsar" (the one rule phase 3 can actually compute) or an
 * honest "Sin datos" — never a guessed Cumple/Flojo.
 */
export function getMemberStatus(member: Pick<MemberSummary, "isInactive">): MemberStatus {
  if (member.isInactive) {
    return { label: "Expulsar", tone: "bad" };
  }
  return { label: "Sin datos", tone: "info" };
}
