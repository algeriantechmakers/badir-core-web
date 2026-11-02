import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordReset, resetPassword } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      requestPasswordReset,
      resetPassword,
    },
  },
}));

import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/actions/password-reset";

describe("password reset actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.BETTER_AUTH_URL = "https://badir.example";
  });

  it("requests a password reset with the configured redirect", async () => {
    requestPasswordReset.mockResolvedValue({});

    await expect(
      requestPasswordResetAction("user@example.com"),
    ).resolves.toEqual({
      success: true,
      message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني",
    });

    expect(requestPasswordReset).toHaveBeenCalledWith({
      body: {
        email: "user@example.com",
        redirectTo: "https://badir.example/reset-password",
      },
    });
  });

  it("returns an error when requesting a password reset fails", async () => {
    requestPasswordReset.mockRejectedValue(new Error("failed"));

    await expect(
      requestPasswordResetAction("user@example.com"),
    ).resolves.toEqual({
      success: false,
      error: "حدث خطأ أثناء معالجة طلبك، يرجى المحاولة مرة أخرى",
    });
  });

  it("resets a password with the supplied token", async () => {
    resetPassword.mockResolvedValue({});

    await expect(
      resetPasswordAction("reset-token", "NewPassword123"),
    ).resolves.toEqual({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });

    expect(resetPassword).toHaveBeenCalledWith({
      body: { token: "reset-token", newPassword: "NewPassword123" },
    });
  });

  it("returns an error when the reset token is rejected", async () => {
    resetPassword.mockRejectedValue(new Error("expired"));

    await expect(
      resetPasswordAction("expired-token", "NewPassword123"),
    ).resolves.toEqual({
      success: false,
      error: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية",
    });
  });
});
