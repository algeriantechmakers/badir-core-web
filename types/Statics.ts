import { JSX } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type CarouselImage = {
  id: number;
  src: string;
  alt: string;
};
export type TestimonialOpinion = {
  id: number;
  userName: string;
  initiative: string;
  comment: string;
};
export type Partner = {
  imageSrc: string;
  name: string;
  url?: string;
};
export type AboutInfo = {
  title: string;
  description: string | JSX.Element;
};
export type StatProps = {
  id: number;
  title: string;
  key: "organizations" | "initiatives" | "activeVolunteers";
  icon: JSX.Element;
};

// ===== FORM TYPES =====
export interface FormData {
  [fieldId: string]: any;
}

export interface FormField {
  id: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "multiselect"
    | "file"
    | "checkbox"
    | "radio";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select/radio/checkbox
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// ===== SEARCH & FILTER TYPES =====

export interface ProximitySearch {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

// ======== Object Storage ========

export type BUCKETS = "avatars" | "documents" | "post-images";

export const BUCKET_MIME_TYPES = {
  avatars: ["image/jpeg", "image/jpg", "image/png"],

  // DOCUMENTS BUCKET (Organization verification docs)
  documents: [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
  ],

  // POST-IMAGES BUCKET
  "post-images": [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/svg+xml",
  ],
};
export const BUCKET_SIZE_LIMITS = {
  avatars: 10 * 1024 * 1024, // 10MB
  documents: 15 * 1024 * 1024, // 15MB
  "post-images": 30 * 1024 * 1024, // 30MB
};

export const ALLOWED_INITIATIVE_IMAGES = 15;

// ======== ACTION RESPONSE ========

export type ActionResponse<T, R> = {
  success?: boolean;
  message?: string;
  error?: string;
  errors?: Partial<Record<keyof T, string[]>>;
  data?: R;
};
