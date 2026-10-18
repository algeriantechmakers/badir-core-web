import { prisma } from "@/lib/db";
import { ALLOWED_INITIATIVE_IMAGES } from "@/types/Statics";
import { PostStatus, PostType, Prisma } from "@prisma/client";

export interface Post extends Prisma.InitiativePostGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        image: true;
        participations: {
          select: {
            participantRole: true;
          };
        };
        organization: { select: { id: true; name: true } };
      };
    };
    attachments: true;
  };
}> {}

export class InitiativePostsService {
  static async remove(postId: string): Promise<{
    authorEmail: string;
    authorName: string;
    postTitle: string;
    initiativeTitle: string;
    organizerOrgId: string | null;
  }> {
    const post = await prisma.initiativePost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { email: true, name: true } },
        initiative: { select: { titleAr: true, organizerOrgId: true } },
      },
    });

    if (!post) throw new Error("المنشور غير موجود");
    if (!post.author) throw new Error("لا يمكن إخطار صاحب المنشور");

    await prisma.initiativePost.delete({ where: { id: postId } });
    return {
      authorEmail: post.author.email,
      authorName: post.author.name,
      postTitle: post.title || "منشور بدون عنوان",
      initiativeTitle: post.initiative.titleAr,
      organizerOrgId: post.initiative.organizerOrgId,
    };
  }
  /**
   * Utility to check the number of attachments for an initiative.
   * @param initiativeID Initiative ID
   * @throws Error in Arabic if limit exceeded
   * @returns Number of attachments
   */
  static async checkInitiativeAttachmentsLimit(
    initiativeID: string,
  ): Promise<number> {
    const count = await prisma.postAttachment.count({
      where: {
        post: {
          initiativeId: initiativeID,
        },
      },
    });
    if (count >= ALLOWED_INITIATIVE_IMAGES) {
      throw new Error(
        `تجاوزت الحد المسموح لعدد الصور في المبادرة (${ALLOWED_INITIATIVE_IMAGES})`,
      );
    }
    return count;
  }

  /**
   * List posts for an initiative
   * @param initiativeId Initiative ID
   * @param opts Options
   * @returns List of posts
   */
  static async list(
    initiativeId: string,
    opts?: { status?: PostStatus; onlyUserId?: string },
  ): Promise<Post[]> {
    return prisma.initiativePost.findMany({
      where: {
        initiativeId,
        ...(opts?.onlyUserId ? { authorId: opts.onlyUserId } : {}),
        status: opts?.status,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            participations: {
              where: {
                initiativeId: initiativeId,
              },
              select: {
                participantRole: true,
              },
            },
            organization: { select: { id: true, name: true } },
          },
        },
        attachments: true,
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
  }

  static async getById(postId: string) {
    return prisma.initiativePost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, image: true } },
        attachments: true,
      },
    });
  }

  /**
   * Create a new post
   * @param params Post parameters
   * @returns Created post
   */
  static async create(params: {
    initiativeId: string;
    authorId: string;
    title?: string | null;
    content: string;
    isPinned?: boolean;
    postType?: "announcement" | "update" | "instruction";
    status?: PostStatus;
  }) {
    return prisma.initiativePost.create({
      data: {
        initiativeId: params.initiativeId,
        authorId: params.authorId,
        title: params.title,
        content: params.content,
        isPinned: !!params.isPinned,
        postType: params.postType ?? "announcement",
        status: params.status ?? "draft",
      },
    });
  }

  static async update(
    postId: string,
    userId: string,
    data: {
      title?: string | null;
      content?: string;
      postType?: PostType;
      status?: PostStatus;
    },
    isManager = false,
  ) {
    const post = await prisma.initiativePost.findUnique({
      where: { id: postId },
    });

    if (!post) throw new Error("Post not found");

    // Only allow author or manager to edit
    if (post.authorId !== userId && !isManager) {
      throw new Error("Unauthorized");
    }

    return await prisma.initiativePost.update({
      where: { id: postId },
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  /**
   * Delete a post
   * @param postId Post ID
   * @param requesterId Requester ID
   * @param isManager Whether the requester is a manager
   * @returns Deleted post
   */
  static async delete(postId: string, requesterId: string, isManager: boolean) {
    // Manager can delete any post in initiative; otherwise restrict by authorId
    const where: any = { id: postId };
    if (!isManager) where.authorId = requesterId;
    return prisma.initiativePost.delete({ where });
  }

  /**
   * Pin a post
   * @param postId Post ID
   * @param pin Whether to pin the post
   * @returns Pinned post
   */
  static async pin(postId: string, pin: boolean) {
    return prisma.initiativePost.update({
      where: { id: postId },
      data: { isPinned: pin },
    });
  }

  /**
   * Add an attachment to a post
   * @param initiativePostId ID of the post
   * @param url URL of the attachment
   * @returns Created attachment
   */
  static async addAttachment(initiativePostId: string, url: string) {
    const existing = await prisma.postAttachment.findUnique({
      where: { imageUrl: url },
    });
    if (existing) {
      return existing;
    }
    return prisma.postAttachment.create({
      data: {
        initiativePostId,
        imageUrl: url,
      },
    });
  }

  /**
   * Remove an attachment from a post
   * @param attachmentId Attachment ID to remove
   * @returns Deleted attachment
   */
  static async removeAttachment(imageUrl?: string, attachmentId?: string) {
    if (attachmentId) {
      return prisma.postAttachment.delete({
        where: { id: attachmentId },
      });
    }

    if (imageUrl) {
      return prisma.postAttachment.deleteMany({
        where: { imageUrl },
      });
    }

    throw new Error("Either imageUrl or attachmentId must be provided");
  }

  /**
   * Update or replace a post's image attachment.
   * If the image does not exist, add it.
   * If it exists, remove the old one and add the new one.
   * @param postId Post ID
   * @param newImageUrl New image URL to attach
   * @returns The new attachment record
   */
  static async updatePostImageAttachment(postId: string, newImageUrl: string) {
    const existing = await prisma.postAttachment.findFirst({
      where: { initiativePostId: postId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      if (existing.imageUrl !== newImageUrl) {
        await prisma.postAttachment.delete({
          where: { id: existing.id },
        });
        return await prisma.postAttachment.create({
          data: {
            initiativePostId: postId,
            imageUrl: newImageUrl,
          },
        });
      }
      return existing;
    }

    return await prisma.postAttachment.create({
      data: {
        initiativePostId: postId,
        imageUrl: newImageUrl,
      },
    });
  }
}
