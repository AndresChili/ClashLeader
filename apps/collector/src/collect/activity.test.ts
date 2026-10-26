import { describe, expect, it } from "vitest";
import {
  donationActivitySignals,
  hasDetectableActivity,
  hasNewAttacks,
  hasNewPlayerActivity,
  playerActivityScore,
} from "./activity";

describe("donationActivitySignals", () => {
  it("reports no change for a brand-new member with no prior snapshot", () => {
    const signals = donationActivitySignals(undefined, { donations: 0, donationsReceived: 0 });
    expect(hasDetectableActivity(signals)).toBe(false);
  });

  it("flags a change when donations go up", () => {
    const signals = donationActivitySignals(
      { donations: 100, donationsReceived: 20 },
      { donations: 150, donationsReceived: 20 },
    );
    expect(signals.donationsChanged).toBe(true);
    expect(signals.donationsReceivedChanged).toBe(false);
    expect(hasDetectableActivity(signals)).toBe(true);
  });

  it("reports nothing detectable when nothing moved", () => {
    const signals = donationActivitySignals(
      { donations: 100, donationsReceived: 20 },
      { donations: 100, donationsReceived: 20 },
    );
    expect(hasDetectableActivity(signals)).toBe(false);
  });
});

describe("hasNewAttacks", () => {
  it("is true the first time a member shows any attacks", () => {
    expect(hasNewAttacks(undefined, 1)).toBe(true);
  });

  it("is false the first time a member shows zero attacks", () => {
    expect(hasNewAttacks(undefined, 0)).toBe(false);
  });

  it("is true when the count goes up", () => {
    expect(hasNewAttacks(1, 2)).toBe(true);
  });

  it("is false when the count is unchanged", () => {
    expect(hasNewAttacks(2, 2)).toBe(false);
  });
});

describe("playerActivityScore", () => {
  it("sums only achievements that move through the player's own play", () => {
    const score = playerActivityScore([
      { name: "Gold Grab", value: 1000 },
      { name: "Nice and Tidy", value: 50 },
      { name: "Unbreakable", value: 999 }, // defensas: pueden subir estando desconectado
      { name: "War Hero", value: 300 }, // se acredita al terminar la guerra
    ]);
    expect(score).toBe(1050);
  });
});

describe("hasNewPlayerActivity", () => {
  it("only sets the baseline the first time", () => {
    expect(hasNewPlayerActivity(null, 5000)).toBe(false);
  });

  it("is true when the score went up", () => {
    expect(hasNewPlayerActivity(5000, 5200)).toBe(true);
  });

  it("is false when nothing moved", () => {
    expect(hasNewPlayerActivity(5000, 5000)).toBe(false);
  });
});
