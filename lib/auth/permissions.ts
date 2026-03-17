import { z } from "zod";

export const appRoleSchema = z.enum(["reader", "editor", "admin"]);

export type AppRole = z.infer<typeof appRoleSchema>;

export const elevatedRoles = new Set<AppRole>(["editor", "admin"]);

export function canAssignRole(targetRole: AppRole, emailVerified: boolean) {
  if (!elevatedRoles.has(targetRole)) {
    return true;
  }

  return emailVerified;
}

export function assertRoleAssignment(targetRole: AppRole, emailVerified: boolean) {
  if (!canAssignRole(targetRole, emailVerified)) {
    throw new Error("Only verified users can be promoted to editor or admin.");
  }
}
