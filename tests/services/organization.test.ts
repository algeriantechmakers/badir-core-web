import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { OrganizationService } from "@/services/organizations";

describe("OrganizationService moderation methods", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("freezes an organization", async () => {
    await OrganizationService.freeze("org-1");
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: expect.objectContaining({ status: "frozen" }),
      }),
    );
  });

  it("throws when freezing an organization fails", async () => {
    prismaMock.organization.update.mockRejectedValue(new Error("failed"));
    await expect(OrganizationService.freeze("org-1")).rejects.toThrow("failed");
  });

  it("unfreezes an organization", async () => {
    await OrganizationService.unfreeze("org-1");
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: expect.objectContaining({ status: "approved" }),
      }),
    );
  });

  it("schedules organization removal and returns owner details", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      name: "Org",
      owner: { id: "owner-1", email: "owner@example.com" },
    });

    await expect(OrganizationService.remove("org-1")).resolves.toEqual({
      ownerUserId: "owner-1",
      ownerEmail: "owner@example.com",
      orgName: "Org",
    });
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: { scheduledDeletionAt: expect.any(Date) },
      }),
    );
  });

  it("restores an organization", async () => {
    await OrganizationService.restore("org-1");
    expect(prismaMock.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { scheduledDeletionAt: null, status: "approved" },
    });
  });

  it("deletes scheduled organizations and returns the count", async () => {
    prismaMock.organization.deleteMany.mockResolvedValue({ count: 2 });
    await expect(
      OrganizationService.deleteScheduledOrganizations(),
    ).resolves.toBe(2);
    expect(prismaMock.organization.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scheduledDeletionAt: { lte: expect.any(Date) } },
      }),
    );
  });
});
