"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const rulesSchema = z.object({
  clanId: z.string().uuid(),
  kickInactivityDays: z.coerce.number().int().min(1).max(30),
  veteranMinMonths: z.coerce.number().int().min(1).max(24),
  veteranMinDonationsPerSeason: z.coerce.number().int().min(0).max(100_000),
  coleaderMinMonths: z.coerce.number().int().min(1).max(36),
  coleaderMinAttackUsagePct: z.coerce.number().int().min(0).max(100),
  coleaderMinDonationsPerSeason: z.coerce.number().int().min(0).max(100_000),
});

export interface RulesActionState {
  error: string | null;
}

export async function updateClanRules(_prev: RulesActionState, formData: FormData): Promise<RulesActionState> {
  const parsed = rulesSchema.safeParse({
    clanId: formData.get("clanId"),
    kickInactivityDays: formData.get("kickInactivityDays"),
    veteranMinMonths: formData.get("veteranMinMonths"),
    veteranMinDonationsPerSeason: formData.get("veteranMinDonationsPerSeason"),
    coleaderMinMonths: formData.get("coleaderMinMonths"),
    coleaderMinAttackUsagePct: formData.get("coleaderMinAttackUsagePct"),
    coleaderMinDonationsPerSeason: formData.get("coleaderMinDonationsPerSeason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tienes que iniciar sesión." };

  const { error } = await supabase
    .from("clan_rules")
    .update({
      kick_inactivity_days: parsed.data.kickInactivityDays,
      veteran_min_days: parsed.data.veteranMinMonths * 30,
      veteran_min_donations_per_season: parsed.data.veteranMinDonationsPerSeason,
      coleader_min_days: parsed.data.coleaderMinMonths * 30,
      coleader_min_attack_usage_pct: parsed.data.coleaderMinAttackUsagePct,
      coleader_min_donations_per_season: parsed.data.coleaderMinDonationsPerSeason,
      updated_by: user.id,
    })
    .eq("clan_id", parsed.data.clanId);

  if (error) {
    return { error: "No se pudo guardar. Solo el líder puede editar las reglas." };
  }

  await supabase.from("audit_log").insert({
    clan_id: parsed.data.clanId,
    actor_id: user.id,
    action: "clan_rules_updated",
    target_type: "clan_rules",
    target_id: parsed.data.clanId,
  });

  revalidatePath("/reglas");
  return { error: null };
}
