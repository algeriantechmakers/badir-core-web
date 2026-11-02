import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  closeEndedInitiatives: vi.fn(),
  deleteScheduledAccounts: vi.fn(),
  deleteScheduledOrganizations: vi.fn(),
  fetchBatch: vi.fn(),
  deleteQueueEntries: vi.fn(),
  sendMailBatch: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    user: { findMany: vi.fn(), update: vi.fn() },
    webhookEvent: { findMany: vi.fn(), delete: vi.fn() },
    initiativePost: { findMany: vi.fn() },
  },
}));

vi.mock("@/services/initiatives", () => ({
  InitiativeService: { closeEndedInitiatives: mocks.closeEndedInitiatives },
}));
vi.mock("@/services/user", () => ({
  UserService: { deleteScheduledAccounts: mocks.deleteScheduledAccounts },
}));
vi.mock("@/services/organizations", () => ({
  OrganizationService: {
    deleteScheduledOrganizations: mocks.deleteScheduledOrganizations,
  },
}));
vi.mock("@/services/post-email-queue", () => ({
  PostEmailQueueService: {
    fetchBatch: mocks.fetchBatch,
    deleteQueueEntries: mocks.deleteQueueEntries,
  },
}));
vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/email", () => ({
  default: { fromEmail: "from@example.com" },
  sendMailBatch: mocks.sendMailBatch,
}));
vi.mock("react-email", () => ({
  render: vi.fn().mockResolvedValue("<html />"),
}));

import { GET as closeInitiatives } from "@/app/api/cron/close-initiatives/route";
import { GET as deleteAccounts } from "@/app/api/cron/delete-org-owner-accounts/route";
import { GET as inactiveUsers } from "@/app/api/cron/inactive-users/route";
import { GET as processWebhooks } from "@/app/api/cron/process-webhooks/route";
import { GET as processPostEmails } from "@/app/api/cron/process-post-emails/route";

const url = "http://localhost/api/cron";
const request = (authorization?: string) =>
  new NextRequest(url, {
    headers: authorization ? { authorization } : undefined,
  });

describe("close initiatives cron route", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects requests without the scheduler secret", async () => {
    const response = await closeInitiatives(request());
    expect(response.status).toBe(401);
    expect(mocks.closeEndedInitiatives).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong scheduler secret", async () => {
    expect((await closeInitiatives(request("wrong-secret"))).status).toBe(401);
  });

  it("closes ended initiatives for authenticated scheduler requests", async () => {
    mocks.closeEndedInitiatives.mockResolvedValue(3);
    const response = await closeInitiatives(request("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: true, closed: 3 }),
    );
    expect(mocks.closeEndedInitiatives).toHaveBeenCalledOnce();
  });
});

describe("scheduled account deletion cron route", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects missing and incorrect scheduler secrets", async () => {
    expect((await deleteAccounts(request())).status).toBe(401);
    expect((await deleteAccounts(request("wrong-secret"))).status).toBe(401);
  });

  it("deletes scheduled users and organizations", async () => {
    mocks.deleteScheduledAccounts.mockResolvedValue(2);
    mocks.deleteScheduledOrganizations.mockResolvedValue(1);
    const response = await deleteAccounts(request("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deleted: 2,
      deletedOrganizations: 1,
    });
    expect(mocks.deleteScheduledAccounts).toHaveBeenCalledOnce();
    expect(mocks.deleteScheduledOrganizations).toHaveBeenCalledOnce();
  });
});

describe("inactive users cron route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mocks.prisma) => unknown) =>
        callback(mocks.prisma),
    );
    mocks.prisma.user.findMany.mockResolvedValue([]);
  });

  it("rejects missing and incorrect scheduler secrets", async () => {
    expect((await inactiveUsers(request())).status).toBe(401);
    expect((await inactiveUsers(request("wrong-secret"))).status).toBe(401);
  });

  it("returns an empty retention result for an authenticated request", async () => {
    const response = await inactiveUsers(request("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      anonymized: 0,
      warned: 0,
      failed: 0,
    });
  });
});

describe("webhook processing cron route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.prisma.webhookEvent.findMany.mockResolvedValue([]);
  });

  it("rejects missing and incorrect scheduler secrets", async () => {
    expect((await processWebhooks(request())).status).toBe(401);
    expect((await processWebhooks(request("wrong-secret"))).status).toBe(401);
  });

  it("returns an empty processing result for an authenticated request", async () => {
    const response = await processWebhooks(request("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: true, processed: 0, failed: 0 }),
    );
    expect(mocks.prisma.webhookEvent.findMany).toHaveBeenCalledOnce();
  });
});

describe("post email processing cron route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.fetchBatch.mockResolvedValue([]);
  });

  it("rejects missing and incorrect scheduler secrets", async () => {
    expect((await processPostEmails(request())).status).toBe(401);
    expect((await processPostEmails(request("wrong-secret"))).status).toBe(401);
  });

  it("returns an empty queue result for an authenticated request", async () => {
    const response = await processPostEmails(
      request("Bearer test-cron-secret"),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      processed: 0,
      message: "Queue is empty",
    });
    expect(mocks.fetchBatch).toHaveBeenCalledOnce();
  });
});
