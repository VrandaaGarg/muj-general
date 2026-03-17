"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { activityLogs, appUsers, departments, tags, user } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { assertRoleAssignment } from "@/lib/auth/permissions";
import {
  createDepartmentSchema,
  createTagSchema,
  updateUserAdminSchema,
} from "@/lib/validation/admin";
import { eq } from "drizzle-orm";

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
