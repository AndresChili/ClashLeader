import "server-only";
import { ClashApiClient } from "@clashleader/clash-api";

/**
 * Clan registration needs to verify a player's in-game API token against
 * the real Clash of Clans API, which needs the developer key — the one
 * exception to "the key only lives in the collector" (see SETUP.md and
 * docs/threat-model.md), because this check cannot happen anywhere else.
 * The `server-only` import makes it a build error to pull this into a
 * Client Component by accident.
 */
export function createClashApiServerClient(): ClashApiClient {
  const baseUrl = process.env.CLASH_API_BASE_URL ?? "https://cocproxy.royaleapi.dev/v1";
  const token = process.env.CLASH_API_TOKEN;
  if (!token) {
    throw new Error("CLASH_API_TOKEN is not configured. See SETUP.md.");
  }
  return new ClashApiClient({ baseUrl, token });
}
