import type {
  ClashApiCapitalRaidSeason,
  ClashApiClan,
  ClashApiCwlGroup,
  ClashApiPlayer,
  ClashApiVerifyTokenResult,
  ClashApiWar,
} from "./types";

export class ClashApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly tag: string,
  ) {
    super(message);
    this.name = "ClashApiError";
  }
}

/** Las tags de clan/jugador usan '#', que hay que codificar en la URL. */
export function encodeTag(tag: string): string {
  const withHash = tag.startsWith("#") ? tag : `#${tag}`;
  return encodeURIComponent(withHash);
}

export interface ClashApiClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export class ClashApiClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClashApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getClan(tag: string): Promise<ClashApiClan> {
    return this.get<ClashApiClan>(`/clans/${encodeTag(tag)}`, tag);
  }

  /** null si el clan no tiene registro de guerras, es privado, o todavía no hay tag de guerra. */
  async getCurrentWar(tag: string): Promise<ClashApiWar | null> {
    return this.getOrNull<ClashApiWar>(`/clans/${encodeTag(tag)}/currentwar`, tag);
  }

  /** null si el clan no está apuntado a Liga de Clanes ahora mismo. */
  async getWarLeagueGroup(tag: string): Promise<ClashApiCwlGroup | null> {
    return this.getOrNull<ClashApiCwlGroup>(`/clans/${encodeTag(tag)}/currentwar/leaguegroup`, tag);
  }

  async getCwlWar(warTag: string): Promise<ClashApiWar | null> {
    return this.getOrNull<ClashApiWar>(`/clanwarleagues/wars/${encodeTag(warTag)}`, warTag);
  }

  async getCapitalRaidSeasons(tag: string, limit = 1): Promise<ClashApiCapitalRaidSeason[]> {
    const result = await this.getOrNull<{ items: ClashApiCapitalRaidSeason[] }>(
      `/clans/${encodeTag(tag)}/capitalraidseasons?limit=${limit}`,
      tag,
    );
    return result?.items ?? [];
  }

  async getPlayer(tag: string): Promise<ClashApiPlayer | null> {
    return this.getOrNull<ClashApiPlayer>(`/players/${encodeTag(tag)}`, tag);
  }

  /**
   * Verifica el token de un solo uso que el jugador copia desde Ajustes
   * dentro del juego (no la clave de desarrollador con la que se autentica
   * este cliente). Confirmado contra el código fuente de clashofclans.js,
   * no solo su documentación — ver types.ts. Solo devuelve null en 403/404
   * (tag inválida); un status "invalid" por token incorrecto es una
   * respuesta 200 normal, no un error.
   */
  async verifyPlayerToken(tag: string, token: string): Promise<ClashApiVerifyTokenResult | null> {
    return this.getOrNull<ClashApiVerifyTokenResult>(`/players/${encodeTag(tag)}/verifytoken`, tag, {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  private async get<T>(path: string, tag: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new ClashApiError(`Clash API request to ${path} failed with ${response.status}`, response.status, tag);
    }

    return (await response.json()) as T;
  }

  /**
   * 403/404 son estados esperados, no errores, en varios de estos
   * endpoints (registro de guerra privado, sin guerra en curso, no está en
   * CWL) — quien llama trata "sin datos" y "no aplica ahora mismo" igual,
   * así que esto convierte ambos en null en vez de lanzar. Cualquier otro
   * status sigue siendo un error real y sigue lanzando.
   */
  private async getOrNull<T>(path: string, tag: string, init?: RequestInit): Promise<T | null> {
    try {
      return await this.get<T>(path, tag, init);
    } catch (error) {
      if (error instanceof ClashApiError && (error.status === 403 || error.status === 404)) {
        return null;
      }
      throw error;
    }
  }
}
