import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const baseEnv = {
  CLASH_API_TOKEN: "token",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

describe("loadConfig", () => {
  it("fills in the RoyaleAPI proxy default when CLASH_API_BASE_URL is unset", () => {
    const config = loadConfig(baseEnv);
    expect(config.CLASH_API_BASE_URL).toBe("https://cocproxy.royaleapi.dev/v1");
  });

  it("rejects a run with no API token", () => {
    expect(() => loadConfig({ ...baseEnv, CLASH_API_TOKEN: "" })).toThrow(/CLASH_API_TOKEN/);
  });

  it("defaults MAX_CLANS_PER_RUN and lets it be overridden", () => {
    expect(loadConfig(baseEnv).MAX_CLANS_PER_RUN).toBe(20);
    expect(loadConfig({ ...baseEnv, MAX_CLANS_PER_RUN: "5" }).MAX_CLANS_PER_RUN).toBe(5);
  });
});
