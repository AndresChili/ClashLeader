// No hace falta guarda "server-only": importar node:crypto ya hace
// imposible empaquetar esto en un Client Component.
import { randomBytes, createHash } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I, más fácil de escribir a mano
const CODE_LENGTH = 10;
export const INVITE_EXPIRY_DAYS = 7;

export function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

/** Solo se guarda el hash (clan_invites.code_hash) — el código en texto plano se le muestra al admin una vez y nunca se guarda. */
export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
