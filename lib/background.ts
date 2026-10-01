import { after } from "next/server";

/**
 * Runs a task without blocking the response.
 *
 * Replaces `waitUntil` from `@vercel/functions`: on a long-lived Node server
 * there is no function to keep alive, so `after` is enough — it defers the
 * task until the response has been flushed.
 *
 * `after` throws when there is no request scope (scripts such as
 * `prisma/seed.ts`), so in that case the task is awaited inline instead, which
 * is what the previous `waitUntil` fallback did.
 */
export async function runAfterResponse(task: Promise<unknown>): Promise<void> {
  const guarded = Promise.resolve(task).catch((error) => {
    console.error("Background task failed:", error);
  });

  try {
    after(guarded);
  } catch {
    await guarded;
  }
}
