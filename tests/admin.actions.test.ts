import { ReportReason, ReportTarget } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const { getSession, create, enforceMock } = vi.hoisted(() => ({
  getSession: vi.fn(),
  create: vi.fn(),
  enforceMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/services/reports", () => ({
  ReportService: { create },
}));
vi.mock("@/lib/permissions", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/permissions")>(
      "@/lib/permissions",
    );
  return { ...actual, enforce: enforceMock };
});

import { createReport } from "@/actions/admin";

describe("createReport action", () => {
  it("returns an authentication error without creating a report", async () => {
    getSession.mockResolvedValue(null);

    await expect(
      createReport({
        targetType: ReportTarget.USER,
        targetId: "target",
        reason: ReportReason.OTHER,
        customReason: "reason",
      }),
    ).resolves.toEqual({
      actionTaken: false,
      emailSent: false,
      error: "يجب تسجيل الدخول",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("sanitizes custom reasons before delegating to the report service", async () => {
    getSession.mockResolvedValue({
      user: { id: "reporter", role: "USER" },
    });
    create.mockResolvedValue({ id: "report" });

    await expect(
      createReport({
        targetType: ReportTarget.USER,
        targetId: "target",
        reason: ReportReason.OTHER,
        customReason: '<script>alert("x")</script>Useful reason',
      }),
    ).resolves.toEqual({ actionTaken: true, emailSent: false });

    expect(enforceMock).toHaveBeenCalledWith("USER", "create:report");
    expect(create).toHaveBeenCalledWith({
      targetType: ReportTarget.USER,
      targetId: "target",
      reason: ReportReason.OTHER,
      reporterId: "reporter",
      customReason: "Useful reason",
    });
  });
});
