"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import z from "zod";
import { v4 as uuidv4 } from "uuid";
import { refresh, revalidatePath } from "next/cache";
import {
  registrationSchema,
  type RegistrationFormData,
} from "@/schemas/signupUserSchema";
import { getCallingCodeFromCountry, mimeTypeToExtension } from "@/lib/utils";
import path from "path";
import { UserProfile, validateUserProfile } from "@/schemas";
import { UserService } from "@/services/user";
import { ActionResponse } from "@/types/Statics";
import { getPublicStorageUrl } from "./helpers-sf";
import { AUTHORIZED_REDIRECTION } from "@/data/routes";
import { encodeGeohash } from "@/lib/geohash";
import { SIGNUP_CONSENT_VERSION } from "@/lib/signup-consent-config";
import { redirect } from "next/navigation";
import { logoutAction } from "./logout";

export async function updateUserProfileAction(
  data: UserProfile,
): Promise<ActionResponse<UserProfile, {}>> {
  try {
    // Just in case
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول لتحديث بياناتك الشخصية",
      };
    }

    const userId = session.user.id;

    // Fetch current data for dirty check
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const currentQualification = await prisma.userQualification.findFirst({
      where: { userId },
    });

    const formattedPhone = data.phone
      ? data.phoneCountryCode
        ? `+${getCallingCodeFromCountry(data.phoneCountryCode)} ${data.phone}`
        : "+213 " + data.phone
      : null;

    const normalizedSex =
      data.sex === "unspecified" || !data.sex ? null : data.sex;

    const geohash =
      data.latitude !== undefined && data.longitude !== undefined
        ? encodeGeohash(data.latitude, data.longitude)
        : null;

    const hasUserChanged =
      currentUser?.firstName !== data.firstName ||
      currentUser?.lastName !== data.lastName ||
      currentUser?.sex !== normalizedSex ||
      currentUser?.phone !== formattedPhone ||
      (currentUser?.city || null) !== (data.city || null) ||
      currentUser?.state !== data.state ||
      currentUser?.country !== data.country ||
      (currentUser?.bio || null) !== (data.bio || null) ||
      (currentUser?.geohash || null) !== geohash;

    const hasQualsChanged = data.qualifications
      ? currentQualification?.specification !==
          data.qualifications.specification ||
        currentQualification?.educationalLevel !==
          data.qualifications.educationalLevel ||
        (currentQualification?.currentJob || "") !==
          (data.qualifications.currentJob || "")
      : false;

    if (!hasUserChanged && !hasQualsChanged) {
      return {
        success: true,
        message: "تم تحديث البيانات الشخصية بنجاح",
      };
    }

    validateUserProfile(data);
    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        sex: normalizedSex,
        phone: formattedPhone ?? null,
        city: data.city,
        state: data.state,
        country: data.country,
        bio: data.bio || null,
        geohash: geohash ?? undefined,
        updatedAt: new Date(),
      },
    });

    // Update qualifications record
    if (data.qualifications) {
      const existingQualification = await prisma.userQualification.findFirst({
        where: { userId },
      });

      if (existingQualification) {
        await prisma.userQualification.update({
          where: { id: existingQualification.id },
          data: {
            specification: data.qualifications.specification,
            educationalLevel: data.qualifications.educationalLevel,
            currentJob: data.qualifications.currentJob || "",
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.userQualification.create({
          data: {
            userId,
            specification: data.qualifications.specification,
            educationalLevel: data.qualifications.educationalLevel,
            currentJob: data.qualifications.currentJob || "",
          },
        });
      }
    }

    revalidatePath("/profile");

    return {
      success: true,
      message: "تم تحديث البيانات الشخصية بنجاح",
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error instanceof z.ZodError) {
      const treeError = z.treeifyError(error);
      const fieldErrors: Partial<Record<keyof UserProfile, string[]>> = {};

      if (typeof treeError === "object" && treeError !== null) {
        for (const [field, fieldError] of Object.entries(treeError)) {
          if (
            field !== "formErrors" &&
            typeof fieldError === "object" &&
            fieldError !== null &&
            "errors" in fieldError
          ) {
            fieldErrors[field as keyof UserProfile] = (
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
      error: "حدث خطأ أثناء تحديث البيانات الشخصية، يرجى المحاولة مرة أخرى",
    };
  }
}

export async function completeProfileAction(
  data: RegistrationFormData,
): Promise<
  ActionResponse<
    RegistrationFormData,
    {
      redirectTo: string;
    }
  >
> {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولاً",
      };
    }

    const validatedData = registrationSchema.parse(data);

    const finalEducationalLevel =
      validatedData.educationalLevel === "other" &&
      validatedData.customEducationalLevel
        ? validatedData.customEducationalLevel
        : validatedData.educationalLevel;

    const normalizedSex =
      validatedData.sex === "unspecified" ? null : validatedData.sex;

    const geohash =
      validatedData.latitude !== undefined &&
      validatedData.longitude !== undefined
        ? encodeGeohash(validatedData.latitude, validatedData.longitude)
        : null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        // Personal Information (Step 1)
        dateOfBirth: new Date(validatedData.dateOfBirth),
        sex: normalizedSex,
        phone: validatedData.phone ?? null,
        city: validatedData.city,
        state: validatedData.state,
        country: validatedData.country,
        geohash,

        // Bio and user type
        bio: validatedData.bio,
        userType: validatedData.userType,

        // Profile completion flag
        profileCompleted: true,
        updatedAt: new Date(),
      },
    });

    // Create or update UserQualification record
    const existingQualification = await prisma.userQualification.findFirst({
      where: { userId: session.user.id },
    });

    if (existingQualification) {
      await prisma.userQualification.update({
        where: { id: existingQualification.id },
        data: {
          specification: validatedData.specification,
          educationalLevel: finalEducationalLevel,
          currentJob: validatedData.currentJob || "",
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.userQualification.create({
        data: {
          userId: session.user.id,
          specification: validatedData.specification,
          educationalLevel: finalEducationalLevel,
          currentJob: validatedData.currentJob || "",
        },
      });
    }

    return {
      success: true,
      message: "تم إكمال الملف الشخصي بنجاح",
      data: { redirectTo: AUTHORIZED_REDIRECTION },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const treeError = z.treeifyError(error);
      // Convert the tree structure to field errors format
      const fieldErrors: Partial<Record<keyof RegistrationFormData, string[]>> =
        {};

      // Extract field-specific errors from the tree structure
      if (typeof treeError === "object" && treeError !== null) {
        for (const [field, fieldError] of Object.entries(treeError)) {
          if (
            field !== "formErrors" &&
            typeof fieldError === "object" &&
            fieldError !== null &&
            "errors" in fieldError
          ) {
            fieldErrors[field as keyof RegistrationFormData] = (
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

    console.error("Profile completion error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى",
    };
  }
}

/** Fetch the user image for the currently logged-in user, or a specific user by ID.
 * @returns the image path or null
 */
export async function getUserImage(id?: string): Promise<string | null> {
  try {
    let userId = id;
    if (!userId) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) return null;
      userId = session.user.id;
    }

    const data = await UserService.getUserImage(userId);
    return data?.image || null;
  } catch (error) {
    console.error("Failed to fetch user image:", error);
    return null;
  }
}

export async function privacyPolicyConsentAction(): Promise<
  ActionResponse<null, {}>
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولاً",
      };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        consentGiven: true,
        consentGivenAt: new Date(),
        consentVersion: SIGNUP_CONSENT_VERSION,
      },
    });

    return {
      success: true,
      message: "تم تسجيل موافقتك على سياسة الخصوصية بنجاح",
    };
  } catch (error) {
    console.error("Error recording privacy policy consent:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء تسجيل موافقتك. يرجى المحاولة مرة أخرى",
    };
  }
}

export async function deleteUserAccountAction(): Promise<
  ActionResponse<null, {}>
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session || !session.user) {
    return {
      success: false,
      error: "يجب تسجيل الدخول لتحديث بياناتك الشخصية",
    };
  }

  await logoutAction();

  try {
    await UserService.deleteUser(session.user.id);
    return {
      success: true,
      message: "تم حذف حسابك بنجاح",
    };
  } catch (error) {
    console.error("Error deleting user account:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء حذف حسابك. يرجى المحاولة مرة أخرى",
    };
  }
}
