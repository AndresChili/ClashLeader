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

/** Clan/player tags use '#', which must be percent-encoded in the URL path. */
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

  /** null when the clan has no war log, its log is private, or no war tag exists yet. */
  async getCurrentWar(tag: string): Promise<ClashApiWar | null> {
    return this.getOrNull<ClashApiWar>(`/clans/${encodeTag(tag)}/currentwar`, tag);
  }

  /** null when the clan isn't currently signed up for Clan War League. */
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
   * Verifies the one-time API token a player copies from in-game Settings
   * (not the developer key this client itself authenticates with).
   * Confirmed against clashofclans.js's source, not just its docs — see
   * types.ts. Returns null only on 403/404 (bad tag); an "invalid" status
   * for a wrong token is a normal 200 response, not an error.
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
   * 403/404 are expected, non-error states for several of these endpoints
   * (private war log, no war in progress, not in CWL) — callers treat
   * "no data" and "not applicable right now" the same way, so this turns
   * both into null instead of throwing. Any other status is still a real
   * error and still throws.
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
