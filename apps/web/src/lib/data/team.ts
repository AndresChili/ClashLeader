import type { SupabaseClient } from "@supabase/supabase-js";

export interface TeamMember {
  userId: string;
  displayName: string;
  role: "admin" | "reader";
}

export async function getTeamMembers(supabase: SupabaseClient, clanId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("clan_access")
    .select("user_id, role, profiles(display_name)")
    .eq("clan_id", clanId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load team members: ${error.message}`);

  return data.map((row) => ({
    userId: row.user_id as string,
    role: row.role as "admin" | "reader",
    displayName: ((row.profiles as unknown as { display_name: string } | null)?.display_name) ?? "Sin nombre",
  }));
}

export interface PendingInvite {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export async function getPendingInvites(supabase: SupabaseClient, clanId: string): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from("clan_invites")
    .select("id, created_at, expires_at")
    .eq("clan_id", clanId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load pending invites: ${error.message}`);

  return data.map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  }));
}
