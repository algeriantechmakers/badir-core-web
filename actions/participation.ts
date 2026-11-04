"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { InitiativeStatus, ParticipationStatus } from "@prisma/client";
import { ActionResponse } from "@/types/Statics";
// import DOMPurify from "isomorphic-dompurify";
import { FormResponseType, JoinInitiativeParams } from "@/schemas";
import { ParticipationService } from "@/services/participations";
import { InitiativeService } from "@/services/initiatives";
import { assertInitiativeManager } from "@/lib/permissions";
import { sanitizeHTMLServer } from "@/lib/santitize-server";

export async function joinInitiativeAction(
  params: JoinInitiativeParams,
): Promise<ActionResponse<JoinInitiativeParams, { participationId: string }>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول للانضمام إلى المبادرة",
      };
    }

    const initiative = await prisma.initiative.findUnique({
      where: {
        id: params.initiativeId,
        status: InitiativeStatus.published,
      },
    });

    if (!initiative) {
      return {
        success: false,
        error: "المبادرة غير موجودة أو غير متاحة للانضمام",
      };
    }

    if (
      initiative.registrationDeadline &&
      initiative.registrationDeadline < new Date()
    ) {
      return {
        success: false,
        error: "انتهت فترة التسجيل لهذه المبادرة",
      };
    }

    if (
      initiative.maxParticipants &&
      initiative.currentParticipants >= initiative.maxParticipants
    ) {
      return {
        success: false,
        error: "المبادرة مكتملة العدد",
      };
    }

    // Check if user is already participating
    const existingParticipation = await ParticipationService.getByIds(
      session.user.id,
      params.initiativeId,
    );

    if (existingParticipation) {
      return {
        success: false,
        error: "أنت مسجل بالفعل في هذه المبادرة",
      };
    }

    const sanitizedFormResponses: FormResponseType = {};
    if (params.formResponses) {
      // Sanitize each response value
      Object.keys(params.formResponses).forEach((key) => {
        const value = params.formResponses![key];
        if (Array.isArray(value)) {
          sanitizedFormResponses[key] = value.map((item) =>
            sanitizeHTMLServer(item),
          );
        } else {
          sanitizedFormResponses[key] = sanitizeHTMLServer(value);
        }
      });
    }

    const participation = await ParticipationService.createParticipant(
      params.initiativeId,
      session.user.id,
      params.role,
      initiative.isOpenParticipation
        ? ParticipationStatus.approved
        : ParticipationStatus.registered,
      sanitizedFormResponses,
    );

    if (initiative.isOpenParticipation) {
      await InitiativeService.updateById(initiative.id, {
        currentParticipants: initiative.isOpenParticipation
          ? (initiative.currentParticipants || 0) + 1
          : initiative.currentParticipants,
      });
    }

    revalidatePath(`/initiatives/${params.initiativeId}`);

    return {
      success: true,
      message: initiative.isOpenParticipation
        ? "تم الانضمام إلى المبادرة بنجاح"
        : "تم تسجيل طلب الانضمام بنجاح",
      data: { participationId: participation.id },
    };
  } catch (error) {
    console.error("Error joining initiative:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء الانضمام إلى المبادرة",
    };
  }
}

export async function listApprovedMembersAction(initiativeId: string) {
  await assertInitiativeManager(initiativeId);
  const members = await prisma.initiativeParticipant.findMany({
    where: { initiativeId, status: ParticipationStatus.approved },
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "desc" }],
  });
  return {
    success: true,
    members: members.map((m) => ({
      id: m.id,
      user: m.user,
      participantRole: m.participantRole,
      status: m.status,
    })),
  };
}

export async function listPendingRequestsAction(initiativeId: string) {
  await assertInitiativeManager(initiativeId);
  const requests = await prisma.initiativeParticipant.findMany({
    where: { initiativeId, status: ParticipationStatus.registered },
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "asc" }],
  });
  return {
    success: true,
    requests: requests.map((r) => ({
      id: r.id,
      user: r.user,
      participantRole: r.participantRole,
      status: r.status,
    })),
  };
}

export async function approveParticipationAction(
  id: string,
  initiativeId: string,
) {
  await assertInitiativeManager(initiativeId);
  const participant = await prisma.initiativeParticipant.findUnique({
    where: { id },
    select: { status: true, initiativeId: true },
  });

  if (participant && participant.status === ParticipationStatus.approved) {
    return { success: true };
  }
  await prisma.initiativeParticipant.update({
    where: { id },
    data: { status: ParticipationStatus.approved },
  });

  await prisma.initiative.update({
    where: { id: initiativeId },
    data: { currentParticipants: { increment: 1 } },
  });
  revalidatePath(`/initiatives/${initiativeId}`);
  return { success: true };
}

export async function rejectParticipationAction(
  id: string,
  initiativeId: string,
) {
  await assertInitiativeManager(initiativeId);
  await prisma.initiativeParticipant.update({
    where: { id },
    data: { status: ParticipationStatus.rejected },
  });
  revalidatePath(`/initiatives/${initiativeId}`);
  return { success: true };
}

export async function kickMemberAction(id: string, initiativeId: string) {
  await assertInitiativeManager(initiativeId);
  await prisma.initiativeParticipant.update({
    where: { id },
    data: { status: ParticipationStatus.kicked },
  });
  // decrement if previously counted
  await prisma.initiative.update({
    where: { id: initiativeId },
    data: { currentParticipants: { decrement: 1 } },
  });
  revalidatePath(`/initiatives/${initiativeId}`);
  return { success: true };
}

export async function cancelParticipationAction(
  initiativeId: string,
): Promise<ActionResponse<{ initiativeId: string }, null>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول",
      };
    }

    const participation = await ParticipationService.getByIds(
      session.user.id,
      initiativeId,
    );

    if (!participation) {
      return {
        success: false,
        error: "لم يتم العثور على طلب المشاركة",
      };
    }

    // Only allow cancellation if status is still registered (pending)
    if (participation.status !== ParticipationStatus.registered) {
      return {
        success: false,
        error: "لا يمكن إلغاء المشاركة بعد الموافقة عليها أو رفضها",
      };
    }

    await prisma.initiativeParticipant.delete({
      where: { id: participation.id },
    });

    revalidatePath(`/initiatives/${initiativeId}`);

    return {
      success: true,
      message: "تم إلغاء طلب المشاركة بنجاح",
      data: null,
    };
  } catch (error) {
    console.error("Error cancelling participation:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء إلغاء المشاركة",
    };
  }
}
