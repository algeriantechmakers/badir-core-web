import {
  forgotPasswordSchema,
  initialSignupSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/schemas";
import { describe, expect, it } from "vitest";

describe("schemas", () => {
  it("accepts valid login credentials and rejects missing passwords", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "secret123",
      }).success,
    ).toBe(true);
    expect(loginSchema.safeParse({ email: "user@example.com" }).success).toBe(
      false,
    );
  });

  it("enforces signup password confirmation", () => {
    const valid = {
      email: "user@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    };
    expect(
      initialSignupSchema.safeParse({
        ...valid,
        firstName: "Test",
        lastName: "User",
      }).success,
    ).toBe(true);
    expect(
      initialSignupSchema.safeParse({
        ...valid,
        firstName: "Test",
        lastName: "User",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
  });

  it("validates password reset input", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        password: "Secret123",
        confirmPassword: "Secret123",
      }).success,
    ).toBe(true);
  });
});
