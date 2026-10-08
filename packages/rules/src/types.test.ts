import { describe, expect, it } from "vitest";
import { DEFAULT_CLAN_RULES } from "./types";

describe("DEFAULT_CLAN_RULES", () => {
  it("index weights sum to 100, matching the clan_rules_weights_sum_100 db constraint", () => {
    const sum =
      DEFAULT_CLAN_RULES.indexWeightWar +
      DEFAULT_CLAN_RULES.indexWeightDonations +
      DEFAULT_CLAN_RULES.indexWeightCapital +
      DEFAULT_CLAN_RULES.indexWeightGames;

    expect(sum).toBe(100);
  });
});
