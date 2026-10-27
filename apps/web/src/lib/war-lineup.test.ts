import { describe, expect, it } from "vitest";
import { recommendLineup, scoreCandidate, type LineupCandidate } from "./war-lineup";

const KICK_DAYS = 3;

function candidate(overrides: Partial<LineupCandidate> = {}): LineupCandidate {
  return {
    id: overrides.name ?? "id",
    playerTag: `#${overrides.name ?? "P"}`,
    name: "P",
    townHallLevel: 15,
    recentUsagePct: 100,
    recentAvgStars: 2.5,
    recentWars: 10,
    daysSinceActivity: 0,
    missedLastWar: false,
    flaggedForKick: false,
    ...overrides,
  };
}

describe("scoreCandidate", () => {
  it("da casi la máxima a quien usa todo, mete estrellas y está activo", () => {
    expect(scoreCandidate(candidate(), KICK_DAYS).score).toBe(96);
  });

  it("deja fuera a quien pasó el límite de inactividad", () => {
    const result = scoreCandidate(candidate({ daysSinceActivity: 5 }), KICK_DAYS);
    expect(result.available).toBe(false);
    expect(result.notes[0]).toMatch(/Sin actividad/);
  });

  it("resta a quien no atacó en la última guerra y lo avisa", () => {
    const fine = scoreCandidate(candidate(), KICK_DAYS).score;
    const missed = scoreCandidate(candidate({ missedLastWar: true }), KICK_DAYS);
    expect(missed.score).toBe(fine - 25);
    expect(missed.notes).toContain("No atacó en la última guerra");
  });

  it("a quien no tiene guerras le pone una nota neutra, por debajo de quien cumple", () => {
    const newcomer = scoreCandidate(candidate({ recentUsagePct: null, recentAvgStars: null, recentWars: 0 }), KICK_DAYS);
    expect(newcomer.score).toBeLessThan(scoreCandidate(candidate(), KICK_DAYS).score);
    expect(newcomer.notes).toContain("Sin guerras registradas");
  });
});

describe("recommendLineup", () => {
  it("elige a los de mejor nota y los ordena por ayuntamiento para el mapa", () => {
    const result = recommendLineup(
      [
        candidate({ name: "Fiable12", townHallLevel: 12 }),
        candidate({ name: "Fiable16", townHallLevel: 16 }),
        candidate({ name: "Fallon", townHallLevel: 17, recentUsagePct: 20 }),
      ],
      2,
      KICK_DAYS,
    );
    expect(result.recommended.map((p) => p.name)).toEqual(["Fiable16", "Fiable12"]);
    expect(result.reserves.map((p) => p.name)).toEqual(["Fallon"]);
    expect(result.shortBy).toBe(0);
  });

  it("avisa cuando no hay bastantes disponibles y manda a los inactivos fuera", () => {
    const result = recommendLineup([candidate({ name: "A" }), candidate({ name: "Inactivo", daysSinceActivity: 10 })], 5, KICK_DAYS);
    expect(result.recommended).toHaveLength(1);
    expect(result.out.map((p) => p.name)).toEqual(["Inactivo"]);
    expect(result.shortBy).toBe(4);
  });
});
