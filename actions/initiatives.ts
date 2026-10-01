"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NewInitiativeFormData } from "@/schemas/newInitiativeSchema";
import { extractStoragePath, StorageHelpers } from "@/services/storage";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { mimeTypeToExtension } from "@/lib/utils";
import { InitiativeStatus, OrganizerType, UserType } from "@prisma/client";
import { OrganizationService } from "@/services/organizations";
import { ActionResponse } from "@/types/Statics";
import { InitiativeService } from "@/services/initiatives";
import { getPublicStorageUrl } from "./helpers-sf";
import { sanitizePlainText, sanitizeRichText } from "@/lib/santitize-server";

export async function createInitiativeAction(
  data: NewInitiativeFormData,
): Promise<ActionResponse<NewInitiativeFormData, { initiativeId?: string }>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول لإنشاء مبادرة",
      };
    }

    let organizerUserId: string | undefined;
    let organizerOrgId: string | undefined;
    if (session.user.userType === OrganizerType.organization) {
      const orgData = await OrganizationService.getOrganizationByUserId(
        session.user.id,
      );
      organizerOrgId = orgData?.id;
      organizerUserId = undefined;
    } else {
      organizerUserId = session.user.id;
      organizerOrgId = undefined;
    }

    const userType =
      session.user.userType === UserType.organization
        ? OrganizerType.organization
        : OrganizerType.user;

    const initiative = await prisma.initiative.create({
      data: {
        organizerType: userType,
        organizerUserId: organizerUserId,
        organizerOrgId: organizerOrgId,
        categoryId: data.categoryId,
        titleAr: sanitizePlainText(data.titleAr),
        titleEn: data.titleEn ? sanitizePlainText(data.titleEn) : undefined,
        descriptionAr: sanitizeRichText(data.descriptionAr),
        descriptionEn: data.descriptionEn
          ? sanitizeRichText(data.descriptionEn)
          : undefined,
        shortDescriptionAr: data.shortDescriptionAr
          ? sanitizePlainText(data.shortDescriptionAr)
          : undefined,
        shortDescriptionEn: data.shortDescriptionEn
          ? sanitizePlainText(data.shortDescriptionEn)
          : undefined,
        isOnline: data.isOnline,
        location: data.location || "",
        city: data.city || "",
        state: data.state,
        country: data.country,
        startDate: data.startDate,
        endDate: data.endDate,
        registrationDeadline: data.registrationDeadline,
        maxParticipants: data.maxParticipants,
        isOpenParticipation: !data.requiresForm,
        targetAudience: data.targetAudience,
        participationQstForm: data.requiresForm
          ? data.participationQstForm
          : [],
        status:
          userType === OrganizerType.user
            ? InitiativeStatus.draft
            : data.status,
      },
    });

    let coverImagePath: string | null = null;

    if (
      data.coverImage &&
      typeof data.coverImage === "string" &&
      data.coverImage.length > 0
    ) {
      try {
        const { base64, name, type } = JSON.parse(data.coverImage);
        const fileBuffer = Buffer.from(base64, "base64");

        let ext = path.extname(name);
        if (!ext && type) {
          ext = mimeTypeToExtension(type) || ".bin";
        }

        const fileName = `${uuidv4()}.${name
          .replace(/\s+/g, "-")
          .replace(ext, "")}${ext}`;
        const filePath = `${session.user.id}/${initiative.id}/${fileName}`;

        const storage = new StorageHelpers();
        const result = await storage.uploadFile(
          "post-images",
          filePath,
          fileBuffer,
          type,
        );

        coverImagePath = await getPublicStorageUrl("post-images", result.path);
      } catch (error) {
        console.error("Error uploading cover image:", error);
        return {
          success: false,
          error: "فشل تحميل صورة الغلاف",
        };
      }
    }

    if (coverImagePath) {
      await prisma.initiative.update({
        where: { id: initiative.id },
        data: { coverImage: coverImagePath },
      });
    }

    revalidatePath("/initiatives");

    return {
      success: true,
      message:
        data.status === InitiativeStatus.published
          ? "تم نشر المبادرة بنجاح"
          : "تم حفظ المبادرة كمسودة",
      data: { initiativeId: initiative.id },
    };
  } catch (error) {
    console.error("Error creating initiative:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء إنشاء المبادرة",
    };
  }
}

export async function updateInitiativeAction(
  initiativeId: string,
  data: NewInitiativeFormData,
): Promise<ActionResponse<NewInitiativeFormData, { initiativeId?: string }>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "يجب تسجيل الدخول لتحديث المبادرة" };
    }
    const initiative = await prisma.initiative.findUnique({
      where: { id: initiativeId },
      include: {
        organizerOrg: { select: { id: true, userId: true } },
        organizerUser: { select: { id: true } },
      },
    });

    if (!initiative) {
      return { success: false, error: "المبادرة غير موجودة" };
    }

    const isOwnerUser = initiative.organizerUserId === session.user.id;
    const isOwnerOrg = initiative.organizerOrg?.userId === session.user.id;
    if (!isOwnerUser && !isOwnerOrg) {
      return { success: false, error: "غير مصرح لك بتعديل هذه المبادرة" };
    }

    let coverImagePath: string | null = null;
    if (
      data.coverImage &&
      typeof data.coverImage === "string" &&
      data.coverImage.length > 0
    ) {
      try {
        if (initiative.coverImage && initiative.coverImage !== null) {
          const storage = new StorageHelpers();
          await storage.deleteFile(
            "post-images",
            extractStoragePath(initiative.coverImage) || "",
          );
        }
        const { base64, name, type } = JSON.parse(data.coverImage);
        const fileBuffer = Buffer.from(base64, "base64");

        let ext = path.extname(name);
        if (!ext && type) {
          ext = mimeTypeToExtension(type) || ".bin";
        }

        const fileName = `${uuidv4()}.${name
          .replace(/\s+/g, "-")
          .replace(ext, "")}${ext}`;
        const filePath = `${session.user.id}/${initiativeId}/${fileName}`;

        const storage = new StorageHelpers();
        const result = await storage.uploadFile(
          "post-images",
          filePath,
          fileBuffer,
          type,
        );

        coverImagePath = await getPublicStorageUrl("post-images", result.path);
      } catch (error) {
        console.error("Error uploading cover image:", error);
        return { success: false, error: "فشل تحميل صورة الغلاف" };
      }
    }

    if (data.coverImage === null && initiative.coverImage) {
      const storage = new StorageHelpers();
      await storage.deleteFile(
        "post-images",
        extractStoragePath(initiative.coverImage) || "",
      );
      coverImagePath = null;
    }

    const updateData = await prisma.initiative.update({
      where: { id: initiativeId },
      data: {
        titleAr: sanitizePlainText(data.titleAr),
        titleEn: data.titleEn ? sanitizePlainText(data.titleEn) : undefined,
        shortDescriptionAr: data.shortDescriptionAr
          ? sanitizePlainText(data.shortDescriptionAr)
          : undefined,
        shortDescriptionEn: data.shortDescriptionEn
          ? sanitizePlainText(data.shortDescriptionEn)
          : undefined,
        descriptionAr: data.descriptionAr
          ? sanitizeRichText(data.descriptionAr)
          : undefined,
        descriptionEn: data.descriptionEn
          ? sanitizeRichText(data.descriptionEn)
          : undefined,
        categoryId: data.categoryId,
        isOnline: data.isOnline,
        location: data.location || "",
        city: data.city || "",
        state: data.state,
        country: data.country,
        startDate: data.startDate,
        endDate: data.endDate,
        registrationDeadline: data.registrationDeadline ?? null,
        maxParticipants: data.maxParticipants ?? null,
        isOpenParticipation: !data.requiresForm,
        participationQstForm: data.requiresForm
          ? data.participationQstForm
          : [],
        targetAudience: data.targetAudience,
        // Only organization owners can set the actual requested status (publish), otherwise force draft
        status:
          session.user.userType === UserType.organization
            ? data.status
            : InitiativeStatus.draft,
        updatedAt: new Date(),
        coverImage: coverImagePath,
      },
    });

    // revalidate initiative page
    revalidatePath(`/initiatives/${initiativeId}`);

    const message =
      session.user.userType === UserType.organization &&
      updateData.status === InitiativeStatus.published
        ? "تم تحديث ونشر المبادرة بنجاح"
        : "تم تحديث المبادرة بنجاح. سيتم مراجعة ونشر المبادرة إذا لزم الأمر";

    return { success: true, message, data: { initiativeId: updateData.id } };
  } catch (error) {
    console.error("Error updating initiative:", error);
    return { success: false, error: "حدث خطأ أثناء تحديث المبادرة" };
  }
}

/**
 * Get the cover image path for an initiative
 * @param id Initiative ID
 * @returns the image path or null
 */
export async function getInitiativeCover(id: string): Promise<string | null> {
  try {
    const imagePath = await InitiativeService.getCoverImagePath(id);
    return imagePath;
  } catch (error) {
    console.error("Failed to fetch initiative cover:", error);
    return null;
  }
}
