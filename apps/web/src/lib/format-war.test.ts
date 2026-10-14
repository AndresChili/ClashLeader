import { describe, expect, it } from "vitest";
import { attacksAllowedFor, formatRemainingTime, formatScore, formatUpdatedAgo } from "./format-war";

const now = new Date("2026-10-08T12:00:00Z");

describe("formatRemainingTime", () => {
  it("formats hours and minutes", () => {
    const end = new Date(now.getTime() + (5 * 60 + 12) * 60_000).toISOString();
    expect(formatRemainingTime(end, now)).toBe("Quedan 5 h 12 min");
  });

  it("drops the hours when under an hour remains", () => {
    const end = new Date(now.getTime() + 12 * 60_000).toISOString();
    expect(formatRemainingTime(end, now)).toBe("Quedan 12 min");
  });

  it("returns null once the end time has passed", () => {
    const end = new Date(now.getTime() - 1000).toISOString();
    expect(formatRemainingTime(end, now)).toBeNull();
  });

  it("returns null with no end time", () => {
    expect(formatRemainingTime(null, now)).toBeNull();
  });
});

describe("formatScore", () => {
  it("formats both scores", () => {
    expect(formatScore(31, 27)).toBe("31 a 27 estrellas");
  });

  it("falls back to an em dash when either score is missing", () => {
    expect(formatScore(null, 27)).toBe("—");
  });
});

describe("attacksAllowedFor", () => {
  it("is 1 for CWL, 2 otherwise", () => {
    expect(attacksAllowedFor("cwl")).toBe(1);
    expect(attacksAllowedFor("random")).toBe(2);
    expect(attacksAllowedFor("friendly")).toBe(2);
  });
});

describe("formatUpdatedAgo", () => {
  it("says so when the collector has never run", () => {
    expect(formatUpdatedAgo(null, now)).toBe("todavía sin datos del recolector");
  });

  it("reports just now under a minute", () => {
    const at = new Date(now.getTime() - 10_000).toISOString();
    expect(formatUpdatedAgo(at, now)).toBe("actualizado justo ahora");
  });

  it("uses singular for exactly 1 minute", () => {
    const at = new Date(now.getTime() - 60_000).toISOString();
    expect(formatUpdatedAgo(at, now)).toBe("actualizado hace 1 min");
  });

  it("formats minutes under an hour", () => {
    const at = new Date(now.getTime() - 12 * 60_000).toISOString();
    expect(formatUpdatedAgo(at, now)).toBe("actualizado hace 12 min");
  });

  it("formats hours at or beyond 60 minutes", () => {
    const at = new Date(now.getTime() - 125 * 60_000).toISOString();
    expect(formatUpdatedAgo(at, now)).toBe("actualizado hace 2 h");
  });
});
