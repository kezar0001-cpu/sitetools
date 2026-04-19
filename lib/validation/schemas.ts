import { z } from "zod";

/**
 * Site creation validation schema
 * - name: required, minimum 2 characters
 * - projectId: optional (can be empty string for unassigned)
 */
export const siteCreationSchema = z.object({
  name: z
    .string()
    .min(2, "Site name must be at least 2 characters")
    .max(100, "Site name must be 100 characters or less"),
  projectId: z.string().optional(),
});

export type SiteCreationFormData = z.infer<typeof siteCreationSchema>;

/**
 * Site edit validation schema
 * - name: required, minimum 2 characters
 */
export const siteEditSchema = z.object({
  name: z
    .string()
    .min(2, "Site name must be at least 2 characters")
    .max(100, "Site name must be 100 characters or less"),
});

export type SiteEditFormData = z.infer<typeof siteEditSchema>;

/**
 * Visitor type options
 */
export const visitorTypes = ["Worker", "Subcontractor", "Visitor", "Delivery"] as const;
export type VisitorType = typeof visitorTypes[number];

/**
 * Visit entry validation schema
 * - fullName: required
 * - companyName: required
 * - phoneNumber: optional
 * - visitorType: required, must be one of the valid types
 * - signedInAt: optional datetime string
 * - signedOutAt: optional datetime string
 */
export const visitEntrySchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be 100 characters or less"),
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name must be 100 characters or less"),
  phoneNumber: z
    .string()
    .max(20, "Phone number must be 20 characters or less")
    .optional()
    .or(z.literal("")),
  visitorType: z.enum(["Worker", "Subcontractor", "Visitor", "Delivery"]),
  signedInAt: z.string().optional(),
  signedOutAt: z.string().optional(),
});

export type VisitEntryFormData = z.infer<typeof visitEntrySchema>;

/**
 * Visit edit validation schema
 * Similar to visitEntrySchema but with required signedInAt
 */
export const visitEditSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be 100 characters or less"),
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name must be 100 characters or less"),
  phoneNumber: z
    .string()
    .max(20, "Phone number must be 20 characters or less")
    .optional()
    .or(z.literal("")),
  visitorType: z.enum(["Worker", "Subcontractor", "Visitor", "Delivery"]),
  signedInAt: z.string().min(1, "Signed in time is required"),
  signedOutAt: z.string().optional().or(z.literal("")),
});

export type VisitEditFormData = z.infer<typeof visitEditSchema>;

/**
 * Company profile update validation schema
 * - companyName: required, trimmed
 */
export const companyProfileSchema = z.object({
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name must be 100 characters or less"),
});

export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

/**
 * Profile update validation schema
 * - displayName: optional, max 100 characters
 */
export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .max(100, "Display name must be 100 characters or less")
    .optional()
    .or(z.literal("")),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

/**
 * Diary entry validation schema
 * - date: required
 * - At least one section must have content (enforced at form level)
 */
export const diaryEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  weather: z.object({
    morning: z.string().optional(),
    afternoon: z.string().optional(),
  }).optional(),
  workCompleted: z.string().optional(),
  plannedWorks: z.string().optional(),
  labour: z.array(z.object({
    trade: z.string(),
    count: z.number().min(0),
    hours: z.number().min(0),
  })).optional(),
  equipment: z.array(z.object({
    type: z.string(),
    count: z.number().min(0),
    hours: z.number().min(0),
  })).optional(),
  notes: z.string().optional(),
});

export type DiaryEntryFormData = z.infer<typeof diaryEntrySchema>;
