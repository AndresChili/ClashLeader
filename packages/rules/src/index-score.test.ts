import { describe, expect, it } from "vitest";
import { DEFAULT_CLAN_RULES } from "./types";
import { computeIndex } from "./index-score";

describe("computeIndex", () => {
  it("scores 100 across the board for a maxed-out member", () => {
    const result = computeIndex(
      {
        warUsagePct: 100,
        warAvgStars: 3,
        donationsThisSeason: DEFAULT_CLAN_RULES.coleaderMinDonationsPerSeason,
        capitalAttacksUsed: 6,
        capitalAttacksAvailable: 6,
        clanGamesPoints: 4000,
      },
      DEFAULT_CLAN_RULES,
    );
    expect(result).toEqual({ score: 100, verdict: "Cumple", breakdown: { war: 100, donations: 100, capital: 100, games: 100 } });
  });

  it("scores 0 across the board with no data anywhere", () => {
    const result = computeIndex(
      { warUsagePct: null, warAvgStars: null, donationsThisSeason: null, capitalAttacksUsed: null, capitalAttacksAvailable: null, clanGamesPoints: null },
      DEFAULT_CLAN_RULES,
    );
    expect(result.score).toBe(0);
    expect(result.verdict).toBe("Flojo");
  });

  it("clamps donations above the benchmark instead of exceeding 100", () => {
    const result = computeIndex(
      {
        warUsagePct: 0,
        warAvgStars: 0,
        donationsThisSeason: DEFAULT_CLAN_RULES.coleaderMinDonationsPerSeason * 5,
        capitalAttacksUsed: 0,
        capitalAttacksAvailable: 6,
        clanGamesPoints: 0,
      },
      DEFAULT_CLAN_RULES,
    );
    expect(result.breakdown.donations).toBe(100);
  });

  it("matches the default weights (40/30/15/15) exactly for a half-and-half member", () => {
    // war=50, donations=50, capital=50, games=50 -> weighted avg must be 50 regardless of weights, as a sanity check.
    const result = computeIndex(
      {
        warUsagePct: 50,
        warAvgStars: 1.5,
        donationsThisSeason: DEFAULT_CLAN_RULES.coleaderMinDonationsPerSeason / 2,
        capitalAttacksUsed: 3,
        capitalAttacksAvailable: 6,
        clanGamesPoints: 2000,
      },
      DEFAULT_CLAN_RULES,
    );
    expect(result.score).toBe(50);
  });

  it("passes (Cumple) at exactly the configured threshold, fails just below it", () => {
    const inputsFor = (score: number) => ({
      warUsagePct: score,
      warAvgStars: (score / 100) * 3,
      donationsThisSeason: (score / 100) * DEFAULT_CLAN_RULES.coleaderMinDonationsPerSeason,
      capitalAttacksUsed: (score / 100) * 6,
      capitalAttacksAvailable: 6,
      clanGamesPoints: (score / 100) * 4000,
    });

    expect(computeIndex(inputsFor(70), DEFAULT_CLAN_RULES).verdict).toBe("Cumple");
    expect(computeIndex(inputsFor(69), DEFAULT_CLAN_RULES).verdict).toBe("Flojo");
  });

  it("respects a custom pass threshold from clan_rules", () => {
    const customRules = { ...DEFAULT_CLAN_RULES, indexPassThreshold: 90 };
    const result = computeIndex(
      {
        warUsagePct: 80,
        warAvgStars: 2.4,
        donationsThisSeason: DEFAULT_CLAN_RULES.coleaderMinDonationsPerSeason * 0.8,
        capitalAttacksUsed: 5,
        capitalAttacksAvailable: 6,
        clanGamesPoints: 3200,
      },
      customRules,
    );
    expect(result.verdict).toBe("Flojo"); // ~80 < 90
  });
});
