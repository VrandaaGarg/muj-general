import { z } from "zod";

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

export const createResearchSubmissionSchema = createResearchItemSchema.extend({
  license: z.string().trim().max(160).optional().or(z.literal("")),
  externalUrl: z.url().optional().or(z.literal("")),
  doi: z.string().trim().max(255).optional().or(z.literal("")),
  notesToAdmin: z.string().trim().max(1000).optional().or(z.literal("")),
  supervisorName: z.string().trim().max(160).optional().or(z.literal("")),
  programName: z.string().trim().max(160).optional().or(z.literal("")),
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
export type ReviewResearchSubmissionInput = z.infer<
  typeof reviewResearchSubmissionSchema
>;
