"use server";

import {
  AdminService,
  OrganizationFilters,
  InitiativeFilters,
  UserFilters,
} from "@/services/admin";
import { OrganizationStatus, InitiativeStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/Statics";
import { checkAdminPermission } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { enforce, ManagementAction } from "@/lib/permissions";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { OrganizationService } from "@/services/organizations";
import { UserService } from "@/services/user";
import { sanitizePlainText } from "@/lib/santitize-server";
import emailConfig, { sendMail } from "@/lib/email";
import { render } from "react-email";
import OrganizationFrozenEmail from "@/emails/OrganizationFrozenEmail";
import OrganizationRemovedEmail from "@/emails/OrganizationRemovedEmail";
import OrganizationUnfrozenEmail from "@/emails/OrganizationUnfrozenEmail";
import UserFrozenEmail from "@/emails/UserFrozenEmail";
import UserRemovedEmail from "@/emails/UserRemovedEmail";
import UserUnfrozenEmail from "@/emails/UserUnfrozenEmail";

/**
 * Get paginated organizations for admin review
 */
export async function getOrganizationsAction(
  filters: OrganizationFilters = {},
  page: number = 1,
  limit: number = 10,
) {
  try {
    await checkAdminPermission(true);

    const result = await AdminService.getOrganizations(filters, {
      page,
      limit,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء جلب المنظمات",
    };
  }
}

/**
 * Get paginated users for admin management
 */
export async function getUsersAction(
  filters: UserFilters = {},
  page: number = 1,
  limit: number = 20,
) {
  try {
    await checkAdminPermission(true);

    const result = await AdminService.getUsers(filters, {
      page,
      limit,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء جلب المستخدمين",
    };
  }
}

/**
 * Get user initiatives for admin review
 */
export async function getUserInitiativesAction(
  filters: InitiativeFilters = {},
  page: number = 1,
  limit: number = 10,
) {
  try {
    await checkAdminPermission(true);

    const result = await AdminService.getUserInitiatives(filters, {
      page,
      limit,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching user initiatives:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء جلب المبادرات",
    };
  }
}

/**
 * Update organization approval status
 */
export async function updateOrganizationStatusAction(
  organizationId: string,
  status: OrganizationStatus,
  rejectionReason?: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const adminUserId = await checkAdminPermission();

    const result = await AdminService.updateOrganizationStatus(
      organizationId,
      status,
      adminUserId,
      rejectionReason,
    );

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${organizationId}`);

    return {
      success: true,
      message: result.message,
      data: {},
    };
  } catch (error) {
    console.error("Error updating organization status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث حالة المنظمة",
    };
  }
}

/**
 * Toggle organization verification state
 */
export async function updateOrgVerificationAction(
  organizationId: string,
  isVerified: boolean,
): Promise<ActionResponse<{}, {}>> {
  try {
    await checkAdminPermission();

    await AdminService.updateOrgVerification(organizationId, isVerified);

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${organizationId}`);
    revalidatePath(`/organizations/${organizationId}`);
    revalidatePath(`/profile/${organizationId}`);

    return {
      success: true,
      message: isVerified ? "تم توثيق المنظمة بنجاح" : "تم إلغاء توثيق المنظمة",
      data: {},
    };
  } catch (error) {
    console.error("Error updating organization verification:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث توثيق المنظمة",
    };
  }
}

export async function freezeOrganization(
  orgId: string,
  adminMessage: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("يجب تسجيل الدخول");
    }

    enforce(session.user.role, ManagementAction.FREEZE_ORGANIZATION);

    const sanitizedMessage = sanitizePlainText(adminMessage).trim();
    if (!sanitizedMessage) {
      throw new Error("يرجى إدخال رسالة للمؤسسة");
    }

    const organization =
      await OrganizationService.getOwnerNotificationDetails(orgId);

    await OrganizationService.freeze(orgId);

    const contactUrl = `${process.env.APP_URL || "https://badir.space"}/contact`;
    const emailHtml = await render(
      OrganizationFrozenEmail({
        orgName: organization.orgName,
        adminMessage: sanitizedMessage,
        contactUrl,
      }),
    );

    await sendMail({
      from: emailConfig.fromEmail,
      to: organization.ownerEmail,
      subject: `تم تجميد منظمتك "${organization.orgName}" على منصة بادر`,
      replyTo: emailConfig.contactEmail,
      html: emailHtml,
    });

    await writeAudit(
      session.user.id,
      ManagementAction.FREEZE_ORGANIZATION,
      orgId,
    );

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);

    return {
      success: true,
      message: "تم تجميد المنظمة بنجاح",
      data: {},
    };
  } catch (error) {
    console.error("Error freezing organization:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء تجميد المنظمة",
    };
  }
}

export async function unfreezeOrganization(
  orgId: string,
  message?: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("يجب تسجيل الدخول");
    }

    enforce(session.user.role, ManagementAction.UNFREEZE_ORGANIZATION);

    const sanitizedMessage = sanitizePlainText(message || "").trim();

    const organization =
      await OrganizationService.getOwnerNotificationDetails(orgId);

    await OrganizationService.unfreeze(orgId);

    const contactUrl = `${process.env.APP_URL || "https://badir.space"}/contact`;

    if (sanitizedMessage) {
      const emailHtml = await render(
        OrganizationUnfrozenEmail({
          orgName: organization.orgName,
          adminMessage: sanitizedMessage,
          contactUrl,
        }),
      );

      await sendMail({
        from: emailConfig.fromEmail,
        to: organization.ownerEmail,
        subject: `تم إلغاء تجميد منظمتك "${organization.orgName}" على منصة بادر`,
        replyTo: emailConfig.contactEmail,
        html: emailHtml,
      });
    }

    await writeAudit(
      session.user.id,
      ManagementAction.UNFREEZE_ORGANIZATION,
      orgId,
    );

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);

    return { success: true, message: "تم إلغاء تجميد المنظمة بنجاح", data: {} };
  } catch (error) {
    console.error("Error unfreezing organization:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إلغاء تجميد المنظمة",
    };
  }
}

export async function removeOrganization(
  orgId: string,
  adminMessage: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("يجب تسجيل الدخول");
    }

    enforce(session.user.role, ManagementAction.REMOVE_ORGANIZATION);

    const sanitizedMessage = sanitizePlainText(adminMessage).trim();
    if (!sanitizedMessage) {
      throw new Error("يرجى إدخال رسالة للمؤسسة");
    }

    const deletionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const deletionDeadline = new Intl.DateTimeFormat("ar-DZ", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Algiers",
    }).format(deletionDate);

    const organization = await OrganizationService.remove(orgId);

    await UserService.scheduleAccountDeletion(organization.ownerUserId);

    const contactUrl = `${process.env.APP_URL || "https://badir.space"}/contact`;
    const emailHtml = await render(
      OrganizationRemovedEmail({
        orgName: organization.orgName,
        adminMessage: sanitizedMessage,
        deletionDeadline,
        contactUrl,
      }),
    );

    await sendMail({
      from: emailConfig.fromEmail,
      to: organization.ownerEmail,
      subject: `تم حذف منظمتك "${organization.orgName}" من منصة بادر`,
      replyTo: emailConfig.contactEmail,
      html: emailHtml,
    });

    await writeAudit(
      session.user.id,
      ManagementAction.REMOVE_ORGANIZATION,
      orgId,
    );

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);

    return {
      success: true,
      message: "تم حذف المنظمة وجدولة حذف حساب المالك بنجاح",
      data: {},
    };
  } catch (error) {
    console.error("Error removing organization:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء حذف المنظمة",
    };
  }
}

export async function freezeUser(
  userId: string,
  adminMessage: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("يجب تسجيل الدخول");

    enforce(session.user.role, ManagementAction.FREEZE_USER);

    const sanitizedMessage = sanitizePlainText(adminMessage).trim();
    if (!sanitizedMessage) throw new Error("يرجى إدخال رسالة للمستخدم");

    const user = await UserService.freeze(userId);
    const contactUrl = `${process.env.APP_URL || "https://badir.space"}/contact`;
    const emailHtml = await render(
      UserFrozenEmail({
        userName: user.userName,
        adminMessage: sanitizedMessage,
        contactUrl,
      }),
    );

    await sendMail({
      from: emailConfig.fromEmail,
      to: user.userEmail,
      subject: "تم تجميد حسابك على منصة بادر",
      replyTo: emailConfig.contactEmail,
      html: emailHtml,
    });

    await writeAudit(session.user.id, ManagementAction.FREEZE_USER, userId);
    revalidatePath("/admin/users");
    return { success: true, message: "تم تجميد المستخدم بنجاح", data: {} };
  } catch (error) {
    console.error("Error freezing user:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء تجميد المستخدم",
    };
  }
}

export async function unfreezeUser(
  userId: string,
  adminMessage: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("يجب تسجيل الدخول");

    enforce(session.user.role, ManagementAction.FREEZE_USER);

    const sanitizedMessage = sanitizePlainText(adminMessage).trim();
    if (!sanitizedMessage) throw new Error("يرجى إدخال رسالة للمستخدم");

    const user = await UserService.getUser(userId);
    if (!user) throw new Error("المستخدم غير موجود");

    await UserService.unfreeze(userId);

    const contactUrl = `${process.env.APP_URL || "https://badir.space"}/contact`;
    const emailHtml = await render(
      UserUnfrozenEmail({
        userName: user.name,
        adminMessage: sanitizedMessage,
        contactUrl,
      }),
    );

    await sendMail({
      from: emailConfig.fromEmail,
      to: user.email,
      subject: "تم إعادة تفعيل حسابك على منصة بادر",
      replyTo: emailConfig.contactEmail,
      html: emailHtml,
    });
    await writeAudit(session.user.id, ManagementAction.FREEZE_USER, userId);
    revalidatePath("/admin/users");
    return {
      success: true,
      message: "تم إلغاء تجميد المستخدم بنجاح",
      data: {},
    };
  } catch (error) {
    console.error("Error unfreezing user:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إلغاء تجميد المستخدم",
    };
  }
}

export async function removeUser(
  userId: string,
  adminMessage: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("يجب تسجيل الدخول");

    enforce(session.user.role, ManagementAction.REMOVE_USER);

    const sanitizedMessage = sanitizePlainText(adminMessage).trim();
    if (!sanitizedMessage) throw new Error("يرجى إدخال رسالة للمستخدم");

    const user = await UserService.getUser(userId);
    if (!user) throw new Error("المستخدم غير موجود");

    const deletionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const deletionDeadline = new Intl.DateTimeFormat("ar-DZ", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Algiers",
    }).format(deletionDate);

    await UserService.scheduleAccountDeletion(userId);
    const contactUrl = `${process.env.APP_URL || "https://badir.space"}/contact`;
    const emailHtml = await render(
      UserRemovedEmail({
        userName: user.name,
        adminMessage: sanitizedMessage,
        deletionDeadline,
        contactUrl,
      }),
    );

    await sendMail({
      from: emailConfig.fromEmail,
      to: user.email,
      subject: "سيتم حذف حسابك من منصة بادر",
      replyTo: emailConfig.contactEmail,
      html: emailHtml,
    });

    await writeAudit(session.user.id, ManagementAction.REMOVE_USER, userId);
    revalidatePath("/admin/users");
    return {
      success: true,
      message: "تم جدولة حذف المستخدم بنجاح",
      data: {},
    };
  } catch (error) {
    console.error("Error removing user:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء حذف المستخدم",
    };
  }
}

/**
 * Update initiative approval status
 */
export async function updateInitiativeStatusAction(
  initiativeId: string,
  status: InitiativeStatus,
  rejectionReason?: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const adminUserId = await checkAdminPermission(true);

    const result = await AdminService.updateInitiativeStatus(
      initiativeId,
      status,
      adminUserId,
      rejectionReason,
    );

    revalidatePath("/admin/initiatives");
    revalidatePath(`/admin/initiatives/${initiativeId}`);
    revalidatePath("/initiatives"); // Also revalidate public initiatives page

    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    console.error("Error updating initiative status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث حالة المبادرة",
    };
  }
}

/**
 * Get organization details for admin review
 */
export async function getOrganizationDetailsAction(organizationId: string) {
  try {
    await checkAdminPermission(true);

    const organization = await AdminService.getOrganizationById(organizationId);

    if (!organization) {
      return {
        success: false,
        error: "المنظمة غير موجودة",
      };
    }

    return {
      success: true,
      data: organization,
    };
  } catch (error) {
    console.error("Error fetching organization details:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء جلب تفاصيل المنظمة",
    };
  }
}

/**
 * Get initiative details for admin review
 */
export async function getInitiativeDetailsAction(initiativeId: string) {
  try {
    await checkAdminPermission(true);

    const initiative = await AdminService.getInitiativeById(initiativeId);

    if (!initiative) {
      return {
        success: false,
        error: "المبادرة غير موجودة",
      };
    }

    return {
      success: true,
      data: initiative,
    };
  } catch (error) {
    console.error("Error fetching initiative details:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء جلب تفاصيل المبادرة",
    };
  }
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStatsAction() {
  try {
    await checkAdminPermission(true);

    const stats = await AdminService.getAdminStats();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء جلب الإحصائيات",
    };
  }
}

/**
 * Create a new initiative category
 */
export async function createInitiativeCategoryAction(data: {
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string;
  bgColor?: string;
  textColor?: string;
  isActive?: boolean;
}): Promise<ActionResponse<{}, {}>> {
  try {
    await checkAdminPermission();

    const category = await AdminService.createInitiativeCategory(data);

    revalidatePath("/admin/categories");

    return {
      success: true,
      message: "تم إنشاء الفئة بنجاح",
      data: category,
    };
  } catch (error) {
    console.error("Error creating category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الفئة",
    };
  }
}

/**
 * List all initiative categories
 */
export async function listInitiativeCategoriesAction() {
  try {
    await checkAdminPermission();

    const categories = await AdminService.listInitiativeCategories();

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء جلب الفئات",
    };
  }
}

/**
 * Update an initiative category
 */
export async function updateInitiativeCategoryAction(
  categoryId: string,
  data: {
    nameAr: string;
    nameEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    icon?: string;
    bgColor?: string;
    textColor?: string;
    isActive?: boolean;
  },
): Promise<ActionResponse<{}, {}>> {
  try {
    await checkAdminPermission();

    const category = await AdminService.updateInitiativeCategory(
      categoryId,
      data,
    );

    revalidatePath("/admin/categories");

    return {
      success: true,
      message: "تم تحديث الفئة بنجاح",
      data: category,
    };
  } catch (error) {
    console.error("Error updating category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الفئة",
    };
  }
}

/**
 * Delete an initiative category
 */
export async function deleteInitiativeCategoryAction(
  categoryId: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    await checkAdminPermission();

    await AdminService.deleteInitiativeCategory(categoryId);

    revalidatePath("/admin/categories");

    return {
      success: true,
      message: "تم حذف الفئة بنجاح",
      data: {},
    };
  } catch (error) {
    console.error("Error deleting category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء حذف الفئة",
    };
  }
}

/**
 * Get approved organizations for partner selection
 */
export async function getApprovedOrganizationsAction(
  filters: { search?: string } = {},
  page: number = 1,
  limit: number = 20,
) {
  try {
    await checkAdminPermission();

    const result = await AdminService.getApprovedOrganizations(filters, {
      page,
      limit,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching approved organizations:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء جلب المنظمات",
    };
  }
}

/**
 * Toggle featured partner status for an organization
 */
export async function toggleFeaturedPartnerAction(
  organizationId: string,
  isFeatured: boolean,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("يجب تسجيل الدخول");
    }

    enforce(session.user.role, ManagementAction.SET_FEATURED_PARTNER);

    await AdminService.toggleFeaturedPartner(organizationId, isFeatured);

    revalidatePath("/admin/partners");
    revalidatePath("/");

    return {
      success: true,
      message: isFeatured
        ? "تم إضافة المنظمة كشريك مميز بنجاح"
        : "تم إزالة المنظمة من الشركاء المميزين",
      data: {},
    };
  } catch (error) {
    console.error("Error toggling featured partner:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الشريك",
    };
  }
}

export async function approveOrganization(orgId: string) {
  // 1. Authenticate
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthenticated");

  // 2. Enforce (PEP delegates decision to PDP)
  enforce(session.user.role, ManagementAction.APPROVE_ORGANIZATION);

  // 3. Act
  await prisma.organization.update({
    where: { id: orgId },
    data: { status: "approved" },
  });

  // 4. Audit
  await writeAudit(
    session.user.id,
    ManagementAction.APPROVE_ORGANIZATION,
    orgId,
  );
}

export async function assignManager(
  userId: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("يجب تسجيل الدخول");
    }

    enforce(session.user.role, ManagementAction.ASSIGN_MANAGER);

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      throw new Error("المستخدم غير موجود");
    }

    if (targetUser.role === UserRole.ADMIN) {
      throw new Error("لا يمكن تعديل دور المدير العام");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.MANAGER },
    });

    await writeAudit(session.user.id, ManagementAction.ASSIGN_MANAGER, userId);

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "تم تعيين المستخدم كمدير بنجاح",
    };
  } catch (error) {
    console.error("Error assigning manager:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "حدث خطأ أثناء تعيين المدير",
    };
  }
}

export async function revokeManager(
  userId: string,
): Promise<ActionResponse<{}, {}>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("يجب تسجيل الدخول");
    }

    enforce(session.user.role, ManagementAction.ASSIGN_MANAGER);

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      throw new Error("المستخدم غير موجود");
    }

    if (targetUser.role === UserRole.ADMIN) {
      throw new Error("لا يمكن تعديل دور المدير العام");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.USER },
    });

    await writeAudit(session.user.id, ManagementAction.ASSIGN_MANAGER, userId);

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "تمت إزالة صلاحيات المدير بنجاح",
    };
  } catch (error) {
    console.error("Error revoking manager:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء سحب صلاحيات المدير",
    };
  }
}
