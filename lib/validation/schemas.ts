import { z } from "zod";

/**
 * Site creation validation schema
 * - name: required, minimum 2 characters
 * - projectId: optional (can be empty string for unassigned)
 * - timezone: optional IANA timezone identifier (defaults to Australia/Sydney)
 */
export const siteCreationSchema = z.object({
  name: z
    .string()
    .min(2, "Site name must be at least 2 characters")
    .max(100, "Site name must be 100 characters or less"),
  projectId: z.string().optional(),
  timezone: z.string().optional(),
});

export type SiteCreationFormData = z.infer<typeof siteCreationSchema>;

/**
 * Site edit validation schema
 * - name: required, minimum 2 characters
 * - timezone: optional IANA timezone identifier
 * - slug: optional, allows manual slug editing (superadmin only)
 */
export const siteEditSchema = z.object({
  name: z
    .string()
    .min(2, "Site name must be at least 2 characters")
    .max(100, "Site name must be 100 characters or less"),
  timezone: z.string().optional(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be 50 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
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
  editReason: z
    .string()
    .max(200, "Edit reason must be 200 characters or less")
    .optional()
    .or(z.literal("")),
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
 * - phoneNumber: optional, must be valid international format
 */
export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .max(100, "Display name must be 100 characters or less")
    .optional()
    .or(z.literal("")),
  phoneNumber: z
    .string()
    .max(30, "Phone number must be 30 characters or less")
    .regex(
      /^[\+]?[\d\s\-\(\)]+$/,
      "Please enter a valid phone number (e.g., +61 2 1234 5678 or 0412 345 678)"
    )
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
