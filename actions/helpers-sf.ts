"use server";
import { auth } from "@/lib/auth";
import { InitiativeService } from "@/services/initiatives";
import { StorageHelpers } from "@/services/storage";
import { BUCKETS } from "@/types/Statics";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/Statics";
import { extractStoragePath } from "@/services/storage";
import { UserService } from "@/services/user";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { isManagementRole } from "@/lib/permissions";

/**
 * Returns the public URL for a file stored in object storage.
 * @param bucket - The name of the storage bucket.
 * @param path - The relative path of the file (as stored in DB).
 * @returns The public URL string, or null if not found.
 */
export async function getPublicStorageUrl(
  bucket: BUCKETS,
  path: string | null,
): Promise<string | null> {
  if (!bucket || !path) return null;
  const storage = new StorageHelpers();
  return await storage.getPublicUrl(bucket, path);
}

/**
 * Upload user profile image from Form Data
 * @param formData Form Data containing the file
 * @returns ActionResponse `Promise` with success status and optional error message
 */
export async function uploadUserProfileImage(
  formData: FormData,
): Promise<ActionResponse<any, any>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };
  const userId = session.user.id;

  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "لم يتم العثور على الملف" };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const currentImage = await UserService.getUserImage(userId);
    const storage = new StorageHelpers();

    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = `${userId}/${fileName}`;

    const result = await storage.uploadFile(
      "avatars",
      filePath,
      fileBuffer,
      file.type,
    );

    if (result.path && currentImage && currentImage.image) {
      try {
        const pathToDelete = extractStoragePath(currentImage.image);
        if (pathToDelete) {
          await storage.deleteFile("avatars", pathToDelete);
        }
      } catch (deleteError) {
        console.error("Failed to delete old profile image:", deleteError);
      }
    }

    const imageUrl = await getPublicStorageUrl("avatars", result.path);
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "فشل رفع الصورة" };
  }
}

/**
 * Upload organization logo from Form Data
 * @param formData Form Data containing the file
 * @returns ActionResponse `Promise` with success status and optional error message
 */
export async function uploadOrganizationLogo(
  formData: FormData,
): Promise<ActionResponse<any, any>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };
  const userId = session.user.id;

  const userWithOrg = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
  if (!userWithOrg?.organization)
    return { success: false, error: "لا يوجد منظمة" };

  const orgId = userWithOrg.organization.id;
  const orgLogo = userWithOrg.organization.logo;

  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "لم يتم العثور على الملف" };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const storage = new StorageHelpers();

    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = `${userId}/${fileName}`;

    const result = await storage.uploadFile(
      "avatars",
      filePath,
      fileBuffer,
      file.type,
    );

    if (result.path && orgLogo) {
      try {
        const pathToDelete = extractStoragePath(orgLogo);
        if (pathToDelete) {
          await storage.deleteFile("avatars", pathToDelete);
        }
      } catch (deleteError) {
        console.error("Failed to delete old logo:", deleteError);
      }
    }

    const imageUrl = await getPublicStorageUrl("avatars", result.path);
    await prisma.organization.update({
      where: { id: orgId },
      data: { logo: imageUrl },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "فشل رفع الصورة" };
  }
}

/**
 * Delete user profile image
 * @returns ActionResponse `Promise` with success status and optional error message
 */
export async function deleteUserProfileImage(): Promise<
  ActionResponse<any, any>
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };
  const userId = session.user.id;

  try {
    const currentImage = await UserService.getUserImage(userId);
    if (currentImage?.image) {
      const storage = new StorageHelpers();
      const pathToDelete = extractStoragePath(currentImage.image);
      if (pathToDelete) {
        await storage.deleteFile("avatars", pathToDelete);
      }
    }
    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    return { success: false, error: "فشل الحذف" };
  }
}

/**
 * Delete organization logo
 * @returns ActionResponse `Promise` with success status and optional error message
 */
export async function deleteOrganizationLogo(): Promise<
  ActionResponse<any, any>
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };
  const userId = session.user.id;

  try {
    const userWithOrg = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!userWithOrg?.organization)
      return { success: false, error: "لا يوجد منظمة" };

    const orgId = userWithOrg.organization.id;
    const orgLogo = userWithOrg.organization.logo;

    if (orgLogo) {
      const storage = new StorageHelpers();
      const pathToDelete = extractStoragePath(orgLogo);
      if (pathToDelete) {
        await storage.deleteFile("avatars", pathToDelete);
      }
    }
    await prisma.organization.update({
      where: { id: orgId },
      data: { logo: null },
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    return { success: false, error: "فشل الحذف" };
  }
}

/**
 * Delete initiative cover image
 * @param initiativeId Initiative ID
 * @returns ActionResponse `Promise` with success status and optional error message
 */
export async function deleteInitiativeCoverImage(
  initiativeId: string,
): Promise<ActionResponse<any, any>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };

  try {
    const initiative = await prisma.initiative.findUnique({
      where: { id: initiativeId },
    });
    if (!initiative) return { success: false, error: "المبادرة غير موجودة" };

    if (initiative.coverImage) {
      const storage = new StorageHelpers();
      const pathToDelete = extractStoragePath(initiative.coverImage);
      if (pathToDelete) {
        await storage.deleteFile("post-images", pathToDelete);
      }
    }
    await prisma.initiative.update({
      where: { id: initiativeId },
      data: { coverImage: null },
    });
    revalidatePath(`/initiatives/${initiativeId}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: "فشل الحذف" };
  }
}
