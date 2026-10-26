import { describe, expect, it } from "vitest";
import { attacksAllowedFor, formatRemainingTime, formatUpdatedAgo, warPhase } from "./format-war";

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

describe("warPhase", () => {
  const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  it("shows preparation with the time until the war starts", () => {
    expect(warPhase({ state: "preparation", startTime: at(312), endTime: at(312 + 1440) }, now)).toEqual({
      label: "Preparación",
      countdown: "Empieza en 5 h 12 min",
    });
  });

  it("shows the war with the time left", () => {
    expect(warPhase({ state: "inWar", startTime: at(-60), endTime: at(190) }, now)).toEqual({
      label: "En guerra",
      countdown: "Quedan 3 h 10 min",
    });
  });

  it("trusts the times when the stored state is behind", () => {
    expect(warPhase({ state: "preparation", startTime: at(-5), endTime: at(100) }, now).label).toBe("En guerra");
  });

  it("is over once the end time has passed", () => {
    expect(warPhase({ state: "inWar", startTime: at(-1500), endTime: at(-1) }, now)).toEqual({
      label: "Terminada",
      countdown: null,
    });
  });
});
