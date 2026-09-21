"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MailerLiteService } from "@/services/mailerlite";
import { prisma } from "@/lib/db";
import { newsletterSubscriptionRateLimiter } from "@/lib/rate-limit";

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function subscribeToNewsletter(): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول للاشتراك في النشرة البريدية",
      };
    }

    const userId = session.user.id;

    const { success: rateLimitSuccess } =
      await newsletterSubscriptionRateLimiter.limit(userId);

    if (!rateLimitSuccess) {
      return {
        success: false,
        error: "عدد كبير جداً من المحاولات، يرجى الانتظار دقيقة",
      };
    }

    if (!MailerLiteService.isConfigured()) {
      console.error("MailerLite is not configured");
      return {
        success: false,
        error: "خدمة النشرة البريدية غير متاحة حالياً",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        newsletterSubscribed: true,
        mailerLiteId: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "المستخدم غير موجود",
      };
    }

    if (user.newsletterSubscribed) {
      return {
        success: true,
        message: "أنت مشترك بالفعل في النشرة البريدية",
      };
    }

    const mailerLiteId = await MailerLiteService.subscribe(
      user.email,
      userId,
      user.firstName,
      user.lastName,
    );

    if (!mailerLiteId) {
      return {
        success: false,
        error: "فشل الاشتراك في النشرة البريدية، يرجى المحاولة لاحقاً",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        newsletterSubscribed: true,
        newsletterSubscribedAt: new Date(),
        mailerLiteId,
      },
    });

    return {
      success: true,
      message: "تم الاشتراك في النشرة البريدية بنجاح",
    };
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء الاشتراك، يرجى المحاولة مرة أخرى",
    };
  }
}

export async function unsubscribeFromNewsletter(): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول لإلغاء الاشتراك",
      };
    }

    const userId = session.user.id;

    const { success: rateLimitSuccess } =
      await newsletterSubscriptionRateLimiter.limit(userId);

    if (!rateLimitSuccess) {
      return {
        success: false,
        error: "عدد كبير جداً من المحاولات، يرجى الانتظار دقيقة",
      };
    }

    if (!MailerLiteService.isConfigured()) {
      console.error("MailerLite is not configured");
      return {
        success: false,
        error: "خدمة النشرة البريدية غير متاحة حالياً",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        newsletterSubscribed: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "المستخدم غير موجود",
      };
    }

    if (!user.newsletterSubscribed) {
      return {
        success: true,
        message: "لم تكن مشتركاً في النشرة البريدية",
      };
    }

    const unsubscribed = await MailerLiteService.unsubscribe(
      user.email,
      userId,
    );

    if (!unsubscribed) {
      return {
        success: false,
        error: "فشل إلغاء الاشتراك، يرجى المحاولة لاحقاً",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        newsletterSubscribed: false,
        newsletterSubscribedAt: null,
      },
    });

    return {
      success: true,
      message: "تم إلغاء الاشتراك في النشرة البريدية بنجاح",
    };
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء إلغاء الاشتراك، يرجى المحاولة مرة أخرى",
    };
  }
}

export async function getNewsletterStatus(): Promise<{
  subscribed: boolean;
  subscribedAt: Date | null;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { subscribed: false, subscribedAt: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        newsletterSubscribed: true,
        newsletterSubscribedAt: true,
      },
    });

    return {
      subscribed: user?.newsletterSubscribed ?? false,
      subscribedAt: user?.newsletterSubscribedAt ?? null,
    };
  } catch (error) {
    console.error("Failed to get newsletter status:", error);
    return { subscribed: false, subscribedAt: null };
  }
}
