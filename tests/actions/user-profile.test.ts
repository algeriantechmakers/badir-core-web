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

  it("rejects unauthenticated profile mutations", async () => {
    getSession.mockResolvedValue(null);
    await expect(
      updateUserProfileAction(validProfile as any),
    ).resolves.toMatchObject({
      success: false,
    });
    await expect(
      completeProfileAction(validCompletion as any),
    ).resolves.toMatchObject({
      success: false,
    });
    await expect(privacyPolicyConsentAction()).resolves.toMatchObject({
      success: false,
    });
    await expect(deleteUserAccountAction()).resolves.toMatchObject({
      success: false,
    });
  });

  it("updates a valid user profile", async () => {
    await expect(
      updateUserProfileAction(validProfile as any),
    ).resolves.toMatchObject({
      success: true,
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
  });

  it("returns validation errors for an invalid user profile", async () => {
    await expect(updateUserProfileAction({} as any)).resolves.toMatchObject({
      success: false,
      errors: expect.any(Object),
    });
  });

  it("completes a valid profile and records privacy consent", async () => {
    await expect(
      completeProfileAction(validCompletion as any),
    ).resolves.toMatchObject({
      success: true,
    });
    await expect(privacyPolicyConsentAction()).resolves.toMatchObject({
      success: true,
    });
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it("returns validation errors for invalid profile completion", async () => {
    await expect(completeProfileAction({} as any)).resolves.toMatchObject({
      success: false,
      errors: expect.any(Object),
    });
  });

  it("gets an image and deletes an account through services", async () => {
    userService.getUserImage.mockResolvedValue({ image: "avatar.jpg" });
    await expect(getUserImage("user-1")).resolves.toBe("avatar.jpg");
    await expect(deleteUserAccountAction()).resolves.toMatchObject({
      success: true,
    });
    expect(userService.getUserImage).toHaveBeenCalledWith("user-1");
    expect(userService.deleteUser).toHaveBeenCalledWith("user-1");
  });
});
