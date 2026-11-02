import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { UserService } from "@/services/user";

describe("UserService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("freezes a user and returns notification details", async () => {
    prismaMock.user.update.mockResolvedValue({
      email: "user@example.com",
      name: "User",
    });

    await expect(UserService.freeze("user-1")).resolves.toEqual({
      userEmail: "user@example.com",
      userName: "User",
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { isActive: false },
      }),
    );
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("throws when freezing a user fails", async () => {
    prismaMock.user.update.mockRejectedValue(new Error("failed"));
    await expect(UserService.freeze("user-1")).rejects.toThrow("failed");
  });

  it("unfreezes a user", async () => {
    await UserService.unfreeze("user-1");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isActive: true },
    });
  });

  it("propagates unfreeze errors", async () => {
    prismaMock.user.update.mockRejectedValue(new Error("failed"));
    await expect(UserService.unfreeze("user-1")).rejects.toThrow("failed");
  });

  it("schedules deletion for the user and their organizations", async () => {
    await UserService.scheduleAccountDeletion("user-1");
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { scheduledDeletionAt: expect.any(Date) },
      }),
    );
    expect(prismaMock.organization.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        data: { scheduledDeletionAt: expect.any(Date) },
      }),
    );
  });

  it("deletes every scheduled account in its own transaction", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ]);

    await expect(UserService.deleteScheduledAccounts()).resolves.toBe(2);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(prismaMock.session.deleteMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.account.deleteMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.delete).toHaveBeenCalledTimes(2);
  });

  it("returns zero when no accounts are scheduled", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    await expect(UserService.deleteScheduledAccounts()).resolves.toBe(0);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns the user restore operation to an approved organization state", async () => {
    await UserService.restoreUser("user-1");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { scheduledDeletionAt: null },
    });
    expect(prismaMock.organization.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { scheduledDeletionAt: null, status: "approved" },
    });
  });
});
