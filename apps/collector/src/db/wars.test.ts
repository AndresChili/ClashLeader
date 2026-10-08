import { describe, expect, it } from "vitest";
import { warNaturalKey } from "./wars";

describe("warNaturalKey", () => {
  it("uses the real tag for a CWL war", () => {
    expect(warNaturalKey("#CWL123", "2026-10-01T00:00:00Z")).toBe("#CWL123");
  });

  it("synthesizes a stable key from preparation_start_time for a regular war", () => {
    expect(warNaturalKey(null, "2026-10-01T00:00:00Z")).toBe("reg:2026-10-01T00:00:00Z");
  });
});
