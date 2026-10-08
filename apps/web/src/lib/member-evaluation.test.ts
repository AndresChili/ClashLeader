import { DEFAULT_CLAN_RULES } from "@clashleader/rules";
import { describe, expect, it } from "vitest";
import type { MemberSummary } from "@/lib/data/members";
import { evaluateMember, type MemberEvaluationContext } from "./member-evaluation";

const now = new Date("2026-10-08T12:00:00Z");
const rules = { clanId: "clan-1", ...DEFAULT_CLAN_RULES };

function member(overrides: Partial<MemberSummary> = {}): MemberSummary {
  return {
    id: "m1",
    playerTag: "#P1",
    name: "Marcos",
    inGameRole: "member",
    firstSeenAt: "2026-01-01T00:00:00Z",
    manualJoinDate: null,
    lastActivityDetectedAt: now.toISOString(),
    onWatch: false,
    donations: 0,
    donationsReceived: 0,
    leagueName: null,
    trophies: null,
    townHallLevel: null,
    avgStarsPerAttack: null,
    attackUsagePct: null,
    attacksUsed: null,
    attacksAvailable: null,
    warsRostered: 0,
    warsAttacked: 0,
    ...overrides,
  };
}

function context(overrides: Partial<MemberEvaluationContext> = {}): MemberEvaluationContext {
  return {
    now,
    rules,
    currentWarAttacks: undefined,
    inCurrentWar: false,
    lastFinishedWar: null,
    capitalAttacksUsed: null,
    capitalAttacksAvailable: null,
    clanGamesPoints: null,
    ...overrides,
  };
}

describe("evaluateMember", () => {
  it("wires an inactive member through to a kick verdict", () => {
    const result = evaluateMember(
      member({ lastActivityDetectedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }),
      context(),
    );
    expect(result.kick).toEqual({ shouldKick: true, reason: "inactivity" });
  });

  it("wires a rostered-but-silent current war into an at-risk verdict", () => {
    const result = evaluateMember(member(), context({ inCurrentWar: true, currentWarAttacks: 0 }));
    expect(result.atRisk).toBe(true);
  });

  it("qualifies a veteran candidate end to end", () => {
    const veteran = member({
      firstSeenAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      donations: 600,
      warsRostered: 4,
      warsAttacked: 4,
    });
    const result = evaluateMember(veteran, context());
    expect(result.isVeteranCandidate).toBe(true);
  });

  it("does not qualify a coléder candidate without near-daily activity", () => {
    const candidate = member({
      firstSeenAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(),
      donations: 1200,
      attackUsagePct: 95,
      lastActivityDetectedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const result = evaluateMember(candidate, context());
    expect(result.isColeaderCandidate).toBe(false);
  });

  it("produces an índice score consistent with packages/rules for a maxed-out member", () => {
    const maxed = member({
      donations: DEFAULT_CLAN_RULES.coleaderMinDonationsPerSeason,
      avgStarsPerAttack: 3,
      attackUsagePct: 100,
    });
    const result = evaluateMember(maxed, context({ capitalAttacksUsed: 6, capitalAttacksAvailable: 6, clanGamesPoints: 4000 }));
    expect(result.index.score).toBe(100);
    expect(result.index.verdict).toBe("Cumple");
  });
});
