// No "server-only" guard needed: importing node:crypto already makes this
// impossible to bundle into a Client Component.
import { randomBytes, createHash } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, easier to type by hand
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

/** Only the hash is ever stored (clan_invites.code_hash) — the plaintext code is shown to the admin once and never saved. */
export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
