import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InitiativeStatus,
  ParticipantRole,
  ParticipationStatus,
} from "@prisma/client";
import { prismaMock } from "../__mocks__/prisma";

const { getSession, createParticipant, getByIds, updateById, revalidatePath } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    createParticipant: vi.fn(),
    getByIds: vi.fn(),
    updateById: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/services/participations", () => ({
  ParticipationService: { getByIds, createParticipant },
}));
vi.mock("@/services/initiatives", () => ({
  InitiativeService: { updateById },
}));
vi.mock("@/lib/santitize-server", () => ({
  sanitizeHTMLServer: (value: string) => value,
}));

import { joinInitiativeAction } from "@/actions/participation";

const params = {
  initiativeId: "initiative-1",
  role: ParticipantRole.participant,
};

const publishedInitiative = {
  id: "initiative-1",
  status: InitiativeStatus.published,
  registrationDeadline: null,
  maxParticipants: 10,
  currentParticipants: 2,
  isOpenParticipation: true,
};

describe("joinInitiativeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getByIds.mockResolvedValue(null);
    createParticipant.mockResolvedValue({ id: "participation-1" });
    updateById.mockResolvedValue({});
  });

  it("rejects registration after the deadline", async () => {
    const initiative = {
      ...publishedInitiative,
      registrationDeadline: new Date(Date.now() - 1_000),
    };
    prismaMock.initiative.findUnique.mockResolvedValue(initiative);

    await expect(joinInitiativeAction(params)).resolves.toEqual({
      success: false,
      error: "انتهت فترة التسجيل لهذه المبادرة",
    });
    expect(createParticipant).not.toHaveBeenCalled();
  });

  it("rejects registration when all slots are full", async () => {
    prismaMock.initiative.findUnique.mockResolvedValue({
      ...publishedInitiative,
      currentParticipants: 10,
    });

    await expect(joinInitiativeAction(params)).resolves.toEqual({
      success: false,
      error: "المبادرة مكتملة العدد",
    });
    expect(createParticipant).not.toHaveBeenCalled();
  });

  it("rejects registration when the initiative is not published", async () => {
    prismaMock.initiative.findUnique.mockResolvedValue(null);

    await expect(joinInitiativeAction(params)).resolves.toEqual({
      success: false,
      error: "المبادرة غير موجودة أو غير متاحة للانضمام",
    });
    expect(createParticipant).not.toHaveBeenCalled();
  });

  it("rejects registration when the user is already registered", async () => {
    prismaMock.initiative.findUnique.mockResolvedValue(publishedInitiative);
    getByIds.mockResolvedValue({
      initiativeId: params.initiativeId,
      userId: "user-1",
      status: ParticipationStatus.registered,
    });

    await expect(joinInitiativeAction(params)).resolves.toEqual({
      success: false,
      error: "أنت مسجل بالفعل في هذه المبادرة",
    });
    expect(getByIds).toHaveBeenCalledWith("user-1", params.initiativeId);
    expect(createParticipant).not.toHaveBeenCalled();
  });

  it("registers the user when all eligibility checks pass", async () => {
    prismaMock.initiative.findUnique.mockResolvedValue(publishedInitiative);

    await expect(joinInitiativeAction(params)).resolves.toEqual({
      success: true,
      message: "تم الانضمام إلى المبادرة بنجاح",
      data: { participationId: "participation-1" },
    });
    expect(getByIds).toHaveBeenCalledWith("user-1", params.initiativeId);
    expect(createParticipant).toHaveBeenCalledWith(
      params.initiativeId,
      "user-1",
      params.role,
      ParticipationStatus.approved,
      {},
    );
    expect(updateById).toHaveBeenCalled();
  });
});
