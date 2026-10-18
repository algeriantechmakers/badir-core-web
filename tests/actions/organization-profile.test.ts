import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../__mocks__/prisma";

const { getSession, organizationService } = vi.hoisted(() => ({
  getSession: vi.fn(),
  organizationService: {
    getOrganizationByUserId: vi.fn(),
    getOrganizationLogo: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/services/organizations", () => ({
  OrganizationService: organizationService,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/services/storage", () => ({
  StorageHelpers: vi.fn(function StorageHelpers() {
    return {
      uploadFile: vi.fn().mockResolvedValue({ path: "logo.jpg" }),
      getPublicUrl: vi.fn().mockReturnValue("https://storage.example/logo.jpg"),
    };
  }),
  extractStoragePath: vi.fn(),
}));

import {
  completeOrgProfileAction,
  getOrganizationData,
  getOrganizationLogo,
  updateOrganizationProfileAction,
} from "@/actions/organization-profile";

const validOrganization = {
  name: "Test Organization",
  shortName: "Test Org",
  description: "A useful organization",
  contactEmail: "org@example.com",
  foundingDate: new Date("2020-01-01"),
  membersCount: 10,
  headquarters: "Algiers",
  city: "Algiers",
  state: "Algiers",
  country: "Algeria",
  contactPhone: "",
  contactPhoneCountryCode: "DZ",
  organizationType: "charity",
  workAreas: ["Education"],
  userRole: "President",
  previousInitiatives: "",
  isLicensed: false,
  officialLicense: "",
  logo: null,
};

describe("organization profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    prismaMock.organization.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      organization: { id: "org-1", logo: null },
    });
    prismaMock.organization.update.mockResolvedValue({});
    prismaMock.organization.upsert.mockResolvedValue({ id: "org-1" });
    prismaMock.user.update.mockResolvedValue({});
  });

  it("returns errors for unauthenticated requests", async () => {
    getSession.mockResolvedValue(null);
    await expect(
      updateOrganizationProfileAction(validOrganization as any),
    ).resolves.toMatchObject({ success: false });
    await expect(completeOrgProfileAction({} as any)).resolves.toMatchObject({
      success: false,
    });
  });

  it("updates a valid organization profile", async () => {
    await expect(
      updateOrganizationProfileAction(validOrganization as any),
    ).resolves.toMatchObject({ success: true });
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "org-1" } }),
    );
  });

  it("returns validation errors for invalid organization data", async () => {
    await expect(
      updateOrganizationProfileAction({} as any),
    ).resolves.toMatchObject({ success: false, errors: expect.any(Object) });
  });

  it("completes a valid organization profile", async () => {
    const registration = {
      officialName: "Test Organization",
      shortName: "Test Org",
      contactEmail: "org@example.com",
      foundingDate: new Date("2020-01-01"),
      membersCount: 10,
      headquarters: "Algiers",
      city: "Algiers",
      state: "Algiers",
      country: "Algeria",
      contactPhoneOrg: "",
      contactPhoneOrgCountryCode: "DZ",
      organizationType: "charity",
      workAreas: ["Education"],
      shortDescription: "A sufficiently long organization description",
      previousInitiatives: "",
      role: "President",
      contactPhone: "",
      contactPhoneCountryCode: "DZ",
      isLicensed: false,
      officialLicense: "",
      logo: JSON.stringify({
        base64: "",
        name: "logo.jpg",
        type: "image/jpeg",
      }),
      identificationCard: "",
      acceptConditions: true,
      facebook: "",
      instagram: "",
      linkedin: "",
      twitter: "",
      youtube: "",
      other: "",
    };
    await expect(
      completeOrgProfileAction(registration as any),
    ).resolves.toMatchObject({
      success: true,
    });
    expect(prismaMock.organization.upsert).toHaveBeenCalled();
  });

  it("delegates organization data and logo lookups", async () => {
    organizationService.getOrganizationByUserId.mockResolvedValue({
      id: "org-1",
    });
    organizationService.getOrganizationLogo.mockResolvedValue({
      logo: "logo.jpg",
    });
    await expect(getOrganizationData()).resolves.toEqual({ id: "org-1" });
    await expect(getOrganizationLogo("org-1")).resolves.toBe("logo.jpg");
    expect(organizationService.getOrganizationByUserId).toHaveBeenCalledWith(
      "user-1",
    );
    expect(organizationService.getOrganizationLogo).toHaveBeenCalledWith(
      "org-1",
    );
  });
});
