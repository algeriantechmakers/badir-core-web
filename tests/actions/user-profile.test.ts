import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../__mocks__/prisma";

const { getSession, userService, logoutAction } = vi.hoisted(() => ({
  getSession: vi.fn(),
  userService: { getUserImage: vi.fn(), deleteUser: vi.fn() },
  logoutAction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/services/user", () => ({ UserService: userService }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/actions/logout", () => ({ logoutAction }));

import {
  completeProfileAction,
  deleteUserAccountAction,
  getUserImage,
  privacyPolicyConsentAction,
  updateUserProfileAction,
} from "@/actions/user-profile";
import { AUTHORIZED_REDIRECTION } from "@/data/routes";

const validProfile = {
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
  sex: "unspecified",
  phone: "",
  phoneCountryCode: "DZ",
  city: "Algiers",
  state: "Algiers",
  country: "Algeria",
  qualifications: {
    specification: "Engineering",
    educationalLevel: "University",
    currentJob: "Developer",
  },
  bio: "",
};

const validCompletion = {
  dateOfBirth: "2000-01-01",
  sex: "unspecified",
  phone: "",
  phoneCountryCode: "DZ",
  city: "Algiers",
  state: "Algiers",
  country: "Algeria",
  specification: "Engineering",
  educationalLevel: "University",
  customEducationalLevel: "",
  currentJob: "Developer",
  bio: "",
  userType: "both",
  acceptConditions: true,
};

describe("user profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Old",
      lastName: "Name",
    });
    prismaMock.userQualification.findFirst.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.userQualification.create.mockResolvedValue({});
  });

  it("rejects unauthenticated updateUserProfileAction", async () => {
    getSession.mockResolvedValue(null);
    await expect(updateUserProfileAction(validProfile as any)).resolves.toEqual(
      {
        success: false,
        error: "يجب تسجيل الدخول لتحديث بياناتك الشخصية",
      },
    );
  });

  it("rejects unauthenticated completeProfileAction", async () => {
    getSession.mockResolvedValue(null);
    await expect(
      completeProfileAction(validCompletion as any),
    ).resolves.toEqual({
      success: false,
      error: "يجب تسجيل الدخول أولاً",
    });
  });

  it("rejects unauthenticated privacyPolicyConsentAction", async () => {
    getSession.mockResolvedValue(null);
    await expect(privacyPolicyConsentAction()).resolves.toEqual({
      success: false,
      error: "يجب تسجيل الدخول أولاً",
    });
  });

  it("rejects unauthenticated deleteUserAccountAction", async () => {
    getSession.mockResolvedValue(null);
    await expect(deleteUserAccountAction()).resolves.toEqual({
      success: false,
      error: "يجب تسجيل الدخول لتحديث بياناتك الشخصية",
    });
    expect(logoutAction).not.toHaveBeenCalled();
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });

  it("updates a valid user profile", async () => {
    await expect(updateUserProfileAction(validProfile as any)).resolves.toEqual(
      {
        success: true,
        message: "تم تحديث البيانات الشخصية بنجاح",
      },
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
  });

  it("returns validation errors for an invalid user profile", async () => {
    await expect(updateUserProfileAction({} as any)).resolves.toEqual({
      success: false,
      errors: expect.any(Object),
    });
  });

  it("sanitizes HTML out of profile fields before writing", async () => {
    await updateUserProfileAction({
      ...validProfile,
      firstName: "<script>alert(1)</script>Test",
    } as any);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firstName: "Test" }),
      }),
    );
  });

  it("returns an error when the user record is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(updateUserProfileAction(validProfile as any)).resolves.toEqual(
      {
        success: false,
        error: "المستخدم غير موجود",
      },
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("completes a valid profile", async () => {
    await expect(
      completeProfileAction(validCompletion as any),
    ).resolves.toEqual({
      success: true,
      message: "تم إكمال الملف الشخصي بنجاح",
      data: { redirectTo: AUTHORIZED_REDIRECTION },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
  });

  it("returns validation errors for invalid profile completion", async () => {
    await expect(completeProfileAction({} as any)).resolves.toEqual({
      success: false,
      errors: expect.any(Object),
    });
  });

  it("records privacy policy consent", async () => {
    await expect(privacyPolicyConsentAction()).resolves.toEqual({
      success: true,
      message: "تم تسجيل موافقتك على سياسة الخصوصية بنجاح",
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          consentGiven: true,
          consentVersion: expect.any(String),
        }),
      }),
    );
  });

  it("short-circuits privacy consent when already consented", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ consentGiven: true });
    await expect(privacyPolicyConsentAction()).resolves.toEqual({
      success: true,
      message: "لقد سبق وقدمت موافقتك على سياسة الخصوصية",
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("gets an image through the user service", async () => {
    userService.getUserImage.mockResolvedValue({ image: "avatar.jpg" });
    await expect(getUserImage("user-1")).resolves.toBe("avatar.jpg");
    expect(userService.getUserImage).toHaveBeenCalledWith("user-1");
  });

  it("deletes an account through services", async () => {
    await expect(deleteUserAccountAction()).resolves.toEqual({
      success: true,
      message: "تم حذف حسابك بنجاح",
    });
    expect(logoutAction).toHaveBeenCalled();
    expect(userService.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("rejects account deletion for ADMIN users", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1", role: "ADMIN" } });
    await expect(deleteUserAccountAction()).resolves.toEqual({
      success: false,
      error: "لا يمكن حذف حساب المسؤول",
    });
    expect(logoutAction).not.toHaveBeenCalled();
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });
});
