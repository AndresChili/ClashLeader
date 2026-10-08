import { describe, expect, it } from "vitest";
import { isAtRisk } from "./at-risk";

describe("isAtRisk", () => {
  it("is false with no war in progress", () => {
    expect(isAtRisk({ inCurrentWar: false, attacksUsedInCurrentWar: 0 })).toBe(false);
  });

  it("is true when rostered and no attacks used yet", () => {
    expect(isAtRisk({ inCurrentWar: true, attacksUsedInCurrentWar: 0 })).toBe(true);
  });

  it("is false once at least one attack has been made", () => {
    expect(isAtRisk({ inCurrentWar: true, attacksUsedInCurrentWar: 1 })).toBe(false);
  });
});
