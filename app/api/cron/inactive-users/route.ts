import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { render } from "react-email";
import { subDays } from "date-fns";
import emailConfig, { sendMailBatch } from "@/lib/email";
import InactivityWarningEmail from "@/emails/InactivityWarningEmail";

const BATCH_SIZE = 50;
const WARNING_DAYS = 510;
const DELETION_DAYS = 540;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const warningThreshold = subDays(now, WARNING_DAYS);
  const deletionThreshold = subDays(now, DELETION_DAYS);

  let warned = 0;
  let anonymized = 0;
  let failed = 0;

  try {
    // -- 1. ANONYMIZE users past 540 days ------------------------------
    const toAnonymize = await prisma.user.findMany({
      where: {
        lastActiveAt: { lte: deletionThreshold },
        isActive: true,
      },
      select: { id: true },
    });

    for (let i = 0; i < toAnonymize.length; i += BATCH_SIZE) {
      const batch = toAnonymize.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(async (tx) => {
        for (const user of batch) {
          try {
            await tx.postEmailQueue.deleteMany({ where: { userId: user.id } });
            await tx.initiativeParticipant.deleteMany({
              where: { userId: user.id },
            });
            await tx.session.deleteMany({ where: { userId: user.id } });
            await tx.account.deleteMany({ where: { userId: user.id } });
            await tx.user.update({
              where: { id: user.id },
              data: {
                name: "مستخدم_محذوف",
                firstName: "مستخدم",
                lastName: "محذوف",
                email: `deleted_${user.id}@deleted.invalid`,
                image: null,
                phone: null,
                bio: null,
                dateOfBirth: null,
                geohash: null,
                city: null,
                state: null,
                mailerLiteId: null,
                newsletterSubscribed: false,
                isActive: false,
                consentGiven: false,
                consentGivenAt: null,
              },
            });
            anonymized++;
          } catch (err) {
            console.error(`Failed to anonymize user ${user.id}:`, err);
            failed++;
          }
        }
      });
    }

    // -- 2. WARN users approaching 540 days ---------------------------
    const toWarn = await prisma.user.findMany({
      where: {
        lastActiveAt: {
          lte: warningThreshold,
          gt: deletionThreshold, // not yet past deletion threshold
        },
        isActive: true,
        email: { not: { endsWith: "@deleted.invalid" } },
      },
      select: { id: true, email: true, firstName: true },
    });

    if (toWarn.length > 0) {
      const numberBatches = Math.ceil(toWarn.length / BATCH_SIZE);

      for (let i = 0; i < numberBatches; i++) {
        const batch = toWarn.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

        const emails = await Promise.all(
          batch.map(async (user) => ({
            from: emailConfig.fromEmail,
            to: user.email,
            subject: "تنبيه: سيتم حذف بياناتك قريباً",
            html: await render(
              InactivityWarningEmail({
                firstName: user.firstName,
                daysRemaining: (DELETION_DAYS - WARNING_DAYS).toString(),
                platformUrl: process.env.APP_URL!,
              }),
            ),
          })),
        );

        const results = await sendMailBatch(emails);

        const batchFailed = results.filter((r) => "error" in r).length;
        const batchWarned = results.length - batchFailed;

        if (batchFailed > 0) {
          console.error(`Warning batch ${i + 1} had ${batchFailed} failures`);
          failed += batchFailed;
        }
        warned += batchWarned;

        if (i + 1 < numberBatches) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    console.log(
      `Retention cron done — anonymized: ${anonymized}, warned: ${warned}, failed: ${failed}`,
    );

    return NextResponse.json({ success: true, anonymized, warned, failed });
  } catch (error) {
    console.error("Retention cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
