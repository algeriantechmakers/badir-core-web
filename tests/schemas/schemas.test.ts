import {
  ParticipantRole,
  TargetAudience,
  InitiativeStatus,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  contactSchema,
  forgotPasswordSchema,
  initialSignupSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/schemas";
import { FormResponseSchema } from "@/schemas/joinInitiativeSchema";
import { categorySchema } from "@/schemas/categorySchema";
import {
  isTrustedDocumentPreviewUrl,
  trustedDocumentPreviewLinkSchema,
} from "@/schemas/documentLinkSchema";
import { initiativeRatingSchema } from "@/schemas/initiativeRatingSchema";
import { platformRatingSchema } from "@/schemas/platformRatingSchema";
import {
  FormFieldSchema,
  NewInitiativeSchema,
  validateNewInitiativeData,
} from "@/schemas/newInitiativeSchema";
import UserProfileSchema, {
  validateUserProfile,
} from "@/schemas/userProfileSchema";
import OrganizationProfileSchema, {
  validateOrganizationProfile,
} from "@/schemas/organizatioProfieSchema";
import {
  orgRegistrationSchema,
  signupOrgStep1Schema,
  signupOrgStep2Schema,
  signupOrgStep3Schema,
  signupOrgStep4Schema,
  signupOrgStep5Schema,
  signupOrgStep6Schema,
  signupOrgStep7Schema,
  validateOrgStep,
} from "@/schemas/signupOrgSchema";
import {
  registrationSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  validateStep,
} from "@/schemas/signupUserSchema";

describe("authentication schemas", () => {
  it("validates login credentials and rejects short passwords", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "secret123",
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({
        email: "not-an-email",
        password: "secret123",
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("validates initial signup and password confirmation", () => {
    const data = {
      email: "user@example.com",
      password: "secret123",
      confirmPassword: "secret123",
      firstName: "Test",
      lastName: "User",
      userType: "participant",
    };
    expect(initialSignupSchema.safeParse(data).success).toBe(true);
    expect(
      initialSignupSchema.safeParse({ ...data, confirmPassword: "different" })
        .success,
    ).toBe(false);
    expect(
      initialSignupSchema.safeParse({ ...data, firstName: "T" }).success,
    ).toBe(false);
  });

  it("validates forgot and reset password forms", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "invalid" }).success).toBe(
      false,
    );
    expect(
      resetPasswordSchema.safeParse({
        password: "Secret123",
        confirmPassword: "Secret123",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        password: "password",
        confirmPassword: "password",
      }).success,
    ).toBe(false);
  });
});

describe("user registration and profile schemas", () => {
  const registration = {
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
    bio: "A short biography",
    userType: "both",
    acceptConditions: true,
  };

  it("validates each user registration step and the combined schema", () => {
    expect(step1Schema.safeParse(registration).success).toBe(true);
    expect(step2Schema.safeParse(registration).success).toBe(true);
    expect(step3Schema.safeParse(registration).success).toBe(true);
    expect(registrationSchema.safeParse(registration).success).toBe(true);
    expect(validateStep(1, registration).success).toBe(true);
    expect(validateStep(2, registration).success).toBe(true);
    expect(validateStep(3, registration).success).toBe(true);
    expect(() => validateStep(4, registration)).toThrow("Invalid step number");
    expect(
      registrationSchema.safeParse({ ...registration, acceptConditions: false })
        .success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({
        ...registration,
        dateOfBirth: "2018-01-01",
      }).success,
    ).toBe(false);
  });

  it("validates a complete user profile and normalizes optional values", () => {
    const profile = {
      email: "USER@EXAMPLE.COM",
      firstName: "Test",
      lastName: "User",
      sex: "",
      phone: "",
      phoneCountryCode: "DZ",
      state: "Algiers",
      country: "Algeria",
      qualifications: {
        specification: "Engineering",
        educationalLevel: "University",
        currentJob: "",
      },
      bio: null,
    };
    const result = UserProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
    expect(result.success && result.data.email).toBe("user@example.com");
    expect(validateUserProfile(profile)).toEqual(result.data);
    expect(
      UserProfileSchema.safeParse({
        ...profile,
        qualifications: { ...profile.qualifications, specification: "" },
      }).success,
    ).toBe(false);
  });
});

describe("organization schemas", () => {
  const organization = {
    name: "Test Organization",
    shortName: "Test Org",
    description: "An organization description",
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
    workAreas: ["education"],
    shortDescription: "A sufficiently long organization description",
    previousInitiatives: "",
    userRole: "President",
    isLicensed: false,
    officialLicense: "",
    isVerified: false,
    logo: null,
    facebook: "",
    instagram: "",
    linkedin: "",
    twitter: "",
    youtube: "",
    other: "",
  };

  const registration = {
    shortName: "Test Org",
    officialName: "Test Organization",
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
    workAreas: ["education"],
    shortDescription: "A sufficiently long organization description",
    previousInitiatives: "",
    role: "President",
    contactPhone: "",
    contactPhoneCountryCode: "DZ",
    isLicensed: false,
    officialLicense: "",
    logo: "logo.jpg",
    identificationCard: "",
    acceptConditions: true,
    facebook: "",
    instagram: "",
    linkedin: "",
    twitter: "",
    youtube: "",
    other: "",
  };

  it("validates the organization profile and licensed-document rule", () => {
    expect(OrganizationProfileSchema.safeParse(organization).success).toBe(
      true,
    );
    expect(validateOrganizationProfile(organization).success).toBe(true);
    expect(
      OrganizationProfileSchema.safeParse({
        ...organization,
        isLicensed: true,
        officialLicense: "",
      }).success,
    ).toBe(false);
    expect(
      OrganizationProfileSchema.safeParse({
        ...organization,
        contactEmail: "invalid",
      }).success,
    ).toBe(false);
  });

  it("validates each organization registration step and the combined schema", () => {
    expect(signupOrgStep1Schema.safeParse(registration).success).toBe(true);
    expect(signupOrgStep2Schema.safeParse(registration).success).toBe(true);
    expect(signupOrgStep3Schema.safeParse(registration).success).toBe(true);
    expect(signupOrgStep4Schema.safeParse(registration).success).toBe(true);
    expect(signupOrgStep5Schema.safeParse(registration).success).toBe(true);
    expect(signupOrgStep6Schema.safeParse(registration).success).toBe(true);
    expect(signupOrgStep7Schema.safeParse(registration).success).toBe(true);
    expect(orgRegistrationSchema.safeParse(registration).success).toBe(true);
    for (let step = 1; step <= 7; step += 1) {
      expect(validateOrgStep(step, registration).success).toBe(true);
    }
    expect(() => validateOrgStep(8, registration)).toThrow(
      "Invalid step number",
    );
    expect(
      orgRegistrationSchema.safeParse({
        ...registration,
        acceptConditions: false,
      }).success,
    ).toBe(false);
  });
});

describe("initiative and participation schemas", () => {
  const initiative = {
    titleAr: "مبادرة تعليمية",
    titleEn: "Education Initiative",
    shortDescriptionAr: "وصف مختصر",
    descriptionAr: "وصف كامل للمبادرة يحتوي على أكثر من عشرة أحرف",
    categoryId: "category-1",
    isOnline: true,
    country: "Algeria",
    startDate: new Date("2030-01-01"),
    endDate: new Date("2030-01-02"),
    targetAudience: TargetAudience.both,
    requiresForm: true,
    participationQstForm: [
      { id: "question-1", question: "ما خبرتك؟", type: "text" },
    ],
    status: InitiativeStatus.draft,
  };

  it("validates custom participation fields and initiative rules", () => {
    expect(
      FormFieldSchema.safeParse({
        id: "question-1",
        question: "What is your experience?",
        type: "text",
      }).success,
    ).toBe(true);
    expect(
      FormFieldSchema.safeParse({ id: "q", question: "x", type: "text" })
        .success,
    ).toBe(false);
    expect(NewInitiativeSchema.safeParse(initiative).success).toBe(true);
    expect(validateNewInitiativeData(initiative).success).toBe(true);
    expect(
      NewInitiativeSchema.safeParse({
        ...initiative,
        endDate: new Date("2029-01-01"),
      }).success,
    ).toBe(false);
    expect(
      NewInitiativeSchema.safeParse({
        ...initiative,
        participationQstForm: [],
      }).success,
    ).toBe(false);
  });

  it("validates initiative response maps", () => {
    expect(
      FormResponseSchema.safeParse({
        experience: "five years",
        skills: ["teaching", "mentoring"],
      }).success,
    ).toBe(true);
    expect(FormResponseSchema.safeParse({ experience: 5 }).success).toBe(false);
    expect({
      initiativeId: "initiative-1",
      role: ParticipantRole.helper,
    }).toEqual(expect.objectContaining({ role: ParticipantRole.helper }));
  });
});

describe("rating, category, contact, and document schemas", () => {
  it("validates initiative ratings and half-star increments", () => {
    expect(initiativeRatingSchema.safeParse({ rating: 4.5 }).success).toBe(
      true,
    );
    expect(initiativeRatingSchema.safeParse({ rating: 4.25 }).success).toBe(
      false,
    );
    expect(
      initiativeRatingSchema.safeParse({
        rating: 5,
        comment: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("requires details when platform difficulties are reported", () => {
    const rating = {
      easeOfUse: "ممتاز",
      informationClarity: "جيد",
      contentDiversity: "جيد جدا",
      performanceSpeed: "ممتاز",
      generalSatisfaction: "جيد",
      usefulSections: ["المبادرات التطوعية"],
      encounteredDifficulties: "لا",
      wouldRecommend: "نعم، بالتأكيد",
      appRating: "5",
    };
    expect(platformRatingSchema.safeParse(rating).success).toBe(true);
    expect(
      platformRatingSchema.safeParse({
        ...rating,
        encounteredDifficulties: "نعم",
      }).success,
    ).toBe(false);
  });

  it("validates categories and hexadecimal colors", () => {
    expect(
      categorySchema.safeParse({
        nameAr: "تعليم",
        nameEn: "Education",
        bgColor: "#fff",
        textColor: "#FF5733",
      }).success,
    ).toBe(true);
    expect(
      categorySchema.safeParse({ nameAr: "A", bgColor: "red" }).success,
    ).toBe(false);
  });

  it("validates contact messages", () => {
    expect(
      contactSchema.safeParse({
        email: "user@example.com",
        fullName: "Test User",
        title: "Question",
        inquiryType: "استفسار عام",
        message: "This is a sufficiently long message.",
      }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({
        email: "invalid",
        fullName: "T",
        title: "Q",
        inquiryType: "unknown",
        message: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts trusted document preview hosts and rejects unsafe URLs", () => {
    expect(isTrustedDocumentPreviewUrl("https://drive.google.com/file/1")).toBe(
      true,
    );
    expect(isTrustedDocumentPreviewUrl("http://drive.google.com/file/1")).toBe(
      false,
    );
    expect(isTrustedDocumentPreviewUrl("https://evil.example/file")).toBe(
      false,
    );
    expect(
      trustedDocumentPreviewLinkSchema.safeParse(
        "https://www.dropbox.com/s/file",
      ).success,
    ).toBe(true);
  });
});
