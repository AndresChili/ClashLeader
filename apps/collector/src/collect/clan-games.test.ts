import { describe, expect, it } from "vitest";
import { computeClanGamesPoints, shouldOpenNewSeason } from "./clan-games";

describe("shouldOpenNewSeason", () => {
  it("opens a season when none is open yet", () => {
    expect(shouldOpenNewSeason(null, "2026-10")).toBe(true);
  });

  it("keeps the same season within the same month", () => {
    expect(shouldOpenNewSeason("2026-10", "2026-10")).toBe(false);
  });

  it("opens a new season once the month rolls over", () => {
    expect(shouldOpenNewSeason("2026-10", "2026-11")).toBe(true);
  });
});

describe("computeClanGamesPoints", () => {
  it("is the plain difference during normal play", () => {
    expect(computeClanGamesPoints(1000, 4000)).toBe(3000);
  });

  it("is zero when nothing changed (no event happened this window)", () => {
    expect(computeClanGamesPoints(1000, 1000)).toBe(0);
  });

  it("never goes negative, even if the upstream value looks like it decreased", () => {
    expect(computeClanGamesPoints(1000, 800)).toBe(0);
  });
});
