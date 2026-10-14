import type { MemberRole } from "@/lib/data/members";

/** El rol "admin" de la API es "Veterano" dentro del juego. */
export const ROLE_LABELS: Record<MemberRole, string> = {
  member: "Miembro",
  admin: "Veterano",
  coLeader: "Colíder",
  leader: "Líder",
};
