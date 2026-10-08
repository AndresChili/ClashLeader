import { describe, expect, it } from "vitest";
import { generateInviteCode, hashInviteCode } from "./invite-code";

describe("generateInviteCode", () => {
  it("generates a 10-character code with no ambiguous characters", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(10);
    expect(code).not.toMatch(/[01OI]/);
  });

  it("generates different codes on repeated calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBe(20);
  });
});

describe("hashInviteCode", () => {
  it("is deterministic for the same code", () => {
    expect(hashInviteCode("ABCD123456")).toBe(hashInviteCode("ABCD123456"));
  });

  it("is case-insensitive, since users may type it in lowercase", () => {
    expect(hashInviteCode("abcd123456")).toBe(hashInviteCode("ABCD123456"));
  });

  it("produces different hashes for different codes", () => {
    expect(hashInviteCode("ABCD123456")).not.toBe(hashInviteCode("WXYZ987654"));
  });
});
