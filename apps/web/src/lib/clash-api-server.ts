import "server-only";
import { ClashApiClient } from "@clashleader/clash-api";

/**
 * El alta de clanes necesita verificar el token de API del jugador dentro
 * del juego contra la API real de Clash of Clans, lo que requiere la
 * clave de desarrollador — la única excepción a "la clave solo vive en el
 * recolector", porque esta comprobación no puede pasar en ningún otro
 * sitio. El import de `server-only` convierte en error de build que esto
 * se cuele por accidente en un Client Component.
 */
export function createClashApiServerClient(): ClashApiClient {
  const baseUrl = process.env.CLASH_API_BASE_URL ?? "https://cocproxy.royaleapi.dev/v1";
  const token = process.env.CLASH_API_TOKEN;
  if (!token) {
    throw new Error("CLASH_API_TOKEN no está configurado.");
  }
  return new ClashApiClient({ baseUrl, token });
}
