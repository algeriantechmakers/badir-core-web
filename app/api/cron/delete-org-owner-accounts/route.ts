// TODO: register in badir-compose ofelia labels — daily schedule, no-overlap: true
import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/services/user";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await UserService.deleteScheduledAccounts();
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Scheduled account deletion cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
