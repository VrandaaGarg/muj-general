"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  activityLogs,
  appUsers,
  departments,
  researchItems,
  researchItemTags,
  tags,
  user,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { assertRoleAssignment } from "@/lib/auth/permissions";
import {
  createDepartmentSchema,
  archiveDepartmentSchema,
  archiveTagSchema,
  createTagSchema,
  deleteDepartmentSchema,
  deleteTagSchema,
  updateDepartmentSchema,
  updateTagSchema,
  updateUserAdminSchema,
} from "@/lib/validation/admin";
import { eq, sql } from "drizzle-orm";

export async function updateUserAdminAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/users",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = updateUserAdminSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
  });

  if (!parsed.success) {
    redirect("/admin/users?update=invalid");
  }

  const [targetUser] = await db
    .select({ id: user.id, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, parsed.data.userId))
    .limit(1);

  if (!targetUser) {
    redirect("/admin/users?update=missing");
  }

  try {
    assertRoleAssignment(parsed.data.role, targetUser.emailVerified);
  } catch {
    redirect("/admin/users?update=unverified");
  }

  await db
    .update(appUsers)
    .set({
      role: parsed.data.role,
      departmentId: parsed.data.departmentId || null,
      updatedAt: new Date(),
    })
    .where(eq(appUsers.id, parsed.data.userId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "user",
    targetId: parsed.data.userId,
    action: "admin_user_updated",
    metadata: JSON.stringify({
      role: parsed.data.role,
      departmentId: parsed.data.departmentId || null,
    }),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  redirect("/admin/users?update=success");
}

export async function createDepartmentAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/departments",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = createDepartmentSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect("/admin/departments?create=invalid");
  }

  await db.insert(departments).values({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
  });

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "department",
    targetId: parsed.data.slug,
    action: "department_created",
    metadata: JSON.stringify({
      name: parsed.data.name,
      slug: parsed.data.slug,
    }),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/departments");
  revalidatePath("/research");
  redirect("/admin/departments?create=success");
}

export async function updateDepartmentAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/departments",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = updateDepartmentSchema.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect("/admin/departments?op=invalid");
  }

  await db
    .update(departments)
    .set({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      updatedAt: new Date(),
    })
    .where(eq(departments.id, parsed.data.departmentId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "department",
    targetId: parsed.data.departmentId,
    action: "department_updated",
    metadata: JSON.stringify({
      departmentId: parsed.data.departmentId,
      name: parsed.data.name,
      slug: parsed.data.slug,
    }),
  });

  revalidatePath("/admin/departments");
  revalidatePath("/research");
  revalidatePath("/editor");
  redirect("/admin/departments?op=updated");
}

export async function archiveDepartmentAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/departments",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = archiveDepartmentSchema.safeParse({
    departmentId: formData.get("departmentId"),
    mode: formData.get("mode"),
  });

  if (!parsed.success) {
    redirect("/admin/departments?op=invalid");
  }

  await db
    .update(departments)
    .set({
      archivedAt: parsed.data.mode === "archive" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(departments.id, parsed.data.departmentId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "department",
    targetId: parsed.data.departmentId,
    action:
      parsed.data.mode === "archive" ? "department_archived" : "department_restored",
    metadata: JSON.stringify({
      departmentId: parsed.data.departmentId,
      mode: parsed.data.mode,
    }),
  });

  revalidatePath("/admin/departments");
  revalidatePath("/research");
  revalidatePath("/editor");
  redirect(`/admin/departments?op=${parsed.data.mode === "archive" ? "archived" : "restored"}`);
}

export async function deleteDepartmentAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/departments",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = deleteDepartmentSchema.safeParse({
    departmentId: formData.get("departmentId"),
  });

  if (!parsed.success) {
    redirect("/admin/departments?op=invalid");
  }

  const [usage] = await db
    .select({
      userCount: sql<number>`count(distinct ${appUsers.id})`,
      researchCount: sql<number>`count(distinct ${researchItems.id})`,
    })
    .from(departments)
    .leftJoin(appUsers, eq(appUsers.departmentId, departments.id))
    .leftJoin(researchItems, eq(researchItems.departmentId, departments.id))
    .where(eq(departments.id, parsed.data.departmentId));

  if (Number(usage?.userCount ?? 0) > 0 || Number(usage?.researchCount ?? 0) > 0) {
    redirect("/admin/departments?op=has-links");
  }

  await db.delete(departments).where(eq(departments.id, parsed.data.departmentId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "department",
    targetId: parsed.data.departmentId,
    action: "department_deleted",
    metadata: JSON.stringify({ departmentId: parsed.data.departmentId }),
  });

  revalidatePath("/admin/departments");
  revalidatePath("/research");
  revalidatePath("/editor");
  redirect("/admin/departments?op=deleted");
}

export async function createTagAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/tags",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = createTagSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    redirect("/admin/tags?create=invalid");
  }

  await db.insert(tags).values({
    name: parsed.data.name,
    slug: parsed.data.slug,
  });

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "tag",
    targetId: parsed.data.slug,
    action: "tag_created",
    metadata: JSON.stringify({
      name: parsed.data.name,
      slug: parsed.data.slug,
    }),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/tags");
  revalidatePath("/research");
  redirect("/admin/tags?create=success");
}

export async function updateTagAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/tags",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = updateTagSchema.safeParse({
    tagId: formData.get("tagId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    redirect("/admin/tags?op=invalid");
  }

  await db
    .update(tags)
    .set({
      name: parsed.data.name,
      slug: parsed.data.slug,
      updatedAt: new Date(),
    })
    .where(eq(tags.id, parsed.data.tagId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "tag",
    targetId: parsed.data.tagId,
    action: "tag_updated",
    metadata: JSON.stringify({
      tagId: parsed.data.tagId,
      name: parsed.data.name,
      slug: parsed.data.slug,
    }),
  });

  revalidatePath("/admin/tags");
  revalidatePath("/research");
  revalidatePath("/editor");
  redirect("/admin/tags?op=updated");
}

export async function archiveTagAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/tags",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = archiveTagSchema.safeParse({
    tagId: formData.get("tagId"),
    mode: formData.get("mode"),
  });

  if (!parsed.success) {
    redirect("/admin/tags?op=invalid");
  }

  await db
    .update(tags)
    .set({
      archivedAt: parsed.data.mode === "archive" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tags.id, parsed.data.tagId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "tag",
    targetId: parsed.data.tagId,
    action: parsed.data.mode === "archive" ? "tag_archived" : "tag_restored",
    metadata: JSON.stringify({ tagId: parsed.data.tagId, mode: parsed.data.mode }),
  });

  revalidatePath("/admin/tags");
  revalidatePath("/research");
  revalidatePath("/editor");
  redirect(`/admin/tags?op=${parsed.data.mode === "archive" ? "archived" : "restored"}`);
}

export async function deleteTagAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/tags",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = deleteTagSchema.safeParse({
    tagId: formData.get("tagId"),
  });

  if (!parsed.success) {
    redirect("/admin/tags?op=invalid");
  }

  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(researchItemTags)
    .where(eq(researchItemTags.tagId, parsed.data.tagId));

  if (Number(usage?.count ?? 0) > 0) {
    redirect("/admin/tags?op=has-links");
  }

  await db
    .delete(tags)
    .where(eq(tags.id, parsed.data.tagId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "tag",
    targetId: parsed.data.tagId,
    action: "tag_deleted",
    metadata: JSON.stringify({ tagId: parsed.data.tagId }),
  });

  revalidatePath("/admin/tags");
  revalidatePath("/research");
  revalidatePath("/editor");
  redirect("/admin/tags?op=deleted");
}
