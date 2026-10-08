import { describe, expect, it } from "vitest";
import { isColeaderCandidate, isVeteranCandidate } from "./candidates";

const veteranRules = { veteranMinDays: 30, veteranMinDonationsPerSeason: 500 };
const coleaderRules = { coleaderMinDays: 90, coleaderMinAttackUsagePct: 90, coleaderMinDonationsPerSeason: 1000 };

describe("isVeteranCandidate", () => {
  it("qualifies a member who meets every gate", () => {
    const result = isVeteranCandidate(
      { daysInClan: 40, warsRostered: 5, warsAttacked: 5, donationsThisSeason: 600 },
      veteranRules,
    );
    expect(result).toBe(true);
  });

  it("fails on days in clan alone", () => {
    const result = isVeteranCandidate(
      { daysInClan: 20, warsRostered: 5, warsAttacked: 5, donationsThisSeason: 600 },
      veteranRules,
    );
    expect(result).toBe(false);
  });

  it("fails if they missed even one war entirely", () => {
    const result = isVeteranCandidate(
      { daysInClan: 40, warsRostered: 5, warsAttacked: 4, donationsThisSeason: 600 },
      veteranRules,
    );
    expect(result).toBe(false);
  });

  it("fails with no war history at all, even if everything else qualifies", () => {
    const result = isVeteranCandidate(
      { daysInClan: 40, warsRostered: 0, warsAttacked: 0, donationsThisSeason: 600 },
      veteranRules,
    );
    expect(result).toBe(false);
  });

  it("fails on donations alone", () => {
    const result = isVeteranCandidate(
      { daysInClan: 40, warsRostered: 5, warsAttacked: 5, donationsThisSeason: 100 },
      veteranRules,
    );
    expect(result).toBe(false);
  });
});

describe("isColeaderCandidate", () => {
  const base = { daysInClan: 100, attackUsagePct: 95, donationsThisSeason: 1200, nearDailyActivity: true };

  it("qualifies a member who meets every gate", () => {
    expect(isColeaderCandidate(base, coleaderRules)).toBe(true);
  });

  it("fails below the attack usage threshold", () => {
    expect(isColeaderCandidate({ ...base, attackUsagePct: 80 }, coleaderRules)).toBe(false);
  });

  it("treats a null attack usage as 0 (no war history yet)", () => {
    expect(isColeaderCandidate({ ...base, attackUsagePct: null }, coleaderRules)).toBe(false);
  });

  it("fails without near-daily activity even if every number qualifies", () => {
    expect(isColeaderCandidate({ ...base, nearDailyActivity: false }, coleaderRules)).toBe(false);
  });
});
