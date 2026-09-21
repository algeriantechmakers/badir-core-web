"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath, updateTag, unstable_cache } from "next/cache";
import { InitiativeService } from "@/services/initiatives";
import { InitiativePostsService } from "@/services/posts";
import { StorageHelpers, extractStoragePath } from "@/services/storage";
import { PostType, PostStatus, InitiativeStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { sanitizeHTMLServer } from "@/lib/santitize-server";
import { BUCKET_MIME_TYPES, BUCKET_SIZE_LIMITS } from "@/types/Statics";
import { PostEmailQueueService } from "@/services/post-email-queue";
import { postCreationRateLimiter } from "@/lib/rate-limit";

const MAX_POST_IMAGES = 5;

/**
 * Uploads post image files to storage and returns their public URLs.
 * @param initiativeId
 * @param userId
 * @param imageFiles
 * @returns An array of public URLs for the uploaded images.
 */
async function uploadPostImageFiles(
  initiativeId: string,
  userId: string,
  imageFiles: File[] = [],
) {
  if (imageFiles.length > MAX_POST_IMAGES) {
    throw new Error("الحد الأقصى لعدد الصور هو 5");
  }

  const storage = new StorageHelpers();

  return Promise.all(
    imageFiles.map(async (file) => {
      if (!BUCKET_MIME_TYPES["post-images"].includes(file.type)) {
        throw new Error("نوع الصورة غير مدعوم");
      }

      if (file.size > BUCKET_SIZE_LIMITS["post-images"]) {
        throw new Error("حجم الصورة كبير جدا");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "-")}`;
      const path = `${initiativeId}/${userId}/${fileName}`;
      const uploaded = await storage.uploadFile(
        "post-images",
        path,
        buffer,
        file.type,
      );

      return storage.getPublicUrl("post-images", uploaded.path);
    }),
  );
}

/**
 * Deletes post images from storage given their public URLs.
 * @param imageUrls An array of public URLs for the images to delete.
 */
async function deletePostImagesFromStorage(imageUrls: string[]) {
  const storage = new StorageHelpers();

  for (const imageUrl of imageUrls) {
    const pathToDelete = extractStoragePath(imageUrl);
    if (!pathToDelete) {
      console.warn("Could not derive storage path for:", imageUrl);
      continue;
    }

    try {
      await storage.deleteFile("post-images", pathToDelete);
    } catch (error) {
      console.warn("Failed to delete file from storage:", pathToDelete, error);
    }
  }
}

export async function createPostAction(
  initiativeId: string,
  content: string,
  imageFiles: File[] = [],
  title?: string | null,
  postType: PostType = "announcement",
  status: PostStatus = "published",
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };

  const initiativeState = await InitiativeService.getStatus(initiativeId);
  if (initiativeState === InitiativeStatus.completed) {
    return {
      success: false,
      error: "لا يمكن النشر في مبادرة منتهية",
    };
  }

  if (status === "published") {
    const { success: rateLimitSuccess } = await postCreationRateLimiter.limit(
      session.user.id,
    );
    if (!rateLimitSuccess) {
      return {
        success: false,
        error: "تجاوزت الحد المسموح من المنشورات. حاول مرة أخرى لاحقا",
      };
    }
  }

  if (imageFiles.length > MAX_POST_IMAGES) {
    return {
      success: false,
      error: "الحد الأقصى لعدد الصور هو 5",
    };
  }

  let uploadedImageUrls: string[] = [];

  try {
    const sanitizedContent = sanitizeHTMLServer(content || "");
    const post = await InitiativePostsService.create({
      initiativeId,
      authorId: session.user.id,
      content: sanitizedContent,
      title: title ?? null,
      postType,
      status,
    });

    uploadedImageUrls = await uploadPostImageFiles(
      initiativeId,
      session.user.id,
      imageFiles,
    );

    await Promise.all(
      uploadedImageUrls.map((imageUrl) =>
        InitiativePostsService.addAttachment(post.id, imageUrl),
      ),
    );

    if (status === "published") {
      try {
        await PostEmailQueueService.enqueuePostEmails({
          postId: post.id,
          initiativeId,
        });
      } catch (error) {
        console.error("Failed to enqueue post emails:", error);
      }
    }

    revalidatePath(`/initiatives/${initiativeId}`);
    updateTag(`initiative-${initiativeId}-posts`);
    return { success: true, message: "تم نشر المنشور" };
  } catch (error) {
    console.error("Failed to create post:", error);
    if (uploadedImageUrls.length) {
      await deletePostImagesFromStorage(uploadedImageUrls);
    }
    return { success: false, error: "فشل حفظ المنشور" };
  }
}

export async function deletePostAttachments(imageUrl: string) {
  await InitiativePostsService.removeAttachment(imageUrl);
}

export async function updatePostAction(
  postId: string,
  initiativeId: string,
  content: string,
  attachmentUrls: string[] = [],
  imageFiles: File[] = [],
  title?: string | null,
  postType?: PostType,
  status?: PostStatus,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };

  const initiativeState = await InitiativeService.getStatus(initiativeId);
  if (initiativeState === InitiativeStatus.completed) {
    return {
      success: false,
      error: "لا يمكن تعديل منشورات مبادرة منتهية",
    };
  }

  if (attachmentUrls.length + imageFiles.length > MAX_POST_IMAGES) {
    return {
      success: false,
      error: "الحد الأقصى لعدد الصور هو 5",
    };
  }

  const existingPost = await InitiativePostsService.getById(postId);
  const wasNotPublished = existingPost?.status !== "published";
  const existingImageUrls =
    existingPost?.attachments.map((attachment) => attachment.imageUrl) ?? [];
  const initiative = await InitiativeService.getById(
    initiativeId,
    session.user.id,
  );
  const isManager =
    initiative?.organizerUserId === session.user.id ||
    initiative?.organizerOrg?.userId === session.user.id;
  let uploadedImages: string[] = [];

  try {
    uploadedImages = await uploadPostImageFiles(
      initiativeId,
      session.user.id,
      imageFiles,
    );
    const nextAttachmentUrls = [...attachmentUrls, ...uploadedImages];
    const removedImageUrls = existingImageUrls.filter(
      (imageUrl) => !nextAttachmentUrls.includes(imageUrl),
    );
    const addedImageUrls = nextAttachmentUrls.filter(
      (imageUrl) => !existingImageUrls.includes(imageUrl),
    );

    const updateData: {
      title?: string | null;
      content?: string;
      postType?: PostType;
      status?: PostStatus;
    } = {
      content: sanitizeHTMLServer(content || ""),
      title: title ?? null,
    };

    if (postType) updateData.postType = postType;
    if (status) updateData.status = status;

    await InitiativePostsService.update(
      postId,
      session.user.id,
      updateData,
      !!isManager,
    );

    if (removedImageUrls.length) {
      await Promise.all(
        removedImageUrls.map((imageUrl) =>
          InitiativePostsService.removeAttachment(imageUrl),
        ),
      );
      await deletePostImagesFromStorage(removedImageUrls);
    }

    if (addedImageUrls.length) {
      await Promise.all(
        addedImageUrls.map((imageUrl) =>
          InitiativePostsService.addAttachment(postId, imageUrl),
        ),
      );
    }

    if (status === "published" && wasNotPublished) {
      try {
        await PostEmailQueueService.enqueuePostEmails({
          postId,
          initiativeId,
        });
      } catch (error) {
        console.error("Failed to enqueue post emails:", error);
      }
    }

    revalidatePath(`/initiatives/${initiativeId}`);
    updateTag(`initiative-${initiativeId}-posts`);
    return { success: true, message: "تم تحديث المنشور" };
  } catch (error) {
    console.error("Failed to update post:", error);
    if (uploadedImages.length) {
      await deletePostImagesFromStorage(uploadedImages);
    }
    return { success: false, error: "فشل تحديث المنشور" };
  }
}

export async function deletePostAction(postId: string, initiativeId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };

  const initiative = await InitiativeService.getById(
    initiativeId,
    session.user.id,
  );
  const isManager =
    initiative?.organizerUserId === session.user.id ||
    initiative?.organizerOrg?.userId === session.user.id;

  const existingPost = await InitiativePostsService.getById(postId);
  await InitiativePostsService.delete(postId, session.user.id, !!isManager);

  if (existingPost?.attachments?.length) {
    await deletePostImagesFromStorage(
      existingPost.attachments.map((attachment) => attachment.imageUrl),
    );
  }

  revalidatePath(`/initiatives/${initiativeId}`);
  updateTag(`initiative-${initiativeId}-posts`);
  return { success: true, message: "تم حذف المنشور" };
}

export async function pinPostAction(
  postId: string,
  initiativeId: string,
  pin: boolean,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };

  const initiative = await InitiativeService.getById(
    initiativeId,
    session.user.id,
  );
  const isManager =
    initiative?.organizerUserId === session.user.id ||
    initiative?.organizerOrg?.userId === session.user.id;

  if (!isManager) return { success: false, error: "غير مسموح" };

  await InitiativePostsService.pin(postId, pin);
  revalidatePath(`/initiatives/${initiativeId}`);
  updateTag(`initiative-${initiativeId}-posts`);
  return { success: true, message: pin ? "تم التثبيت" : "تم إلغاء التثبيت" };
}

export async function listPostsAction(
  initiativeId: string,
  onlyUserId?: string,
  status?: PostStatus,
) {
  const getCachedPosts = unstable_cache(
    async (initId: string, userId?: string, postStatus?: PostStatus) => {
      const posts = await InitiativePostsService.list(initId, {
        onlyUserId: userId,
        status: postStatus,
      });

      return posts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        postType: p.postType,
        status: p.status,
        isPinned: p.isPinned,
        author: p.author,
        createdAt: p.createdAt.toISOString(),
        attachments: p.attachments,
      }));
    },
    [`initiative-${initiativeId}-posts`, onlyUserId || "all", status || "all"],
    {
      revalidate: 60,
      tags: [`initiative-${initiativeId}-posts`],
    },
  );

  const posts = await getCachedPosts(initiativeId, onlyUserId, status);

  return {
    success: true,
    posts,
  };
}

export async function getPostAction(postId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };

  try {
    const post = await InitiativePostsService.getById(postId);
    if (!post) return { success: false, error: "المنشور غير موجود" };

    return {
      success: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        postType: post.postType,
        status: post.status,
        isPinned: post.isPinned,
        author: post.author,
        createdAt: post.createdAt,
      },
    };
  } catch {
    return { success: false, error: "فشل في جلب المنشور" };
  }
}

export async function updatePostStatusAction(
  postId: string,
  initiativeId: string,
  status: PostStatus,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "يجب تسجيل الدخول" };

  const initiative = await InitiativeService.getById(
    initiativeId,
    session.user.id,
  );
  const isManager =
    initiative?.organizerUserId === session.user.id ||
    initiative?.organizerOrg?.userId === session.user.id;

  await InitiativePostsService.update(
    postId,
    session.user.id,
    { status },
    !!isManager,
  );
  revalidatePath(`/initiatives/${initiativeId}`);
  updateTag(`initiative-${initiativeId}-posts`);

  return {
    success: true,
    message: `تم تغيير حالة المنشور إلى ${status}`,
  };
}
