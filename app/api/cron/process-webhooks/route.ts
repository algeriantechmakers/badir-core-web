import { prisma } from "@/lib/db";
import { SubscriberPayload } from "@/types/MailerLiteWebhook";
import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook Event Processor (Cron Worker)
 *
 * Runs daily at 8 AM, triggered by the scheduler (see docker-compose).
 * Processes queued webhook events from the database.
 *
 * Flow:
 * 1. Fetch oldest unprocessed events (batch of 50)
 * 2. Process each event
 * 3. Delete event only after successful processing
 * 4. If processing fails, event remains for retry on next run
 */

interface MailerLiteWebhookEvent {
  type: string;
  timestamp: string;
  data: SubscriberPayload;
}

const BATCH_SIZE = 40;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // Verify the scheduler's shared secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let processed = 0;
  let failed = 0;

  try {
    // Fetch oldest events
    const events = await prisma.webhookEvent.findMany({
      where: {
        provider: "mailerlite",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: BATCH_SIZE,
    });

    console.log(`Processing ${events.length} webhook events`);

    for (const event of events) {
      try {
        const payload = event.payload as unknown as MailerLiteWebhookEvent;
        const { type, data } = payload;
        const { subscriber } = data;

        // Process based on event type
        switch (type) {
          case "subscriber.unsubscribed":
            await handleUnsubscribe(subscriber.email, subscriber.id);
            break;

          case "subscriber.created":
            await handleSubscribe(
              subscriber.email,
              subscriber.id,
              subscriber.status,
            );
            break;

          case "subscriber.updated":
            await handleUpdate(
              subscriber.email,
              subscriber.id,
              subscriber.status,
            );
            break;

          case "subscriber.bounced":
          case "subscriber.spam_reported":
            await handleUnsubscribe(subscriber.email, subscriber.id);
            break;

          default:
            console.log(`Ignoring unknown event type: ${type}`);
        }

        // Delete event after successful processing
        await prisma.webhookEvent.delete({
          where: { id: event.id },
        });

        processed++;
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        failed++;
        // Event remains in DB for retry
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `Webhook processing complete: ${processed} processed, ${failed} failed, ${duration}ms`,
    );

    return NextResponse.json(
      {
        success: true,
        processed,
        failed,
        duration,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle subscriber unsubscribe event (IDEMPOTENT)
 */
async function handleUnsubscribe(email: string, mailerLiteId: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { mailerLiteId }],
    },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        newsletterSubscribed: false,
        newsletterSubscribedAt: null,
      },
    });

    console.log(`Unsubscribed user: ${email}`);
  }
}

/**
 * Handle subscriber creation event (IDEMPOTENT)
 */
async function handleSubscribe(
  email: string,
  mailerLiteId: string,
  status: string,
) {
  if (status !== "active") return;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        newsletterSubscribed: true,
        newsletterSubscribedAt: new Date(),
        mailerLiteId,
      },
    });

    console.log(`Subscribed user: ${email}`);
  }
}

/**
 * Handle subscriber update event (IDEMPOTENT)
 */
async function handleUpdate(
  email: string,
  mailerLiteId: string,
  status: string,
) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { mailerLiteId }],
    },
  });

  if (user) {
    const isSubscribed = status === "active";

    await prisma.user.update({
      where: { id: user.id },
      data: {
        newsletterSubscribed: isSubscribed,
        newsletterSubscribedAt: isSubscribed ? new Date() : null,
        mailerLiteId,
      },
    });

    console.log(`Updated user subscription: ${email} - ${status}`);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Batch size is capped at 40 to keep a single execution comfortably short.
// I am keeping batch size to 40 for now to be safe.
export const maxDuration = 60;
