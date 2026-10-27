import { describe, expect, it } from "vitest";
import { clanGamesTierProgress, formatClanGamesSeason } from "./clan-games-tiers";

describe("clanGamesTierProgress", () => {
  it("sin puntos no hay ningún nivel y el siguiente es el primero", () => {
    expect(clanGamesTierProgress(0)).toEqual({ reached: 0, nextTarget: 3000 });
  });

  it("justo en un umbral cuenta como desbloqueado", () => {
    expect(clanGamesTierProgress(7500)).toEqual({ reached: 2, nextTarget: 12000 });
  });

  it("por encima del último nivel no hay siguiente", () => {
    expect(clanGamesTierProgress(64000)).toEqual({ reached: 6, nextTarget: null });
  });
});

describe("formatClanGamesSeason", () => {
  it("pone el mes en español", () => {
    expect(formatClanGamesSeason("2026-10")).toBe("octubre de 2026");
  });
});
