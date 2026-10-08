import type { SupabaseClient } from "@supabase/supabase-js";

export interface LeaderNote {
  id: string;
  note: string;
  createdAt: string;
  authorName: string;
}

export async function getLeaderNotes(supabase: SupabaseClient, clanMemberId: string): Promise<LeaderNote[]> {
  const { data, error } = await supabase
    .from("leader_notes")
    .select("id, note, created_at, profiles(display_name)")
    .eq("clan_member_id", clanMemberId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load leader notes: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id as string,
    note: row.note as string,
    createdAt: row.created_at as string,
    authorName: ((row.profiles as unknown as { display_name: string } | null)?.display_name) ?? "Líder",
  }));
}
