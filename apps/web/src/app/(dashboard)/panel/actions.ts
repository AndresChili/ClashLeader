"use server";

import { z } from "zod";
import { getMovements, type MovementsPage } from "@/lib/data/members";
import { createClient } from "@/lib/supabase/server";
import { MOVEMENTS_PAGE_SIZE } from "./movements-config";

const schema = z.object({ clanId: z.guid(), page: z.number().int().min(0).max(10_000) });

/** Una página de "Movimientos" para las flechas del Panel. RLS limita la consulta a clanes del usuario. */
export async function loadMovementsPage(clanId: string, page: number): Promise<MovementsPage> {
  const parsed = schema.parse({ clanId, page });
  const supabase = await createClient();
  return getMovements(supabase, parsed.clanId, parsed.page, MOVEMENTS_PAGE_SIZE);
}
