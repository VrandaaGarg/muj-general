import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens");

const optionalMarkdownSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().max(20000).optional(),
);

const optionalDateSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? value : date;
  },
  z.date().optional(),
);

const checkboxBooleanSchema = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

export const updateUserAdminSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["reader", "editor", "admin"]),
  departmentId: z.string().uuid().optional().or(z.literal("")),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: slugSchema.max(180),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.max(140),
});

export const updateDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  slug: slugSchema.max(180),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateTagSchema = z.object({
  tagId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.max(140),
});

export const createJournalSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: slugSchema.max(280),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  coverImageKey: z
    .string()
    .trim()
    .max(2000)
    .regex(
      /^journal-covers\/[A-Za-z0-9._/-]+$/,
      "Cover image key must start with journal-covers/",
    )
    .optional()
    .or(z.literal("")),
  issn: z.string().trim().max(20).optional().or(z.literal("")),
  eissn: z.string().trim().max(20).optional().or(z.literal("")),
  aimAndScope: z.string().trim().max(5000).optional().or(z.literal("")),
  topics: z.string().trim().max(5000).optional().or(z.literal("")),
  contentTypes: z.string().trim().max(5000).optional().or(z.literal("")),
  ethicsPolicy: optionalMarkdownSchema,
  disclosuresPolicy: optionalMarkdownSchema,
  rightsPermissions: optionalMarkdownSchema,
  contactInfo: optionalMarkdownSchema,
  submissionChecklist: optionalMarkdownSchema,
  submissionGuidelines: optionalMarkdownSchema,
  howToPublish: optionalMarkdownSchema,
  feesAndFunding: optionalMarkdownSchema,
  editorialBoardCanReviewSubmissions: checkboxBooleanSchema.default(true),
});

export const updateJournalSchema = createJournalSchema.extend({
  journalId: z.string().uuid(),
  status: z.enum(["active", "archived"]),
});

export const createJournalVolumeSchema = z.object({
  journalId: z.string().uuid(),
  volumeNumber: z.coerce.number().int().min(1).max(10000),
  title: z.string().trim().max(255).optional().or(z.literal("")),
  year: z.coerce.number().int().min(1900).max(2100),
});

export const createJournalIssueSchema = z.object({
  journalId: z.string().uuid(),
  volumeId: z.string().uuid(),
  issueNumber: z.coerce.number().int().min(1).max(10000),
  title: z.string().trim().max(255).optional().or(z.literal("")),
  publishedAt: optionalDateSchema,
});

export const createJournalEditorialBoardSchema = z.object({
  journalId: z.string().uuid(),
  role: z.string().trim().min(2).max(100),
  personName: z.string().trim().min(2).max(200),
  affiliation: z.string().trim().max(500).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  orcid: z.string().trim().max(40).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

export const updateJournalEditorialBoardSchema =
  createJournalEditorialBoardSchema.extend({
    boardMemberId: z.string().uuid(),
  });

export const deleteJournalEditorialBoardSchema = z.object({
  boardMemberId: z.string().uuid(),
});

export const archiveDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  mode: z.enum(["archive", "restore"]),
});

export const archiveTagSchema = z.object({
  tagId: z.string().uuid(),
  mode: z.enum(["archive", "restore"]),
});

export const deleteDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
});

export const deleteTagSchema = z.object({
  tagId: z.string().uuid(),
});
