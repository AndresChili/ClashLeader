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
