import { ReportReason, ReportStatus, ReportTarget } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    report: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    initiativePost: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { ReportService } from "@/services/reports";

describe("ReportService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects a duplicate pending report", async () => {
    prismaMock.report.findFirst.mockResolvedValue({ id: "existing" });

    await expect(
      ReportService.create({
        reporterId: "reporter",
        targetType: ReportTarget.USER,
        targetId: "target",
        reason: ReportReason.OTHER,
      }),
    ).rejects.toThrow("DUPLICATE_REPORT");
    expect(prismaMock.report.create).not.toHaveBeenCalled();
  });

  it("creates a report when no pending duplicate exists", async () => {
    prismaMock.report.findFirst.mockResolvedValue(null);
    prismaMock.report.create.mockResolvedValue({ id: "new-report" });

    await expect(
      ReportService.create({
        reporterId: "reporter",
        targetType: ReportTarget.USER,
        targetId: "target",
        reason: ReportReason.HARMFUL_CONTENT,
      }),
    ).resolves.toEqual({ id: "new-report" });
  });

  it("enriches user targets and applies filters", async () => {
    prismaMock.report.findMany.mockResolvedValue([
      {
        id: "report",
        targetType: ReportTarget.USER,
        targetId: "user",
        reporter: { id: "reporter" },
        resolvedBy: null,
      },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user",
      name: "Target",
    });

    await expect(
      ReportService.getAll({ status: ReportStatus.PENDING }),
    ).resolves.toEqual([
      expect.objectContaining({
        targetName: "Target",
        targetOwnerId: "user",
        organizerOrgId: null,
      }),
    ]);
    expect(prismaMock.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: ReportStatus.PENDING, targetType: undefined },
      }),
    );
  });

  it("resolves and dismisses reports with actor metadata", async () => {
    prismaMock.report.update.mockResolvedValue({ id: "report" });

    await ReportService.resolve("report", "manager");
    await ReportService.dismiss("report", "manager");

    expect(prismaMock.report.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: ReportStatus.RESOLVED,
          resolvedById: "manager",
        }),
      }),
    );
    expect(prismaMock.report.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          status: ReportStatus.DISMISSED,
          resolvedById: "manager",
        }),
      }),
    );
  });
});
