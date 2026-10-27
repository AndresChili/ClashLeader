"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const rulesSchema = z.object({
  clanId: z.guid(),
  kickInactivityDays: z.coerce.number().int().min(1).max(30),
  veteranMinMonths: z.coerce.number().int().min(1).max(24),
  veteranMinDonationsPerSeason: z.coerce.number().int().min(0).max(100_000),
  coleaderMinMonths: z.coerce.number().int().min(1).max(36),
  coleaderMinAttackUsagePct: z.coerce.number().int().min(0).max(100),
  coleaderMinDonationsPerSeason: z.coerce.number().int().min(0).max(100_000),
  indexWeightWar: z.coerce.number().int().min(0).max(100),
  indexWeightActivity: z.coerce.number().int().min(0).max(100),
  indexWeightCapital: z.coerce.number().int().min(0).max(100),
  indexWeightGames: z.coerce.number().int().min(0).max(100),
  indexWeightDonations: z.coerce.number().int().min(0).max(100),
  indexDonationsFullScore: z.coerce.number().int().min(1, "Las donaciones para la nota máxima tienen que ser al menos 1.").max(100_000),
}).refine(
  (r) => r.indexWeightWar + r.indexWeightActivity + r.indexWeightCapital + r.indexWeightGames + r.indexWeightDonations === 100,
  "Los pesos de la puntuación tienen que sumar 100.",
);

export interface RulesActionState {
  error: string | null;
  /** Lo que se envió, para volver a pintarlo tras un error: React vacía el formulario después de cada envío. */
  values?: Record<string, string>;
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
    indexWeightWar: formData.get("indexWeightWar"),
    indexWeightActivity: formData.get("indexWeightActivity"),
    indexWeightCapital: formData.get("indexWeightCapital"),
    indexWeightGames: formData.get("indexWeightGames"),
    indexWeightDonations: formData.get("indexWeightDonations"),
    indexDonationsFullScore: formData.get("indexDonationsFullScore"),
  });

  const values = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)]));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos.", values };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tienes que iniciar sesión.", values };

  const { error } = await supabase
    .from("clan_rules")
    .update({
      kick_inactivity_days: parsed.data.kickInactivityDays,
      veteran_min_days: parsed.data.veteranMinMonths * 30,
      veteran_min_donations_per_season: parsed.data.veteranMinDonationsPerSeason,
      coleader_min_days: parsed.data.coleaderMinMonths * 30,
      coleader_min_attack_usage_pct: parsed.data.coleaderMinAttackUsagePct,
      coleader_min_donations_per_season: parsed.data.coleaderMinDonationsPerSeason,
      index_weight_war: parsed.data.indexWeightWar,
      index_weight_activity: parsed.data.indexWeightActivity,
      index_weight_capital: parsed.data.indexWeightCapital,
      index_weight_games: parsed.data.indexWeightGames,
      index_weight_donations: parsed.data.indexWeightDonations,
      index_donations_full_score: parsed.data.indexDonationsFullScore,
      updated_by: user.id,
    })
    .eq("clan_id", parsed.data.clanId);

  if (error) {
    return { error: "No se pudo guardar. Solo el líder puede editar las reglas.", values };
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
