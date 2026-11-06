import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Production Ofelia should invoke this endpoint every 30 minutes.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const result = await prisma.user.deleteMany({
      where: {
        emailVerified: false,
        createdAt: { lt: cutoff },
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Unverified account cleanup cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
