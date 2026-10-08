import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./auth";

describe("signUpSchema", () => {
  it("accepts a valid sign-up", () => {
    const result = signUpSchema.safeParse({
      displayName: "Marcos",
      email: "marcos@example.com",
      password: "Password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password without a digit", () => {
    const result = signUpSchema.safeParse({
      displayName: "Marcos",
      email: "marcos@example.com",
      password: "Password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password even if it has every character class", () => {
    const result = signUpSchema.safeParse({
      displayName: "Marcos",
      email: "marcos@example.com",
      password: "Aa1aaaaa",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("rejects a malformed email", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });
});
