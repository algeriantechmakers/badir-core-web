"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import z from "zod";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import {
  OrgRegistrationFormData,
  orgRegistrationSchema,
} from "@/schemas/signupOrgSchema";
import { AUTHORIZED_REDIRECTION } from "@/data/routes";
import { OrganizationStatus, UserType } from "@prisma/client";
import { StorageHelpers, extractStoragePath } from "@/services/storage";
import { ActionResponse, BUCKETS } from "@/types/Statics";
import { OrganizationService } from "@/services/organizations";
import { getCallingCodeFromCountry, mimeTypeToExtension } from "@/lib/utils";
import path from "path";
import { OrganizationProfile, validateOrganizationProfile } from "@/schemas";
import { getPublicStorageUrl } from "./helpers-sf";

type FileField = "officialLicense" | "logo" | "identificationCard";
type UploadFileField = Exclude<FileField, "officialLicense">;

/**
 * Completes the organization profile setup after registration.
 * @param data the organization registration form data
 */
export async function completeOrgProfileAction(
  data: OrgRegistrationFormData,
): Promise<
  ActionResponse<
    OrganizationProfile,
    {
      redirectTo: string;
    }
  >
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول لإكمال تسجيل المنظمة",
      };
    }
    const userId = session.user.id;

    const existingOrg = await prisma.organization.findFirst({
      where: {
        name: data.officialName,
        contactEmail: data.contactEmail,
        NOT: {
          userId,
        },
      },
    });

    if (existingOrg) {
      return {
        success: false,
        error:
          "يوجد منظمة أخرى بنفس الاسم والبريد الإلكتروني. يرجى استخدام بيانات مختلفة.",
      };
    }

    // validate the data on server just in case, the front validation is working
    orgRegistrationSchema.parse(data);

    const uploadResults: {
      field: UploadFileField;
      url: Promise<string | null>;
    }[] = [];
    const fileFields: UploadFileField[] = ["logo", "identificationCard"];

    for (const field of fileFields) {
      const fileValue = data[field as keyof typeof data];
      if (typeof fileValue === "string" && fileValue.length > 0) {
        const { base64, name, type } = JSON.parse(fileValue);

        const fileBuffer = Buffer.from(base64, "base64");
        let ext = path.extname(name);
        if (!ext && type) {
          ext = mimeTypeToExtension(type) || ".bin";
        }

        const fileName = `${uuidv4()}.${name
          .replace(/\s+/g, "-")
          .replace(ext, "")}${ext}`;
        const bucketName: BUCKETS = field === "logo" ? "avatars" : "documents";
        const filePath = `${userId}/${fileName}`;

        const storage = new StorageHelpers();
        const uploadResult = await storage
          .uploadFile(bucketName, filePath, fileBuffer, type)
          .then((result) => ({
            field,
            url: getPublicStorageUrl(bucketName, result.path),
          }))
          .catch((error) => {
            console.error(`Error uploading ${field}:`, error);
            throw new Error(`Failed to upload ${field}: ${error.message}`);
          });

        uploadResults.push(uploadResult);
      }
    }

    let uploadedUrls: Partial<Record<FileField, string | null>> = {
      logo: null,
      identificationCard: null,
    };

    uploadedUrls = Object.fromEntries(
      await Promise.all(
        uploadResults.map(async (p) => [p.field, await p.url] as const),
      ),
    ) as Partial<Record<FileField, string | null>>;

    const processedFormData = {
      ...data,
      ...uploadedUrls,
      officialLicense: data.isLicensed ? data.officialLicense : "",
    };

    const formattedPhone = processedFormData.contactPhone
      ? `+${getCallingCodeFromCountry(
          processedFormData.contactPhoneCountryCode,
        )} ${processedFormData.contactPhone}`
      : undefined;

    const formattedPhoneOrg = processedFormData.contactPhoneOrg
      ? `+${getCallingCodeFromCountry(
          processedFormData.contactPhoneOrgCountryCode,
        )} ${processedFormData.contactPhoneOrg}`
      : undefined;

    const organization = await prisma.organization.upsert({
      where: { userId },
      update: {
        name: processedFormData.officialName,
        shortName: processedFormData.shortName || undefined,
        description: processedFormData.shortDescription || undefined,
        contactEmail: processedFormData.contactEmail,
        contactPhone: formattedPhoneOrg,
        foundingDate: processedFormData.foundingDate || undefined,
        membersCount: processedFormData.membersCount || undefined,
        headquarters: processedFormData.headquarters || undefined,
        logo: processedFormData.logo || undefined,
        website: undefined,
        socialLinks: {},
        city: processedFormData.city || undefined,
        state: processedFormData.state,
        country: processedFormData.country,
        organizationType: processedFormData.organizationType,
        workAreas: processedFormData.workAreas,
        previousInitiatives: processedFormData.previousInitiatives || undefined,
        officialLicense: processedFormData.officialLicense || undefined,
        identificationCard: processedFormData.identificationCard || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        name: processedFormData.officialName,
        shortName: processedFormData.shortName || "",
        description: processedFormData.shortDescription || undefined,
        contactEmail: processedFormData.contactEmail,
        contactPhone: formattedPhoneOrg,
        foundingDate: processedFormData.foundingDate || undefined,
        membersCount: processedFormData.membersCount || undefined,
        headquarters: processedFormData.headquarters || undefined,
        logo: processedFormData.logo || undefined,
        website: undefined,
        socialLinks: {},
        city: processedFormData.city || undefined,
        state: processedFormData.state,
        country: processedFormData.country,
        organizationType: processedFormData.organizationType,
        workAreas: processedFormData.workAreas,
        previousInitiatives: processedFormData.previousInitiatives || undefined,
        officialLicense: processedFormData.officialLicense || undefined,
        identificationCard: processedFormData.identificationCard || undefined,
        userRole: processedFormData.role || "رئيس المنظمة",
        status: OrganizationStatus.pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update user record to set type to organizer
    await prisma.user.update({
      where: { id: userId },
      data: {
        userType: UserType.organization,
        phone: formattedPhone,
        profileCompleted: processedFormData.acceptConditions || false,
        organization: {
          connect: { id: organization.id },
        },
        updatedAt: new Date(),
      },
    });

    revalidatePath(AUTHORIZED_REDIRECTION);
    return {
      success: true,
      message: "تم إكمال تسجيل المنظمة بنجاح",
      data: { redirectTo: AUTHORIZED_REDIRECTION },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const treeError = z.treeifyError(error);
      const fieldErrors: Partial<
        Record<keyof OrgRegistrationFormData, string[]>
      > = {};

      // Extract field-specific errors from the tree structure
      if (typeof treeError === "object" && treeError !== null) {
        for (const [field, fieldError] of Object.entries(treeError)) {
          if (
            field !== "formErrors" &&
            typeof fieldError === "object" &&
            fieldError !== null &&
            "errors" in fieldError
          ) {
            fieldErrors[field as keyof OrgRegistrationFormData] = (
              fieldError as { errors: string[] }
            ).errors;
          }
        }
      }

      return {
        success: false,
        errors: fieldErrors,
      };
    }

    console.error("Organization profile completion error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء حفظ بيانات المنظمة. يرجى المحاولة مرة أخرى",
    };
  }
}

/**
 * Updates the organization profile.
 * @param data the organization profile data to update
 */
export async function updateOrganizationProfileAction(
  data: OrganizationProfile,
): Promise<ActionResponse<OrganizationProfile, {}>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول لتحديث بيانات المنظمة",
      };
    }
    const userId = session.user.id;

    const isEmailNameTaken = await prisma.organization.findFirst({
      where: {
        contactEmail: data.contactEmail,
        name: data.name,
        NOT: { userId },
      },
    });

    if (isEmailNameTaken) {
      return {
        success: false,
        error: "البريد الإلكتروني أو الاسم مستخدم بالفعل",
      };
    }

    const validationResult = validateOrganizationProfile(data);
    if (!validationResult.success) {
      throw validationResult.error;
    }

    const userWithOrg = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!userWithOrg?.organization) {
      return {
        success: false,
        error: "لم يتم العثور على منظمة مرتبطة بهذا المستخدم",
      };
    }

    const organizationId = userWithOrg.organization.id;
    const uploadResults: Record<string, string | null> = {};

    // Handle file uploads (logo, ID card). Do I need to add ID card here?
    const fileFields = ["logo", "identificationCard"];
    // const fileFields = ["logo"];

    for (const field of fileFields) {
      const fileValue = data[field as keyof typeof data];
      if (
        typeof fileValue === "string" &&
        fileValue.length > 0 &&
        fileValue.startsWith("{")
      ) {
        try {
          const { base64, name, type } = JSON.parse(fileValue);

          const orgLogo = userWithOrg.organization.logo;

          const fileBuffer = Buffer.from(base64, "base64");

          let ext = path.extname(name);
          if (!ext && type) {
            ext = mimeTypeToExtension(type) || ".bin";
          }

          const fileName = `${uuidv4()}.${name
            .replace(/\s+/g, "-")
            .replace(ext, "")}${ext}`;
          const bucketName: BUCKETS =
            field === "logo" ? "avatars" : "documents";
          const filePath = `${userId}/${fileName}`;

          const storage = new StorageHelpers();
          const result = await storage.uploadFile(
            bucketName,
            filePath,
            fileBuffer,
            type,
          );

          if (result.path && orgLogo && orgLogo) {
            try {
              const pathToDelete = extractStoragePath(orgLogo);
              if (pathToDelete) {
                await storage.deleteFile("avatars", pathToDelete);
              }
            } catch (deleteError) {
              console.error("Failed to delete old profile image:", deleteError);
            }
          }

          uploadResults[field] = await getPublicStorageUrl(
            bucketName,
            result.path,
          );
        } catch (error) {
          console.error(`Error uploading ${field}:`, error);
          return {
            success: false,
            error: `حدث خطأ أثناء رفع ${
              field === "logo" ? "الشعار" : "بطاقة التعريف"
            }`,
          };
        }
      }
    }

    // Format phone number if provided
    const formattedPhone =
      data.contactPhone && data.contactPhoneCountryCode
        ? `+${getCallingCodeFromCountry(data.contactPhoneCountryCode)} ${
            data.contactPhone
          }`
        : data.contactPhone;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name,
        shortName: data.shortName || "",
        description: data.description || null,
        contactEmail: data.contactEmail,
        contactPhone: formattedPhone || null,
        foundingDate: data.foundingDate ? new Date(data.foundingDate) : null,
        membersCount: data.membersCount || null,
        headquarters: data.headquarters || null,
        city: data.city || null,
        state: data.state,
        country: data.country,
        organizationType: data.organizationType,
        workAreas: data.workAreas,
        previousInitiatives: data.previousInitiatives || null,
        userRole: data.userRole || "رئيس المنظمة",
        logo: uploadResults.logo || userWithOrg.organization.logo || undefined,
        officialLicense: data.isLicensed ? data.officialLicense || null : null,
        // identificationCard:
        //   uploadResults.identificationCard ||
        //   userWithOrg.organization.identificationCard,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/profile");
    revalidatePath("/organizations");
    revalidatePath("/");

    return {
      success: true,
      message: "تم تحديث بيانات المنظمة بنجاح",
    };
  } catch (error) {
    console.error("Error updating organization profile:", error);
    if (error instanceof z.ZodError) {
      const treeError = z.treeifyError(error);
      const fieldErrors: Partial<Record<keyof OrganizationProfile, string[]>> =
        {};

      if (typeof treeError === "object" && treeError !== null) {
        for (const [field, fieldError] of Object.entries(treeError)) {
          if (
            field !== "formErrors" &&
            typeof fieldError === "object" &&
            fieldError !== null &&
            "errors" in fieldError
          ) {
            fieldErrors[field as keyof OrganizationProfile] = (
              fieldError as { errors: string[] }
            ).errors;
          }
        }
      }
      return {
        success: false,
        errors: fieldErrors,
      };
    }
    return {
      success: false,
      error: "حدث خطأ أثناء تحديث بيانات المنظمة، يرجى المحاولة مرة أخرى",
    };
  }
}

/**
 * Fetch organization data for the currently logged-in user
 * @return the organization data or null if not found
 */
export async function getOrganizationData() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return null;

    return await OrganizationService.getOrganizationByUserId(session.user.id);
  } catch (error) {
    console.error("Failed to fetch organization data:", error);
    return null;
  }
}

/**
 * Fetch the organization logo for the currently logged-in user, or a specific organization by ID.
 * @returns the logo path or null
 */
export async function getOrganizationLogo(id?: string): Promise<string | null> {
  try {
    let orgId = id;
    if (!orgId) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) return null;
      orgId = session.user.id;
    }

    const data = await OrganizationService.getOrganizationLogo(orgId);

    return data?.logo || null;
  } catch (error) {
    console.error("Failed to fetch organization logo:", error);
    return null;
  }
}
