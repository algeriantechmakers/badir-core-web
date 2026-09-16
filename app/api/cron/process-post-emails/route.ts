import { NextRequest, NextResponse } from "next/server";
import { render } from "react-email";
import { prisma } from "@/lib/db";
import { PostEmailQueueService } from "@/services/post-email-queue";
import InitiativePostNotificationEmail from "@/emails/InitiativePostNotificationEmail";
import emailConfig, { sendMailBatch } from "@/lib/email";

/**
 * Post Email Queue Processor (Cron Worker)
 *
 * Runs daily, triggered by the scheduler, to process queued post email notifications.
 *
 * Flow:
 * 1. Fetch batch of queued emails
 * 2. Group by post/initiative and fetch post details
 * 3. Send emails using sendMailBatch
 * 4. Delete successfully sent queue entries
 * 5. Failed entries remain for retry on next run
 */

const BATCH_SIZE = 50;

interface PostDetails {
  id: string;
  title: string | null;
  content: string;
  author: {
    name?: string;
  };
  initiative: {
    id: string;
    titleAr: string;
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // Verify the scheduler's shared secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let processed = 0;
  let failed = 0;
  const rateLimited = 0;

  try {
    // Fetch batch of queued emails
    const queuedEmails = await PostEmailQueueService.fetchBatch(BATCH_SIZE);

    if (queuedEmails.length === 0) {
      console.log("No queued emails to process");
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "Queue is empty",
      });
    }

    console.log(`Processing ${queuedEmails.length} queued post emails`);

    // Group by postId to fetch post details efficiently
    const postIds = [...new Set(queuedEmails.map((e) => e.postId))];

    // Fetch all post details in one query
    const posts = await prisma.initiativePost.findMany({
      where: {
        id: {
          in: postIds,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        author: {
          select: {
            name: true,
          },
        },
        initiative: {
          select: {
            id: true,
            titleAr: true,
          },
        },
      },
    });

    // Create a map for quick lookup
    const postDetailsMap = new Map<string, PostDetails>(
      posts.map((p) => [p.id, p as PostDetails]),
    );

    // Prepare emails to send
    const emailsToSend: Array<{
      from: string;
      to: string;
      subject: string;
      html: string;
      queueId: string;
    }> = [];

    const processedQueueIds: string[] = [];
    const failedQueueIds: string[] = [];

    for (const queueEntry of queuedEmails) {
      const postDetails = postDetailsMap.get(queueEntry.postId);

      if (!postDetails) {
        console.warn(
          `Post ${queueEntry.postId} not found, removing from queue`,
        );
        failedQueueIds.push(queueEntry.id);
        failed++;
        continue;
      }

      try {
        const emailHtml = await render(
          InitiativePostNotificationEmail({
            initiativeName: postDetails.initiative.titleAr,
            postTitle: postDetails.title || undefined,
            postContent: postDetails.content,
            authorName: postDetails.author.name || "مستخدم_محذوف",
            postUrl: `${process.env.APP_URL}/initiatives/${postDetails.initiative.id}`,
          }),
        );

        emailsToSend.push({
          from: `منصة بادر <${emailConfig.fromEmail}>`,
          to: queueEntry.email,
          subject: `تحديث جديد في مبادرة ${postDetails.initiative.titleAr}`,
          html: emailHtml,
          queueId: queueEntry.id,
        });

        processedQueueIds.push(queueEntry.id);
      } catch (error) {
        console.error(
          `Failed to prepare email for queue entry ${queueEntry.id}:`,
          error,
        );
        failed++;
      }
    }

    // Send emails in batch
    if (emailsToSend.length > 0) {
      try {
        const results = await sendMailBatch(
          emailsToSend.map(({ queueId, ...email }) => email),
        );

        const batchFailed = results.filter((r) => "error" in r).length;

        if (batchFailed > 0) {
          console.error(`${batchFailed} emails failed to send`);
          failed += batchFailed;
        }

        // Delete successfully sent queue entries
        const batchSuccess = emailsToSend.length - batchFailed;
        if (batchSuccess > 0) {
          await PostEmailQueueService.deleteQueueEntries(processedQueueIds);
          processed = batchSuccess;
          console.log(`Successfully sent ${processed} emails`);
        }
      } catch (error) {
        console.error("Failed to send batch emails:", error);
        failed += emailsToSend.length;
      }
    }

    // Delete failed entries (post not found, etc.)
    if (failedQueueIds.length > 0) {
      await PostEmailQueueService.deleteQueueEntries(failedQueueIds);
    }

    const duration = Date.now() - startTime;

    console.log(
      `Post email processing complete: ${processed} sent, ${failed} failed, ${rateLimited} rate-limited, ${duration}ms`,
    );

    return NextResponse.json(
      {
        success: true,
        processed,
        failed,
        rateLimited,
        duration,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Post email processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
