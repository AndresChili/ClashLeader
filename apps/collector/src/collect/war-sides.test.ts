import { describe, expect, it } from "vitest";
import { resolveWarSides } from "./war-sides";
import type { ClashApiWar, ClashApiWarClan } from "../clash-api/types";

function clan(tag: string): ClashApiWarClan {
  return { tag, name: tag, clanLevel: 10, attacks: 0, stars: 0, destructionPercentage: 0, members: [] };
}

function war(clanSide: ClashApiWarClan, opponentSide: ClashApiWarClan): ClashApiWar {
  return {
    state: "inWar",
    teamSize: 15,
    startTime: null,
    preparationStartTime: null,
    endTime: null,
    clan: clanSide,
    opponent: opponentSide,
  };
}

describe("resolveWarSides", () => {
  it("picks war.clan as ours when its tag matches (the normal /currentwar case)", () => {
    const resolved = resolveWarSides(war(clan("#US"), clan("#THEM")), "#US");
    expect(resolved?.ours.tag).toBe("#US");
    expect(resolved?.theirs.tag).toBe("#THEM");
  });

  it("picks war.opponent as ours when the API put us on that side (a CWL war)", () => {
    const resolved = resolveWarSides(war(clan("#THEM"), clan("#US")), "#US");
    expect(resolved?.ours.tag).toBe("#US");
    expect(resolved?.theirs.tag).toBe("#THEM");
  });

  it("returns null if neither side matches (shouldn't happen, but must not silently pick wrong)", () => {
    const resolved = resolveWarSides(war(clan("#A"), clan("#B")), "#US");
    expect(resolved).toBeNull();
  });
});
