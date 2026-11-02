import { InitiativeStatus, ParticipationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  getById,
  getByIds,
  upsertInitiativeRating,
  revalidatePath,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getById: vi.fn(),
  getByIds: vi.fn(),
  upsertInitiativeRating: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/services/initiatives", () => ({
  InitiativeService: { getById, upsertInitiativeRating },
}));
vi.mock("@/services/participations", () => ({
  ParticipationService: { getByIds },
}));

import { submitInitiativeRating } from "@/actions/initiative-rating";

const validRating = { rating: 4.5, comment: "Helpful initiative" };
const completedInitiative = {
  id: "initiative-1",
  status: InitiativeStatus.completed,
};

describe("submitInitiativeRating", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getById.mockResolvedValue(completedInitiative);
    getByIds.mockResolvedValue({ status: ParticipationStatus.approved });
    upsertInitiativeRating.mockResolvedValue({});
  });

  it("rejects invalid rating input before authentication", async () => {
    await expect(
      submitInitiativeRating("initiative-1", { rating: 4.25 }),
    ).resolves.toEqual({ success: false, errors: {} });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    getSession.mockResolvedValue(null);

    await expect(
      submitInitiativeRating("initiative-1", validRating),
    ).resolves.toEqual({
      success: false,
      error: "يجب تسجيل الدخول لإرسال التقييم",
    });
  });

  it("rejects a missing initiative", async () => {
    getById.mockResolvedValue(null);

    await expect(
      submitInitiativeRating("initiative-1", validRating),
    ).resolves.toEqual({
      success: false,
      error: "المبادرة غير موجودة",
    });
  });

  it("rejects initiatives that are not completed", async () => {
    getById.mockResolvedValue({
      ...completedInitiative,
      status: InitiativeStatus.published,
    });

    await expect(
      submitInitiativeRating("initiative-1", validRating),
    ).resolves.toEqual({
      success: false,
      error: "لا يمكن تقييم المبادرة إلا بعد انتهائها",
    });
  });

  it("rejects participants who are not approved", async () => {
    getByIds.mockResolvedValue({ status: ParticipationStatus.registered });

    await expect(
      submitInitiativeRating("initiative-1", validRating),
    ).resolves.toEqual({
      success: false,
      error: "يمكن للمشاركين المقبولين فقط تقييم المبادرة",
    });
  });

  it("saves an approved participant's rating", async () => {
    await expect(
      submitInitiativeRating("initiative-1", validRating),
    ).resolves.toEqual({
      success: true,
      message: "تم إرسال تقييمك بنجاح",
    });

    expect(getById).toHaveBeenCalledWith("initiative-1");
    expect(getByIds).toHaveBeenCalledWith("user-1", "initiative-1");
    expect(upsertInitiativeRating).toHaveBeenCalledWith(
      "user-1",
      "initiative-1",
      4.5,
      "Helpful initiative",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/initiatives/initiative-1");
  });

  it("returns an action error when saving the rating fails", async () => {
    upsertInitiativeRating.mockRejectedValue(new Error("database failed"));

    await expect(
      submitInitiativeRating("initiative-1", validRating),
    ).resolves.toEqual({
      success: false,
      error: "حدث خطأ أثناء إرسال التقييم، يرجى المحاولة مرة أخرى",
    });
  });
});
