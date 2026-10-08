import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CLAN_RULES } from "@clashleader/rules";

export async function getKickInactivityDays(supabase: SupabaseClient, clanId: string): Promise<number> {
  const { data, error } = await supabase.from("clan_rules").select("kick_inactivity_days").eq("clan_id", clanId).single();

  if (error) {
    // clan_rules always has a row (created by a trigger when the clan was
    // inserted) so a read failure here means something's actually wrong;
    // fall back to the documented default rather than crashing the page.
    console.error(`Failed to load clan_rules for ${clanId}, using default:`, error.message);
    return DEFAULT_CLAN_RULES.kickInactivityDays;
  }

  return data.kick_inactivity_days as number;
}
