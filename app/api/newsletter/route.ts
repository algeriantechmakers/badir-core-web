import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getNewsletterRedis } from "@/lib/rate-limit";
import { MailerLiteService } from "@/services/mailerlite";

const EMAIL_LIMIT = 2;
const EMAIL_TTL_SECONDS = 24 * 60 * 60;
const IP_LIMIT = 10;
const IP_TTL_SECONDS = 60 * 60;

/**
 * Public newsletter signup endpoint.
 *
 * It rate-limits and validates visitor submissions, sends accepted addresses
 * to MailerLite, and stores a local subscriber record for duplicate checks.
 * MailerLite webhooks remain responsible for synchronizing known users.
 */

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    (request as NextRequest & { ip?: string }).ip ||
    "unknown"
  );
}

async function incrementWithExpiry(key: string, ttl: number) {
  const redis = getNewsletterRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttl);
  }
  return count;
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; honeypot?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  if (typeof body.honeypot === "string" && body.honeypot.trim()) {
    return NextResponse.json({ success: true });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json(
      { error: "يرجى إدخال بريد إلكتروني صالح" },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "يرجى إدخال بريد إلكتروني صالح" },
      { status: 400 },
    );
  }

  try {
    const emailHash = createHash("sha256").update(email).digest("hex");
    const [emailAttempts, ipAttempts] = await Promise.all([
      incrementWithExpiry(`newsletter:email:${emailHash}`, EMAIL_TTL_SECONDS),
      incrementWithExpiry(
        `newsletter:ip:${getClientIp(request)}`,
        IP_TTL_SECONDS,
      ),
    ]);

    if (emailAttempts > EMAIL_LIMIT || ipAttempts > IP_LIMIT) {
      return NextResponse.json(
        { error: "لقد تجاوزت الحد المسموح به. يرجى المحاولة لاحقاً." },
        { status: 429 },
      );
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجّل بالفعل." },
        { status: 409 },
      );
    }

    if (!MailerLiteService.isConfigured()) {
      console.error("MailerLite is not configured");
      return NextResponse.json(
        { error: "حدث خطأ. يرجى المحاولة لاحقاً." },
        { status: 500 },
      );
    }

    const mailerLiteId = await MailerLiteService.subscribe(
      email,
      `public-newsletter:${email}`,
    );
    if (!mailerLiteId) {
      return NextResponse.json(
        { error: "حدث خطأ. يرجى المحاولة لاحقاً." },
        { status: 500 },
      );
    }

    await prisma.newsletterSubscriber.create({
      data: { email, ipAddress: getClientIp(request) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجّل بالفعل." },
        { status: 409 },
      );
    }
    console.error("Newsletter signup error:", error);
    return NextResponse.json(
      { error: "حدث خطأ. يرجى المحاولة لاحقاً." },
      { status: 500 },
    );
  }
}
