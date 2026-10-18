import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { InitiativeService } from "@/services/initiatives";

describe("InitiativeService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    [
      "getById",
      async () => {
        prismaMock.initiative.findUnique.mockResolvedValue({
          id: "initiative-1",
          organizerType: "user",
        });
        await expect(
          InitiativeService.getById("initiative-1"),
        ).resolves.toEqual(expect.objectContaining({ id: "initiative-1" }));
      },
    ],
    [
      "getCoverImagePath",
      async () => {
        prismaMock.initiative.findUnique.mockResolvedValue({
          coverImage: "cover.jpg",
        });
        await expect(
          InitiativeService.getCoverImagePath("initiative-1"),
        ).resolves.toBe("cover.jpg");
      },
    ],
    [
      "getInitiativesCount",
      async () => {
        prismaMock.initiative.count.mockResolvedValue(3);
        await expect(InitiativeService.getInitiativesCount()).resolves.toBe(3);
      },
    ],
    [
      "getStatus",
      async () => {
        prismaMock.initiative.findUnique.mockResolvedValue({
          status: "published",
        });
        await expect(InitiativeService.getStatus("initiative-1")).resolves.toBe(
          "published",
        );
      },
    ],
    [
      "closeEndedInitiatives",
      async () => {
        prismaMock.initiative.updateMany.mockResolvedValue({ count: 2 });
        await expect(InitiativeService.closeEndedInitiatives()).resolves.toBe(
          2,
        );
      },
    ],
    [
      "getUserRating",
      async () => {
        prismaMock.userInitiativeRating.findFirst.mockResolvedValue({
          rating: 4,
        });
        await expect(
          InitiativeService.getUserRating("user-1", "initiative-1"),
        ).resolves.toEqual({ rating: 4 });
      },
    ],
    [
      "getInitiativeRatings",
      async () => {
        prismaMock.userInitiativeRating.findMany.mockResolvedValue([]);
        await expect(
          InitiativeService.getInitiativeRatings("initiative-1"),
        ).resolves.toEqual([]);
      },
    ],
  ])("supports %s", async (_name, test) => test());

  it.each([
    [
      "getById",
      async () => {
        prismaMock.initiative.findUnique.mockRejectedValue(new Error("failed"));
        await expect(InitiativeService.getById("initiative-1")).rejects.toThrow(
          "Failed to fetch initiative",
        );
      },
    ],
    [
      "getCoverImagePath",
      async () => {
        prismaMock.initiative.findUnique.mockRejectedValue(new Error("failed"));
        await expect(
          InitiativeService.getCoverImagePath("initiative-1"),
        ).rejects.toThrow("failed");
      },
    ],
    [
      "getInitiativesCount",
      async () => {
        prismaMock.initiative.count.mockRejectedValue(new Error("failed"));
        await expect(InitiativeService.getInitiativesCount()).rejects.toThrow(
          "failed",
        );
      },
    ],
    [
      "getStatus",
      async () => {
        prismaMock.initiative.findUnique.mockRejectedValue(new Error("failed"));
        await expect(
          InitiativeService.getStatus("initiative-1"),
        ).rejects.toThrow("failed");
      },
    ],
    [
      "closeEndedInitiatives",
      async () => {
        prismaMock.initiative.updateMany.mockRejectedValue(new Error("failed"));
        await expect(InitiativeService.closeEndedInitiatives()).rejects.toThrow(
          "Failed to close ended initiatives",
        );
      },
    ],
    [
      "getUserRating",
      async () => {
        prismaMock.userInitiativeRating.findFirst.mockRejectedValue(
          new Error("failed"),
        );
        await expect(
          InitiativeService.getUserRating("user-1", "initiative-1"),
        ).rejects.toThrow("failed");
      },
    ],
    [
      "getInitiativeRatings",
      async () => {
        prismaMock.userInitiativeRating.findMany.mockRejectedValue(
          new Error("failed"),
        );
        await expect(
          InitiativeService.getInitiativeRatings("initiative-1"),
        ).rejects.toThrow("Failed to fetch initiative ratings");
      },
    ],
  ])("propagates errors from %s", async (_name, test) => test());
});
