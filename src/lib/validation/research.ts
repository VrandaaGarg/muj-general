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

export type CreateResearchItemInput = z.infer<typeof createResearchItemSchema>;
