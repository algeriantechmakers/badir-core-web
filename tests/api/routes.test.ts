import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initiativeGetMany: vi.fn(),
  organizationGetMany: vi.fn(),
  getAll: vi.fn(),
  getUserParticipations: vi.fn(),
  getJoinedParticipations: vi.fn(),
  getSession: vi.fn(),
  sendMail: vi.fn(),
  render: vi.fn(),
  webhookCreate: vi.fn(),
  authPOST: vi.fn(),
  authGET: vi.fn(),
  signInLimit: vi.fn(),
  signUpLimit: vi.fn(),
}));

vi.mock("@/services/initiatives", () => ({
  InitiativeService: { getMany: mocks.initiativeGetMany },
}));
vi.mock("@/services/organizations", () => ({
  OrganizationService: { getMany: mocks.organizationGetMany },
}));
vi.mock("@/services/participations", () => ({
  ParticipationService: {
    getAll: mocks.getAll,
    getUserParticipations: mocks.getUserParticipations,
    getJoinedParticipations: mocks.getJoinedParticipations,
  },
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("@/lib/email", () => ({
  default: { fromEmail: "from@example.com" },
  sendMail: mocks.sendMail,
}));
vi.mock("react-email", () => {
  const component = () => null;
  return {
    render: mocks.render,
    Body: component,
    Button: component,
    Container: component,
    Head: component,
    Heading: component,
    Html: component,
    Preview: component,
    Section: component,
    Text: component,
  };
});
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    POST: mocks.authPOST,
    GET: mocks.authGET,
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  signInRateLimiter: { limit: mocks.signInLimit },
  signUpRateLimiter: { limit: mocks.signUpLimit },
}));
vi.mock("@/lib/db", () => ({
  prisma: { webhookEvent: { create: mocks.webhookCreate } },
}));

import { GET as initiatives } from "@/app/api/initiatives/route";
import { GET as organizations } from "@/app/api/organizations/route";
import { GET as participations } from "@/app/api/participations/routes";
import { GET as joined } from "@/app/api/participations/joined/route";
import { POST as sendEmail } from "@/app/api/send-email/route";
import { POST as mailerlite } from "@/app/api/webhooks/mailerlite/route";
import { GET as health } from "@/app/api/health/route";
import {
  GET as authGet,
  POST as authPost,
} from "@/app/api/auth/[...all]/route";

describe("health API route", () => {
  it("returns liveness and build version", async () => {
    const response = health();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      version: "unknown",
    });
  });
});

describe("auth API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.signInLimit.mockResolvedValue({ success: true });
    mocks.signUpLimit.mockResolvedValue({ success: true });
  });

  it("delegates non-rate-limited requests to Better Auth", async () => {
    const request = new Request("http://localhost/api/auth/get-session", {
      method: "POST",
    });
    mocks.authPOST.mockResolvedValue(new Response("auth"));
    await expect(authPost(request)).resolves.toBeInstanceOf(Response);
    expect(mocks.authPOST).toHaveBeenCalledWith(request);
  });

  it("rate-limits sign-in and sign-up endpoints", async () => {
    const request = new Request("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    mocks.signInLimit.mockResolvedValue({ success: false });
    const response = await authPost(request);
    expect(response.status).toBe(429);
    expect(mocks.authPOST).not.toHaveBeenCalled();

    const signUpRequest = new Request(
      "http://localhost/api/auth/sign-up/email",
      { method: "POST" },
    );
    mocks.signUpLimit.mockResolvedValue({ success: false });
    expect((await authPost(signUpRequest)).status).toBe(429);
    expect(mocks.authPOST).not.toHaveBeenCalled();
  });

  it("delegates GET requests directly to Better Auth", async () => {
    const request = new Request("http://localhost/api/auth/get-session");
    mocks.authGET.mockResolvedValue(new Response("auth"));
    await expect(authGet(request)).resolves.toBeInstanceOf(Response);
    expect(mocks.authGET).toHaveBeenCalledWith(request);
  });
});

describe("initiatives API route", () => {
  beforeEach(() => vi.resetAllMocks());

  it("passes pagination and supported filters to the service", async () => {
    const result = { data: [], pagination: { page: 2, limit: 5 } };
    mocks.initiativeGetMany.mockResolvedValue(result);
    const response = await initiatives(
      new NextRequest(
        "http://localhost/api/initiatives?page=2&limit=5&search=education&categoryId=cat-1&city=Algiers&status=published&targetAudience=both&organizerType=user&hasAvailableSpots=true&startDateFrom=2030-01-01&startDateTo=2030-02-01&endDateFrom=2030-03-01&endDateTo=2030-04-01",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: result,
    });
    expect(mocks.initiativeGetMany).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "education",
        categoryId: "cat-1",
        city: "Algiers",
        status: "published",
        targetAudience: "both",
        organizerType: "user",
        hasAvailableSpots: true,
        startDateFrom: expect.any(Date),
      }),
      { page: 2, limit: 5 },
    );
  });

  it("returns a server error when the service fails", async () => {
    mocks.initiativeGetMany.mockRejectedValue(new Error("failed"));
    const response = await initiatives(
      new NextRequest("http://localhost/api/initiatives"),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Failed to fetch initiatives",
    });
  });
});

describe("organizations API route", () => {
  beforeEach(() => vi.resetAllMocks());

  it("fetches approved and frozen organizations with pagination", async () => {
    const result = { data: [], pagination: { page: 1, limit: 12 } };
    mocks.organizationGetMany.mockResolvedValue(result);
    const response = await organizations(
      new NextRequest(
        "http://localhost/api/organizations?page=3&limit=4&search=health",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: result,
    });
    expect(mocks.organizationGetMany).toHaveBeenCalledWith(
      {
        search: "health",
        status: { in: ["approved", "frozen"] },
      },
      { page: 3, limit: 4 },
    );
  });

  it("returns a server error when organization lookup fails", async () => {
    mocks.organizationGetMany.mockRejectedValue(new Error("failed"));
    const response = await organizations(
      new NextRequest("http://localhost/api/organizations"),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Failed to fetch organizations",
    });
  });
});

describe("participations API routes", () => {
  beforeEach(() => vi.resetAllMocks());

  it("gets all participations when no user filter is provided", async () => {
    mocks.getAll.mockResolvedValue([{ id: "participation-1" }]);
    const response = await participations(
      new NextRequest("http://localhost/api/participations"),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: "participation-1" }],
    });
    expect(mocks.getAll).toHaveBeenCalledOnce();
  });

  it("gets participations for a specific user", async () => {
    mocks.getUserParticipations.mockResolvedValue([{ id: "participation-2" }]);
    const response = await participations(
      new NextRequest("http://localhost/api/participations?userId=user-1"),
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: "participation-2" }],
    });
    expect(mocks.getUserParticipations).toHaveBeenCalledWith("user-1");
  });

  it("returns an error when participation lookup fails", async () => {
    mocks.getAll.mockRejectedValue(new Error("failed"));
    const response = await participations(
      new NextRequest("http://localhost/api/participations"),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Failed to fetch participations",
    });
  });

  it("requires authentication for joined participations", async () => {
    mocks.getSession.mockResolvedValue(null);
    const response = await joined(
      new NextRequest("http://localhost/api/participations/joined"),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("fetches joined participations with valid filters", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getJoinedParticipations.mockResolvedValue({
      data: [],
      pagination: {},
    });
    const response = await joined(
      new NextRequest(
        "http://localhost/api/participations/joined?page=2&limit=5&search=x&status=approved&categoryId=cat-1&targetAudience=both&organizerType=user&initiativeStatus=published",
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { data: [], pagination: {} },
    });
    expect(mocks.getJoinedParticipations).toHaveBeenCalledWith(
      "user-1",
      {
        search: "x",
        status: "approved",
        categoryId: "cat-1",
        targetAudience: "both",
        organizerType: "user",
        initiativeStatus: "published",
      },
      { page: 2, limit: 5 },
    );
  });
});

describe("send-email API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SMTP_HOST = "smtp.example.com";
    mocks.render.mockResolvedValue("<html />");
    mocks.sendMail.mockResolvedValue({ messageId: "message-1" });
  });

  it("rejects requests missing type or recipient", async () => {
    const response = await sendEmail(
      new NextRequest("http://localhost/api/send-email", {
        method: "POST",
        body: JSON.stringify({ type: "contact" }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing required fields: type and to",
    });
  });

  it("rejects an invalid email type", async () => {
    const response = await sendEmail(
      new NextRequest("http://localhost/api/send-email", {
        method: "POST",
        body: JSON.stringify({ type: "unknown", to: "user@example.com" }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid email type",
    });
  });

  it.each(["post-notification", "feedback", "contact"])(
    "sends %s email",
    async (type) => {
      const data =
        type === "post-notification"
          ? {
              postTitle: "Post",
              authorName: "Author",
              postUrl: "https://example.com/post",
            }
          : type === "feedback"
            ? { timestamp: "2026-01-01" }
            : {
                fullName: "Test User",
                email: "user@example.com",
                inquiryType: "General",
                title: "Question",
                message: "A question",
                timestamp: "2026-01-01",
              };
      const response = await sendEmail(
        new NextRequest("http://localhost/api/send-email", {
          method: "POST",
          body: JSON.stringify({ type, to: "admin@example.com", data }),
        }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        messageId: "message-1",
        message: "Email sent successfully",
      });
      expect(mocks.sendMail).toHaveBeenCalledOnce();
    },
  );

  it("returns a configuration error when SMTP is unavailable", async () => {
    delete process.env.SMTP_HOST;
    const response = await sendEmail(
      new NextRequest("http://localhost/api/send-email", {
        method: "POST",
        body: JSON.stringify({
          type: "contact",
          to: "admin@example.com",
          data: {},
        }),
      }),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Email service is not configured",
    });
  });
});

describe("MailerLite webhook API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MAILERLITE_WEBHOOK_SECRET = "webhook-secret";
    mocks.webhookCreate.mockResolvedValue({ id: "event-1" });
  });

  it("rejects requests without a signature", async () => {
    const response = await mailerlite(
      new NextRequest("http://localhost/api/webhooks/mailerlite", {
        method: "POST",
        body: JSON.stringify({ events: [] }),
      }),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Missing signature",
    });
  });

  it("rejects an invalid signature", async () => {
    const response = await mailerlite(
      new NextRequest("http://localhost/api/webhooks/mailerlite", {
        method: "POST",
        headers: { "x-mailerlite-signature": "0".repeat(64) },
        body: JSON.stringify({ events: [] }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("enqueues signed webhook events", async () => {
    const body = JSON.stringify({
      events: [
        {
          type: "subscriber.created",
          timestamp: "2026-01-01",
          data: { subscriber: { email: "user@example.com", id: "sub-1" } },
        },
      ],
    });
    const signature = crypto
      .createHmac("sha256", "webhook-secret")
      .update(body)
      .digest("hex");
    const response = await mailerlite(
      new NextRequest("http://localhost/api/webhooks/mailerlite", {
        method: "POST",
        headers: { "x-mailerlite-signature": signature },
        body,
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      enqueued: 1,
    });
    expect(mocks.webhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: "mailerlite",
          type: "subscriber.created",
        }),
      }),
    );
  });

  it("returns a configuration error when the webhook secret is absent", async () => {
    delete process.env.MAILERLITE_WEBHOOK_SECRET;
    const response = await mailerlite(
      new NextRequest("http://localhost/api/webhooks/mailerlite", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook not configured",
    });
  });
});
