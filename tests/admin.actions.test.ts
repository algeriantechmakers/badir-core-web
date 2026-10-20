import { ReportReason, ReportTarget } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  create,
  enforceMock,
  userService,
  organizationService,
  reportService,
  postsService,
  sendMail,
  initiativePost,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  create: vi.fn(),
  enforceMock: vi.fn(),
  userService: {
    getUser: vi.fn(),
    freeze: vi.fn(),
    unfreeze: vi.fn(),
    scheduleAccountDeletion: vi.fn(),
    restoreUser: vi.fn(),
  },
  organizationService: {
    getOwnerNotificationDetails: vi.fn(),
    freeze: vi.fn(),
    unfreeze: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
  },
  reportService: { dismiss: vi.fn() },
  postsService: { remove: vi.fn() },
  sendMail: vi.fn(),
  initiativePost: { findUnique: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/services/reports", () => ({
  ReportService: { create, ...reportService },
}));
vi.mock("@/services/user", () => ({ UserService: userService }));
vi.mock("@/services/organizations", () => ({
  OrganizationService: organizationService,
}));
vi.mock("@/services/posts", () => ({
  InitiativePostsService: postsService,
}));
vi.mock("@/lib/email", () => ({
  default: {
    fromEmail: "from@example.com",
    contactEmail: "contact@example.com",
  },
  sendMail,
}));
vi.mock("react-email", () => ({
  render: vi.fn().mockResolvedValue("<html />"),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { initiativePost },
}));
vi.mock("@/lib/permissions", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/permissions")>(
      "@/lib/permissions",
    );
  return { ...actual, enforce: enforceMock };
});

import {
  createReport,
  dismissReport,
  freezeOrganization,
  freezeUser,
  removeOrganization,
  removePost,
  removeUser,
  restoreOrganization,
  restoreUser,
  unfreezeOrganization,
  unfreezeUser,
} from "@/actions/admin";
import { AdminAction, can } from "@/lib/permissions";

describe("createReport action", () => {
  it("returns an authentication error without creating a report", async () => {
    getSession.mockResolvedValue(null);

    await expect(
      createReport({
        targetType: ReportTarget.USER,
        targetId: "target",
        reason: ReportReason.OTHER,
        customReason: "reason",
      }),
    ).resolves.toEqual({
      actionTaken: false,
      emailSent: false,
      error: "يجب تسجيل الدخول",
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("createReport action", () => {
  it("sanitizes custom reasons before delegating to the report service", async () => {
    getSession.mockResolvedValue({
      user: { id: "reporter", role: "USER" },
    });
    create.mockResolvedValue({ id: "report" });

    await expect(
      createReport({
        targetType: ReportTarget.USER,
        targetId: "target",
        reason: ReportReason.OTHER,
        customReason: '<script>alert("x")</script>Useful reason',
      }),
    ).resolves.toEqual({ actionTaken: true, emailSent: false });

    expect(enforceMock).toHaveBeenCalledWith("USER", "create:report");
    expect(create).toHaveBeenCalledWith({
      targetType: ReportTarget.USER,
      targetId: "target",
      reason: ReportReason.OTHER,
      reporterId: "reporter",
      customReason: "Useful reason",
    });
  });
});

describe("moderation actions", () => {
  const admin = { user: { id: "admin-1", role: "ADMIN" } };
  const wrongRole = { user: { id: "user-1", role: "USER" } };
  const user = {
    id: "user-2",
    name: "User",
    email: "user@example.com",
    role: "USER",
  };
  const organization = {
    ownerUserId: "owner-1",
    ownerEmail: "owner@example.com",
    orgName: "Org",
  };

  beforeEach(() => {
    enforceMock.mockImplementation((role: string, action: string) => {
      if (!can(role, action as AdminAction)) {
        throw new Error("Forbidden");
      }
    });
    userService.getUser.mockResolvedValue(user);
    organizationService.getOwnerNotificationDetails.mockResolvedValue(
      organization,
    );
    organizationService.remove.mockResolvedValue(organization);
    initiativePost.findUnique.mockResolvedValue({
      initiative: { organizerOrgId: "org-1" },
    });
    postsService.remove.mockResolvedValue({
      authorEmail: "author@example.com",
      initiativeTitle: "Initiative",
    });
  });

  it.each([
    ["freezeUser", () => freezeUser("user-2", "message")],
    ["unfreezeUser", () => unfreezeUser("user-2", "message")],
    ["removeUser", () => removeUser("user-2", "message")],
    ["restoreUser", () => restoreUser("user-2")],
    ["freezeOrganization", () => freezeOrganization("org-1", "message")],
    ["unfreezeOrganization", () => unfreezeOrganization("org-1", "message")],
    ["removeOrganization", () => removeOrganization("org-1", "message")],
    ["restoreOrganization", () => restoreOrganization("org-1")],
    ["removePost", () => removePost("post-1", "message")],
    ["dismissReport", () => dismissReport("report-1")],
  ])("%s rejects unauthenticated requests", async (_name, action) => {
    getSession.mockResolvedValue(null);
    await expect(action()).resolves.toMatchObject({ actionTaken: false });
  });

  it.each([
    ["freezeUser", () => freezeUser("user-2", "message")],
    ["unfreezeUser", () => unfreezeUser("user-2", "message")],
    ["removeUser", () => removeUser("user-2", "message")],
    ["restoreUser", () => restoreUser("user-2")],
    ["freezeOrganization", () => freezeOrganization("org-1", "message")],
    ["unfreezeOrganization", () => unfreezeOrganization("org-1", "message")],
    ["removeOrganization", () => removeOrganization("org-1", "message")],
    ["restoreOrganization", () => restoreOrganization("org-1")],
    ["removePost", () => removePost("post-1", "message")],
    ["dismissReport", () => dismissReport("report-1")],
  ])("%s rejects an unauthorized role", async (_name, action) => {
    getSession.mockResolvedValue(wrongRole);
    await expect(action()).resolves.toMatchObject({ actionTaken: false });
  });

  const manager = { user: { id: "manager-1", role: "MANAGER" } };

  it.each([
    ["freezeOrganization", () => freezeOrganization("org-1", "message")],
    ["removeOrganization", () => removeOrganization("org-1", "message")],
    ["restoreOrganization", () => restoreOrganization("org-1")],
  ])("%s rejects a MANAGER on ADMIN-only actions", async (_name, action) => {
    getSession.mockResolvedValue(manager);
    await expect(action()).resolves.toMatchObject({ actionTaken: false });
  });

  it.each([
    ["freezeUser", () => freezeUser("user-2", "message")],
    ["unfreezeUser", () => unfreezeUser("user-2", "message")],
    ["removeUser", () => removeUser("user-2", "message")],
    ["restoreUser", () => restoreUser("user-2")],
  ])("%s rejects modifications to ADMIN accounts", async (_name, action) => {
    getSession.mockResolvedValue(admin);
    userService.getUser.mockResolvedValue({ ...user, role: "ADMIN" });
    await expect(action()).resolves.toEqual({
      actionTaken: false,
      emailSent: false,
      error: "لا يمكن تعديل حسابات المسؤولين",
    });
  });

  it("rejects a MANAGER removing a post from an individual initiative", async () => {
    getSession.mockResolvedValue(manager);
    initiativePost.findUnique.mockResolvedValue({
      initiative: { organizerOrgId: null },
    });
    await expect(removePost("post-1", "message")).resolves.toEqual({
      actionTaken: false,
      emailSent: false,
      error: "لا يمكن للمدير إزالة منشور من مبادرة فردية",
    });
  });

  it("freezes and unfreezes users", async () => {
    getSession.mockResolvedValue(admin);
    userService.getUser.mockResolvedValue(user);
    userService.freeze.mockResolvedValue({
      userName: "User",
      userEmail: "user@example.com",
    });
    await expect(freezeUser("user-2", "message")).resolves.toMatchObject({
      actionTaken: true,
    });
    await expect(unfreezeUser("user-2", "message")).resolves.toMatchObject({
      actionTaken: true,
    });
    expect(userService.freeze).toHaveBeenCalledWith("user-2");
    expect(userService.unfreeze).toHaveBeenCalledWith("user-2");
  });

  it("removes and restores users", async () => {
    getSession.mockResolvedValue(admin);
    userService.getUser.mockResolvedValue(user);
    await expect(removeUser("user-2", "message")).resolves.toMatchObject({
      actionTaken: true,
    });
    await expect(restoreUser("user-2")).resolves.toMatchObject({
      actionTaken: true,
    });
    expect(userService.scheduleAccountDeletion).toHaveBeenCalledWith("user-2");
    expect(userService.restoreUser).toHaveBeenCalledWith("user-2");
  });

  it("moderates organizations", async () => {
    getSession.mockResolvedValue(admin);
    organizationService.getOwnerNotificationDetails.mockResolvedValue(
      organization,
    );
    organizationService.remove.mockResolvedValue(organization);
    await expect(freezeOrganization("org-1", "message")).resolves.toMatchObject(
      {
        actionTaken: true,
      },
    );
    await expect(
      unfreezeOrganization("org-1", "message"),
    ).resolves.toMatchObject({
      actionTaken: true,
    });
    await expect(removeOrganization("org-1", "message")).resolves.toMatchObject(
      {
        actionTaken: true,
      },
    );
    await expect(restoreOrganization("org-1")).resolves.toMatchObject({
      actionTaken: true,
    });
    expect(organizationService.freeze).toHaveBeenCalledWith("org-1");
    expect(organizationService.unfreeze).toHaveBeenCalledWith("org-1");
    expect(organizationService.remove).toHaveBeenCalledWith("org-1");
    expect(organizationService.restore).toHaveBeenCalledWith("org-1");
  });

  it("removes posts and dismisses reports", async () => {
    getSession.mockResolvedValue(admin);
    initiativePost.findUnique.mockResolvedValue({
      initiative: { organizerOrgId: "org-1" },
    });
    postsService.remove.mockResolvedValue({
      authorEmail: "author@example.com",
      initiativeTitle: "Initiative",
    });
    await expect(removePost("post-1", "message")).resolves.toMatchObject({
      actionTaken: true,
    });
    await expect(dismissReport("report-1")).resolves.toMatchObject({
      actionTaken: true,
    });
    expect(postsService.remove).toHaveBeenCalledWith("post-1");
    expect(reportService.dismiss).toHaveBeenCalledWith("report-1", "admin-1");
  });

  it("keeps the action successful when notification email fails", async () => {
    getSession.mockResolvedValue(admin);
    userService.getUser.mockResolvedValue(user);
    userService.freeze.mockResolvedValue({
      userName: "User",
      userEmail: "user@example.com",
    });
    sendMail.mockRejectedValue(new Error("mail failed"));
    await expect(freezeUser("user-2", "message")).resolves.toEqual({
      actionTaken: true,
      emailSent: false,
    });
    await expect(removeUser("user-2", "message")).resolves.toEqual({
      actionTaken: true,
      emailSent: false,
    });
    await expect(removeOrganization("org-1", "message")).resolves.toEqual({
      actionTaken: true,
      emailSent: false,
    });
  });
});
