import { z } from "zod";

export const createEditorAccessRequestSchema = z.object({
  message: z.string().trim().max(500).optional().or(z.literal("")),
});

export const reviewEditorAccessRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateEditorAccessRequestInput = z.infer<
  typeof createEditorAccessRequestSchema
>;
export type ReviewEditorAccessRequestInput = z.infer<
  typeof reviewEditorAccessRequestSchema
>;
