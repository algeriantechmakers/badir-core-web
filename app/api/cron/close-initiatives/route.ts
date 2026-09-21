import { NextRequest, NextResponse } from "next/server";
import { InitiativeService } from "@/services/initiatives";

/**
 * Close Ended Initiatives (Cron Worker)
 *
 * Runs daily, triggered by the scheduler. Marks any published initiative whose end date
 * has passed as `completed`, so it becomes read-only (no posting or editing)
 * while remaining visible and open for participant ratings.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // Verify the scheduler's shared secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const closed = await InitiativeService.closeEndedInitiatives();
    const duration = Date.now() - startTime;

    console.log(`Closed ${closed} ended initiative(s) in ${duration}ms`);

    return NextResponse.json(
      { success: true, closed, duration },
      { status: 200 },
    );
  } catch (error) {
    console.error("Close ended initiatives error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
