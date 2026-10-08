"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const decisionSchema = z.object({
  clanMemberId: z.string().uuid(),
  candidateType: z.enum(["veteran", "coleader"]),
  clanId: z.string().uuid(),
});

export type CandidateDecisionInput = z.infer<typeof decisionSchema>;
type DecisionInput = CandidateDecisionInput;

async function recordDecision(input: DecisionInput, status: "approved" | "discarded" | "pending", auditAction: string) {
  const parsed = decisionSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tienes que iniciar sesión." };

  // RLS (promotion_decisions_insert_admin / _update_admin) is the real
  // gate; this just turns a denied write into a clear message.
  const { error } = await supabase.from("promotion_decisions").upsert(
    {
      clan_member_id: parsed.clanMemberId,
      candidate_type: parsed.candidateType,
      status,
      decided_by: status === "pending" ? null : user.id,
      decided_at: status === "pending" ? null : new Date().toISOString(),
    },
    { onConflict: "clan_member_id,candidate_type" },
  );

  if (error) {
    return { error: "No se pudo guardar la decisión. Solo el líder puede decidir ascensos." };
  }

  await supabase.from("audit_log").insert({
    clan_id: parsed.clanId,
    actor_id: user.id,
    action: auditAction,
    target_type: "promotion_decision",
    target_id: `${parsed.clanMemberId}:${parsed.candidateType}`,
  });

  revalidatePath("/ascensos");
  return { error: null };
}

export async function approveCandidate(input: DecisionInput) {
  return recordDecision(input, "approved", "promotion_approved");
}

export async function discardCandidate(input: DecisionInput) {
  return recordDecision(input, "discarded", "promotion_discarded");
}

export async function undoDecision(input: DecisionInput) {
  return recordDecision(input, "pending", "promotion_undone");
}
