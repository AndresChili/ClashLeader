import type { SupabaseClient } from "@supabase/supabase-js";

export interface DonationSeasonTotalInput {
  clanMemberId: string;
  seasonId: string;
  donations: number;
  donationsReceived: number;
}

/**
 * Idempotente: si el recolector detecta el mismo reinicio dos veces (por
 * ejemplo, una ejecución reintentada), la segunda escritura simplemente
 * sobrescribe con el mismo total congelado en vez de dar error o duplicar.
 */
export async function upsertDonationSeasonTotal(supabase: SupabaseClient, input: DonationSeasonTotalInput): Promise<void> {
  const { error } = await supabase.from("donation_season_totals").upsert(
    {
      clan_member_id: input.clanMemberId,
      season_id: input.seasonId,
      donations: input.donations,
      donations_received: input.donationsReceived,
    },
    { onConflict: "clan_member_id,season_id" },
  );

  if (error) {
    throw new Error(`Failed to save donation season total for member ${input.clanMemberId}: ${error.message}`);
  }
}
