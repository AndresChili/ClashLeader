import type { SupabaseClient } from "@supabase/supabase-js";

export interface MembershipEventInput {
  clanId: string;
  clanMemberId: string | null;
  playerTag: string;
  playerName: string;
  eventType: "joined" | "left";
}

export async function insertMembershipEvents(supabase: SupabaseClient, events: MembershipEventInput[]): Promise<void> {
  if (events.length === 0) return;

  const { error } = await supabase.from("membership_events").insert(
    events.map((event) => ({
      clan_id: event.clanId,
      clan_member_id: event.clanMemberId,
      player_tag: event.playerTag,
      player_name: event.playerName,
      event_type: event.eventType,
    })),
  );

  if (error) {
    throw new Error(`Failed to insert membership events: ${error.message}`);
  }
}
