import { Initiative, InitiativeCategory, OrganizerType } from "@prisma/client";

export interface InitiativeCard extends Pick<
  Initiative,
  | "id"
  | "titleAr"
  | "titleEn"
  | "shortDescriptionAr"
  | "shortDescriptionEn"
  | "coverImage"
  | "city"
  | "startDate"
  | "endDate"
  | "maxParticipants"
  | "currentParticipants"
  | "targetAudience"
  | "status"
> {
  category: Pick<
    InitiativeCategory,
    "nameAr" | "nameEn" | "bgColor" | "textColor"
  >;
  organizer: {
    type: OrganizerType;
    name: string;
    image?: string;
  };
  distance?: number; // in kilometers
}
