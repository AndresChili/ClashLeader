import { describe, expect, it } from "vitest";
import { DEFAULT_CLAN_RULES } from "./types";
import { activityScore, computeIndex, indexBand, type IndexInputs } from "./index-score";

const allMaxed: IndexInputs = {
  war: { usagePct: 100, avgStars: 3 },
  daysSinceActivity: 0,
  capital: { attacksUsed: 6, attacksAvailable: 6 },
  clanGamesPoints: 10_000,
  donations: { donated: 500, expected: 250 },
};

describe("computeIndex", () => {
  it("scores 100 when every part is maxed out", () => {
    expect(computeIndex(allMaxed, DEFAULT_CLAN_RULES)).toEqual({
      score: 100,
      band: "Excelente",
      breakdown: { war: 100, activity: 100, capital: 100, games: 100, donations: 100 },
    });
  });

  it("does not penalise a member who was never in a war lineup", () => {
    const result = computeIndex({ ...allMaxed, war: null }, DEFAULT_CLAN_RULES);
    expect(result.score).toBe(100);
    expect(result.breakdown.war).toBeNull();
  });

  it("leaves out every part that does not apply, scoring on activity alone if needed", () => {
    const result = computeIndex(
      { war: null, daysSinceActivity: 0, capital: null, clanGamesPoints: null, donations: null },
      DEFAULT_CLAN_RULES,
    );
    expect(result.score).toBe(100);
  });

  it("weighs war attacks 70/30 between usage and stars", () => {
    const result = computeIndex(
      { war: { usagePct: 100, avgStars: 0 }, daysSinceActivity: 0, capital: null, clanGamesPoints: null, donations: null },
      { ...DEFAULT_CLAN_RULES, indexWeightActivity: 0, indexWeightWar: 100 },
    );
    expect(result.breakdown.war).toBe(70);
  });

  it("maps clan games points straight to the score: 9400 points is a 94", () => {
    expect(computeIndex({ ...allMaxed, clanGamesPoints: 9400 }, DEFAULT_CLAN_RULES).breakdown.games).toBe(94);
    expect(computeIndex({ ...allMaxed, clanGamesPoints: 12_000 }, DEFAULT_CLAN_RULES).breakdown.games).toBe(100);
  });

  it("uses the clan weights over the parts that apply", () => {
    // Guerra 50 (peso 45) y actividad 100 (peso 25); el resto no aplica.
    const result = computeIndex(
      { war: { usagePct: 50, avgStars: 1.5 }, daysSinceActivity: 0, capital: null, clanGamesPoints: null, donations: null },
      DEFAULT_CLAN_RULES,
    );
    expect(result.score).toBe(Math.round((50 * 45 + 100 * 25) / 70));
  });
});

describe("activityScore", () => {
  it("is 100 within the first day and drops to 0 at the kick threshold", () => {
    expect(activityScore(0.5, 3)).toBe(100);
    expect(Math.round(activityScore(2, 3))).toBe(67);
    expect(Math.round(activityScore(3, 3))).toBe(33);
    expect(activityScore(4, 3)).toBe(0);
  });
});

describe("indexBand", () => {
  it.each([
    [100, "Excelente"],
    [85, "Excelente"],
    [84, "Genial"],
    [70, "Genial"],
    [60, "Bien"],
    [50, "Suficiente"],
    [30, "Flojo"],
    [20, "Muy flojo"],
    [19, "Expulsar"],
    [0, "Expulsar"],
  ] as const)("%i is %s", (score, band) => {
    expect(indexBand(score)).toBe(band);
  });
});
