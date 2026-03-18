import { z } from "zod";

export const updateUserAdminSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["reader", "editor", "admin"]),
  departmentId: z.string().uuid().optional().or(z.literal("")),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens"),
});

export const updateDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateTagSchema = z.object({
  tagId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens"),
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
