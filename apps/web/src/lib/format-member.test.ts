import { describe, expect, it } from "vitest";
import { daysInClan, formatLastActivity } from "./format-member";

const now = new Date("2026-10-08T12:00:00Z");

describe("daysInClan", () => {
  it("prefers the manual join date over first_seen_at when both exist", () => {
    const days = daysInClan(
      { manualJoinDate: "2026-10-01", firstSeenAt: "2026-09-01T00:00:00Z" },
      now,
    );
    expect(days).toBe(7);
  });

  it("falls back to first_seen_at with no manual date", () => {
    const days = daysInClan({ manualJoinDate: null, firstSeenAt: "2026-10-06T12:00:00Z" }, now);
    expect(days).toBe(2);
  });
});

describe("formatLastActivity", () => {
  it("is always phrased as a detection, never a certainty", () => {
    expect(formatLastActivity(null, now)).toBe("sin actividad detectada");
  });

  it("says today for less than a day ago", () => {
    expect(formatLastActivity(new Date(now.getTime() - 60_000).toISOString(), now)).toBe(
      "actividad detectada hoy",
    );
  });

  it("pluralizes correctly", () => {
    const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    expect(formatLastActivity(oneDayAgo, now)).toBe("actividad detectada hace 1 día");

    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastActivity(threeDaysAgo, now)).toBe("actividad detectada hace 3 días");
  });
});
