import { describe, expect, it, vi } from "vitest";
import { ClashApiClient, ClashApiError, encodeTag } from "./client";

describe("encodeTag", () => {
  it("percent-encodes the # whether or not the caller already included it", () => {
    expect(encodeTag("#2PP")).toBe("%232PP");
    expect(encodeTag("2PP")).toBe("%232PP");
  });
});

describe("ClashApiClient.getClan", () => {
  it("sends a bearer token and parses the clan response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag: "#2PP", name: "Test Clan", memberList: [] }),
    });

    const client = new ClashApiClient({
      baseUrl: "https://cocproxy.royaleapi.dev/v1",
      token: "secret-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const clan = await client.getClan("#2PP");

    expect(clan.name).toBe("Test Clan");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://cocproxy.royaleapi.dev/v1/clans/%232PP",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer secret-token" }) }),
    );
  });

  it("throws a ClashApiError with the status code on a non-2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const client = new ClashApiClient({
      baseUrl: "https://cocproxy.royaleapi.dev/v1",
      token: "secret-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getClan("#2PP")).rejects.toMatchObject({
      status: 404,
      tag: "#2PP",
    });
    await expect(client.getClan("#2PP")).rejects.toBeInstanceOf(ClashApiError);
  });
});

describe("ClashApiClient getOrNull-backed endpoints", () => {
  it("getCurrentWar returns null on 403 (private war log) instead of throwing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const client = new ClashApiClient({ baseUrl: "https://x", token: "t", fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.getCurrentWar("#2PP")).resolves.toBeNull();
  });

  it("getCurrentWar returns null on 404 (no war tag yet) instead of throwing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const client = new ClashApiClient({ baseUrl: "https://x", token: "t", fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.getCurrentWar("#2PP")).resolves.toBeNull();
  });

  it("still throws on an unexpected status like 500", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const client = new ClashApiClient({ baseUrl: "https://x", token: "t", fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.getCurrentWar("#2PP")).rejects.toBeInstanceOf(ClashApiError);
  });

  it("getCapitalRaidSeasons returns an empty array instead of null", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const client = new ClashApiClient({ baseUrl: "https://x", token: "t", fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.getCapitalRaidSeasons("#2PP")).resolves.toEqual([]);
  });

  it("getCapitalRaidSeasons unwraps the items array when present", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ state: "ended" }] }) });
    const client = new ClashApiClient({ baseUrl: "https://x", token: "t", fetchImpl: fetchImpl as unknown as typeof fetch });

    await expect(client.getCapitalRaidSeasons("#2PP")).resolves.toEqual([{ state: "ended" }]);
  });
});
