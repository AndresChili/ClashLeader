import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClashApiWar, ClashApiWarClan, WarState } from "@clashleader/clash-api";

export type DbWarState = "preparation" | "inWar" | "warEnded";

function toDbResult(ours: ClashApiWarClan, theirs: ClashApiWarClan, state: WarState): "win" | "lose" | "tie" | null {
  if (state !== "warEnded") return null;
  if (ours.stars !== theirs.stars) return ours.stars > theirs.stars ? "win" : "lose";
  if (ours.destructionPercentage !== theirs.destructionPercentage) {
    return ours.destructionPercentage > theirs.destructionPercentage ? "win" : "lose";
  }
  return "tie";
}

export interface UpsertWarInput {
  clanId: string;
  war: ClashApiWar;
  ours: ClashApiWarClan;
  theirs: ClashApiWarClan;
  warType: "random" | "cwl";
  /** La tag real de guerra de CWL, o null para una guerra normal/amistosa (ver warNaturalKey). */
  warTag: string | null;
  cwlGroupId: string | null;
}

/**
 * Las guerras de CWL tienen una tag real y estable de la API. Las
 * normales/amistosas no, así que se sintetiza una a partir de
 * preparation_start_time (estable durante toda la vida de esa guerra) —
 * así cada fila de guerra tiene siempre una clave natural única para el
 * constraint de 20261008193632_wars_upsert_keys.sql contra la que hacer
 * upsert.
 */
export function warNaturalKey(warTag: string | null, preparationStartTime: string | null): string {
  return warTag ?? `reg:${preparationStartTime}`;
}

/**
 * Una guerra, con upsert por su clave natural para que consultas
 * repetidas de la misma guerra actualicen una fila en vez de duplicarla.
 */
export async function upsertWar(supabase: SupabaseClient, input: UpsertWarInput): Promise<string> {
  const { war, ours, theirs } = input;

  const { data, error } = await supabase
    .from("wars")
    .upsert(
      {
        clan_id: input.clanId,
        cwl_group_id: input.cwlGroupId,
        war_type: input.warType,
        war_tag: warNaturalKey(input.warTag, war.preparationStartTime),
        state: war.state as DbWarState,
        team_size: war.teamSize,
        opponent_tag: theirs.tag,
        opponent_name: theirs.name,
        preparation_start_time: war.preparationStartTime,
        start_time: war.startTime,
        // La API siempre da endTime en preparation/inWar/warEnded: el fin
        // programado mientras la guerra está viva, el fin real cuando ya
        // terminó. Los dos sirven (una cuenta atrás en vivo necesita el
        // primero), así que se guarda siempre, no solo cuando termina.
        end_time: war.endTime,
        clan_stars: ours.stars,
        clan_destruction_pct: ours.destructionPercentage,
        clan_attacks_used: ours.attacks,
        opponent_stars: theirs.stars,
        opponent_destruction_pct: theirs.destructionPercentage,
        result: toDbResult(ours, theirs, war.state),
      },
      { onConflict: "clan_id,war_tag" },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to upsert war for clan ${input.clanId}: ${error.message}`);
  }

  return data.id as string;
}

/** Sirve para detectar "este miembro hizo un ataque nuevo desde la última consulta" (señal de actividad). */
export async function getAttacksUsedByTag(supabase: SupabaseClient, warId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("war_members").select("player_tag, attacks_used").eq("war_id", warId);
  if (error) {
    throw new Error(`Failed to load existing war roster for war ${warId}: ${error.message}`);
  }
  return new Map(data.map((row) => [row.player_tag as string, row.attacks_used as number]));
}

export async function upsertWarRoster(
  supabase: SupabaseClient,
  warId: string,
  ours: ClashApiWarClan,
  clanMemberIdByTag: Map<string, string>,
): Promise<void> {
  const rows = ours.members.map((member) => ({
    war_id: warId,
    clan_member_id: clanMemberIdByTag.get(member.tag) ?? null,
    player_tag: member.tag,
    player_name: member.name,
    map_position: member.mapPosition,
    town_hall_level: member.townhallLevel,
    attacks_used: member.attacks?.length ?? 0,
    // bestOpponentAttack es el mejor ataque del rival CONTRA este miembro
    // (defensa), no el mejor ataque ofensivo propio de este miembro.
    best_opponent_stars: member.bestOpponentAttack?.stars ?? 0,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("war_members").upsert(rows, { onConflict: "war_id,player_tag" });
  if (error) {
    throw new Error(`Failed to upsert war roster for war ${warId}: ${error.message}`);
  }
}

export async function upsertWarAttacks(supabase: SupabaseClient, warId: string, ours: ClashApiWarClan): Promise<void> {
  const rows = ours.members.flatMap(
    (member) =>
      member.attacks?.map((attack) => ({
        war_id: warId,
        player_tag: member.tag,
        attack_order: attack.order,
        stars: attack.stars,
        destruction_percentage: attack.destructionPercentage,
        defender_tag: attack.defenderTag,
      })) ?? [],
  );

  if (rows.length === 0) return;

  const { error } = await supabase.from("war_attacks").upsert(rows, { onConflict: "war_id,player_tag,attack_order" });
  if (error) {
    throw new Error(`Failed to upsert war attacks for war ${warId}: ${error.message}`);
  }
}

export async function upsertCwlGroup(
  supabase: SupabaseClient,
  clanId: string,
  season: string,
  state: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("cwl_groups")
    .upsert({ clan_id: clanId, season, state }, { onConflict: "clan_id,season" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to upsert CWL group for clan ${clanId}: ${error.message}`);
  }

  return data.id as string;
}

export async function findWarStateByTag(supabase: SupabaseClient, clanId: string, warTag: string): Promise<DbWarState | null> {
  const { data, error } = await supabase
    .from("wars")
    .select("state")
    .eq("clan_id", clanId)
    .eq("war_tag", warTag)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up war ${warTag}: ${error.message}`);
  }

  return (data?.state as DbWarState | undefined) ?? null;
}
