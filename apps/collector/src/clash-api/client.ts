import type { ClashApiClan } from "./types";

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

  private async get<T>(path: string, tag: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new ClashApiError(`Clash API request to ${path} failed with ${response.status}`, response.status, tag);
    }

    return (await response.json()) as T;
  }
}
