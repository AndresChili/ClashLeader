import { describe, expect, it } from "vitest";
import { donationActivitySignals, hasDetectableActivity, hasNewAttacks } from "./activity";

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
