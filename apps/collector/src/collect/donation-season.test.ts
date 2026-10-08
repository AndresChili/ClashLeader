import { describe, expect, it } from "vitest";
import { didSeasonReset, seasonIdForDate } from "./donation-season";

describe("didSeasonReset", () => {
  it("is false while donations keep climbing", () => {
    expect(didSeasonReset({ donations: 100, donationsReceived: 50 }, { donations: 150, donationsReceived: 80 })).toBe(
      false,
    );
  });

  it("is true when donations drop", () => {
    expect(didSeasonReset({ donations: 500, donationsReceived: 50 }, { donations: 0, donationsReceived: 0 })).toBe(
      true,
    );
  });

  it("is true when only donationsReceived drops (asymmetric activity)", () => {
    expect(didSeasonReset({ donations: 0, donationsReceived: 300 }, { donations: 0, donationsReceived: 0 })).toBe(
      true,
    );
  });

  it("is false when nothing changed", () => {
    expect(didSeasonReset({ donations: 10, donationsReceived: 10 }, { donations: 10, donationsReceived: 10 })).toBe(
      false,
    );
  });
});

describe("seasonIdForDate", () => {
  it("formats as zero-padded UTC year-month", () => {
    expect(seasonIdForDate(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01");
    expect(seasonIdForDate(new Date("2026-11-30T23:59:00Z"))).toBe("2026-11");
  });
});
