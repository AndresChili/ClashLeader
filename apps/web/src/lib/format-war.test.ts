import { describe, expect, it } from "vitest";
import { attacksAllowedFor, formatRemainingTime, formatScore } from "./format-war";

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
