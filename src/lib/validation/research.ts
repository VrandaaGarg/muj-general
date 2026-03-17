import { z } from "zod";

function normalizeOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalTrimmedString(maxLength: number) {
  return z.preprocess(
    normalizeOptionalString,
    z.string().trim().max(maxLength).optional(),
  );
}

function optionalDateString() {
  return z.preprocess(
    normalizeOptionalString,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  );
}

function normalizeOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true" || value === "on" || value === "1";
  }

  return false;
}

export const researchItemTypeSchema = z.enum([
  "research_paper",
  "journal_article",
  "conference_paper",
  "thesis",
  "dissertation",
  "capstone_project",
  "technical_report",
  "patent",
  "poster",
  "dataset",
  "presentation",
]);

export const researchItemStatusSchema = z.enum([
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "published",
  "archived",
]);

export const createResearchItemSchema = z.object({
  title: z.string().trim().min(5).max(300),
  abstract: z.string().trim().min(50).max(5000),
  itemType: researchItemTypeSchema,
  publicationYear: z.coerce.number().int().min(1900).max(2100),
  departmentId: z.string().uuid(),
});

export const authorSchema = z.object({
  id: z.preprocess(normalizeOptionalString, z.string().uuid().optional()),
  displayName: z.string().trim().min(2).max(160),
  email: z.preprocess(
    normalizeOptionalString,
    z.string().email().max(255).optional(),
  ),
  affiliation: optionalTrimmedString(255),
  orcid: optionalTrimmedString(50),
  isCorresponding: z.preprocess(normalizeOptionalBoolean, z.boolean()),
});

export const tagIdSchema = z.string().uuid();

export const referenceSchema = z.object({
  citationText: z.string().trim().min(3).max(2000),
  url: z.preprocess(
    normalizeOptionalString,
    z.string().url().max(2048).optional(),
  ),
});

export const createResearchSubmissionSchema = createResearchItemSchema.extend({
  publicationDate: optionalDateString(),
  changeSummary: optionalTrimmedString(1000),
  license: optionalTrimmedString(160),
  externalUrl: z.preprocess(
    normalizeOptionalString,
    z.string().url().max(2048).optional(),
  ),
  doi: optionalTrimmedString(255),
  notesToAdmin: optionalTrimmedString(1000),
  supervisorName: optionalTrimmedString(160),
  programName: optionalTrimmedString(160),
  authors: z.array(authorSchema).min(1).max(20),
  tagIds: z.array(tagIdSchema).max(25),
  references: z.array(referenceSchema).max(100).default([]),
});

export const reviewResearchSubmissionSchema = z.object({
  researchItemId: z.string().uuid(),
  decision: z.enum(["publish", "request_changes"]),
  comment: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.string().trim().max(1000).optional().or(z.literal("")),
  ),
});

export type CreateResearchItemInput = z.infer<typeof createResearchItemSchema>;
export type CreateResearchSubmissionInput = z.infer<
  typeof createResearchSubmissionSchema
>;
export type ResearchAuthorInput = z.infer<typeof authorSchema>;
export type ResearchReferenceInput = z.infer<typeof referenceSchema>;
export type ReviewResearchSubmissionInput = z.infer<
  typeof reviewResearchSubmissionSchema
>;
