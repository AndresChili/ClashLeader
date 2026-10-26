import { describe, expect, it } from "vitest";
import { currentSeasonBounds, daysIntoSeason } from "./season";

describe("currentSeasonBounds", () => {
  it("runs from last month's last Monday to this month's, at 05:00 UTC", () => {
    // Octubre 2026: el último lunes es el 26; septiembre 2026: el 28.
    expect(currentSeasonBounds(new Date("2026-10-10T12:00:00Z"))).toEqual({
      start: new Date("2026-09-28T05:00:00Z"),
      end: new Date("2026-10-26T05:00:00Z"),
    });
  });

  it("rolls over to the next season once this month's last Monday has passed", () => {
    expect(currentSeasonBounds(new Date("2026-10-26T06:00:00Z"))).toEqual({
      start: new Date("2026-10-26T05:00:00Z"),
      end: new Date("2026-11-30T05:00:00Z"),
    });
  });

  it("handles a season that crosses the new year", () => {
    expect(currentSeasonBounds(new Date("2027-01-05T00:00:00Z")).start).toEqual(new Date("2026-12-28T05:00:00Z"));
  });
});

describe("daysIntoSeason", () => {
  it("counts days since the season started", () => {
    expect(daysIntoSeason(new Date("2026-10-28T05:00:00Z"))).toBe(2);
  });
});
