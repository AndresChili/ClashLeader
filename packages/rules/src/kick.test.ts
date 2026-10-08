import { describe, expect, it } from "vitest";
import { evaluateKick } from "./kick";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-08T12:00:00Z");

const baseParams = {
  lastActivityDetectedAt: now, // active right now, not the inactivity path
  firstSeenAt: new Date(0),
  now,
  kickInactivityDays: 3,
  lastFinishedWar: null,
};

describe("evaluateKick", () => {
  it("does not kick an active member with no war history yet", () => {
    expect(evaluateKick(baseParams)).toEqual({ shouldKick: false, reason: null });
  });

  it("kicks for inactivity, regardless of war attendance", () => {
    const result = evaluateKick({
      ...baseParams,
      lastActivityDetectedAt: new Date(now.getTime() - 4 * DAY),
      lastFinishedWar: { wasRostered: true, attacksUsed: 2 },
    });
    expect(result).toEqual({ shouldKick: true, reason: "inactivity" });
  });

  it("kicks for zero attacks in the last finished war, even while 'active'", () => {
    const result = evaluateKick({
      ...baseParams,
      lastFinishedWar: { wasRostered: true, attacksUsed: 0 },
    });
    expect(result).toEqual({ shouldKick: true, reason: "no_war_attacks" });
  });

  it("does not kick a member who wasn't rostered for the last war", () => {
    const result = evaluateKick({
      ...baseParams,
      lastFinishedWar: { wasRostered: false, attacksUsed: 0 },
    });
    expect(result).toEqual({ shouldKick: false, reason: null });
  });

  it("does not kick a rostered member who used at least one attack", () => {
    const result = evaluateKick({
      ...baseParams,
      lastFinishedWar: { wasRostered: true, attacksUsed: 1 },
    });
    expect(result).toEqual({ shouldKick: false, reason: null });
  });

  it("inactivity takes priority when both conditions are true", () => {
    const result = evaluateKick({
      ...baseParams,
      lastActivityDetectedAt: new Date(now.getTime() - 10 * DAY),
      lastFinishedWar: { wasRostered: true, attacksUsed: 0 },
    });
    expect(result.reason).toBe("inactivity");
  });
});
