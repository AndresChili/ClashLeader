import { describe, expect, it } from "vitest";
import { diffMembership } from "./diff-membership";

describe("diffMembership", () => {
  it("finds no changes when both lists match", () => {
    const tags = new Set(["#A", "#B"]);
    const diff = diffMembership(tags, new Set(tags));
    expect(diff.joinedTags.size).toBe(0);
    expect(diff.leftTags.size).toBe(0);
  });

  it("detects a join", () => {
    const diff = diffMembership(new Set(["#A"]), new Set(["#A", "#B"]));
    expect([...diff.joinedTags]).toEqual(["#B"]);
    expect(diff.leftTags.size).toBe(0);
  });

  it("detects a leave", () => {
    const diff = diffMembership(new Set(["#A", "#B"]), new Set(["#A"]));
    expect(diff.joinedTags.size).toBe(0);
    expect([...diff.leftTags]).toEqual(["#B"]);
  });

  it("handles a simultaneous join and leave (two different players)", () => {
    const diff = diffMembership(new Set(["#A"]), new Set(["#B"]));
    expect([...diff.joinedTags]).toEqual(["#B"]);
    expect([...diff.leftTags]).toEqual(["#A"]);
  });

  it("treats an empty previous list as everyone joining (first-ever collector run)", () => {
    const diff = diffMembership(new Set(), new Set(["#A", "#B"]));
    expect(diff.joinedTags.size).toBe(2);
  });
});
