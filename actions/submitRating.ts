"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import emailConfig from "@/lib/email";
import {
  platformRatingSchema,
  PlatformRatingFormData,
} from "@/schemas/platformRatingSchema";
import { headers } from "next/headers";
import z from "zod";

export async function submitRating(formData: PlatformRatingFormData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  errors?: Partial<Record<keyof PlatformRatingFormData, string[]>>;
}> {
  const validationResult = platformRatingSchema.safeParse(formData);

  if (!validationResult.success) {
    const treeErrors = z.treeifyError(validationResult.error);

    const fieldErrors: Partial<Record<keyof PlatformRatingFormData, string[]>> =
      {};

    if (typeof treeErrors === "object" && treeErrors !== null) {
      for (const [field, fieldError] of Object.entries(treeErrors)) {
        if (
          typeof fieldError === "object" &&
          fieldError !== null &&
          "errors" in fieldError
        ) {
          fieldErrors[field as keyof PlatformRatingFormData] = (
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

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول لإرسال التقييم",
      };
    }

    const isCritical =
      [
        formData.easeOfUse,
        formData.informationClarity,
        formData.contentDiversity,
        formData.performanceSpeed,
        formData.generalSatisfaction,
      ].filter((rating) => rating === "ضعيف").length >= 3;

    // Save the rating to database
    await prisma.platformRating.create({
      data: {
        userId: session.user.id,
        easeOfUse: formData.easeOfUse,
        informationClarity: formData.informationClarity,
        contentDiversity: formData.contentDiversity,
        performanceSpeed: formData.performanceSpeed,
        generalSatisfaction: formData.generalSatisfaction,
        usefulSections: formData.usefulSections,
        encounteredDifficulties: formData.encounteredDifficulties,
        difficultiesDetails: formData.difficultiesDetails || "",
        improvementSuggestions: formData.improvementSuggestions || "",
        wouldRecommend: formData.wouldRecommend,
        appRating: formData.appRating,
      },
    });

    // send critical feedback alert to admin
    if (isCritical) {
      try {
        await fetch(
          `${process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "feedback",
              to: emailConfig.contactEmail,
              data: {
                userName: session.user.name || "مستخدم",
                userEmail: session.user.email || "",
                easeOfUse: formData.easeOfUse,
                informationClarity: formData.informationClarity,
                contentDiversity: formData.contentDiversity,
                performanceSpeed: formData.performanceSpeed,
                generalSatisfaction: formData.generalSatisfaction,
                encounteredDifficulties: formData.encounteredDifficulties,
                difficultiesDetails: formData.difficultiesDetails,
                improvementSuggestions: formData.improvementSuggestions,
                wouldRecommend: formData.wouldRecommend,
                appRating: formData.appRating,
                timestamp: new Date().toLocaleString("ar-DZ", {
                  timeZone: "Africa/Algiers",
                }),
              },
            }),
          },
        );
      } catch (emailError) {
        // log error and don't fail the rating submission
        console.error("Failed to send critical feedback email:", emailError);
      }
    }

    return {
      success: true,
      message: "تم إرسال تقييمك بنجاح",
    };
  } catch (error) {
    console.error("Error submitting rating:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء إرسال التقييم، يرجى المحاولة مرة أخرى",
    };
  }
}
