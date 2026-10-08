import { describe, expect, it } from "vitest";
import { daysSinceLastActivity, isInactiveBeyondThreshold } from "./inactivity";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-08T12:00:00Z");

describe("daysSinceLastActivity", () => {
  it("measures from the last detected activity when there is one", () => {
    const lastActivityDetectedAt = new Date(now.getTime() - 2 * DAY);
    const days = daysSinceLastActivity({ lastActivityDetectedAt, firstSeenAt: new Date(0), now });
    expect(days).toBeCloseTo(2, 5);
  });

  it("falls back to first_seen_at when no activity has ever been detected", () => {
    const firstSeenAt = new Date(now.getTime() - 1 * DAY);
    const days = daysSinceLastActivity({ lastActivityDetectedAt: null, firstSeenAt, now });
    expect(days).toBeCloseTo(1, 5);
  });

  it("never goes negative for a member who joined after 'now' (clock skew)", () => {
    const firstSeenAt = new Date(now.getTime() + DAY);
    const days = daysSinceLastActivity({ lastActivityDetectedAt: null, firstSeenAt, now });
    expect(days).toBe(0);
  });
});

describe("isInactiveBeyondThreshold", () => {
  it("is false for a member who joined today with no activity yet", () => {
    const result = isInactiveBeyondThreshold({
      lastActivityDetectedAt: null,
      firstSeenAt: now,
      now,
      kickInactivityDays: 3,
    });
    expect(result).toBe(false);
  });

  it("is false right at the threshold (strictly more than, not at least)", () => {
    const lastActivityDetectedAt = new Date(now.getTime() - 3 * DAY);
    const result = isInactiveBeyondThreshold({
      lastActivityDetectedAt,
      firstSeenAt: new Date(0),
      now,
      kickInactivityDays: 3,
    });
    expect(result).toBe(false);
  });

  it("is true once past the threshold", () => {
    const lastActivityDetectedAt = new Date(now.getTime() - 4 * DAY);
    const result = isInactiveBeyondThreshold({
      lastActivityDetectedAt,
      firstSeenAt: new Date(0),
      now,
      kickInactivityDays: 3,
    });
    expect(result).toBe(true);
  });
});
