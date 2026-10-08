import type { SupabaseClient } from "@supabase/supabase-js";

export type CandidateType = "veteran" | "coleader";
export type DecisionStatus = "pending" | "approved" | "discarded";

export interface PromotionDecision {
  clanMemberId: string;
  candidateType: CandidateType;
  status: DecisionStatus;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decidedByName: string | null;
}

/** Keyed by `${clanMemberId}:${candidateType}`; absent entries are implicitly "pending" (no decision made yet). */
export async function getPromotionDecisions(
  supabase: SupabaseClient,
  clanMemberIds: string[],
): Promise<Map<string, PromotionDecision>> {
  const byKey = new Map<string, PromotionDecision>();
  if (clanMemberIds.length === 0) return byKey;

  const { data, error } = await supabase
    .from("promotion_decisions")
    .select("clan_member_id, candidate_type, status, decided_at, decided_by, profiles(display_name)")
    .in("clan_member_id", clanMemberIds);

  if (error) throw new Error(`Failed to load promotion decisions: ${error.message}`);

  for (const row of data) {
    const candidateType = row.candidate_type as CandidateType;
    const clanMemberId = row.clan_member_id as string;
    byKey.set(`${clanMemberId}:${candidateType}`, {
      clanMemberId,
      candidateType,
      status: row.status as DecisionStatus,
      decidedAt: row.decided_at as string | null,
      decidedByUserId: row.decided_by as string | null,
      decidedByName: ((row.profiles as unknown as { display_name: string } | null)?.display_name) ?? null,
    });
  }

  return byKey;
}
