import { describe, expect, it } from "vitest";
import { formatClanGamesSeason } from "./clan-games";

describe("formatClanGamesSeason", () => {
  it("pone el mes en español", () => {
    expect(formatClanGamesSeason("2026-10")).toBe("octubre de 2026");
  });
});
