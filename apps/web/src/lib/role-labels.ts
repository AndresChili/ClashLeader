import type { MemberRole } from "@/lib/data/members";

/** The API's "admin" role is the in-game "Veterano" (see prompt's Datos section). */
export const ROLE_LABELS: Record<MemberRole, string> = {
  member: "Miembro",
  admin: "Veterano",
  coLeader: "Colíder",
  leader: "Líder",
};
