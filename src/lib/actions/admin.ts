"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  activityLogs,
  appUsers,
  departments,
  journalEditorialBoard,
  journalIssues,
  journals,
  journalVolumes,
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
  createJournalIssueSchema,
  createJournalSchema,
  createJournalEditorialBoardSchema,
  createJournalVolumeSchema,
  createTagSchema,
  deleteJournalEditorialBoardSchema,
  deleteDepartmentSchema,
  deleteTagSchema,
  updateJournalEditorialBoardSchema,
  updateJournalSchema,
  updateDepartmentSchema,
  updateTagSchema,
  updateUserAdminSchema,
} from "@/lib/validation/admin";
import { eq, sql } from "drizzle-orm";

function getErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if ("code" in error && typeof error.code === "string") return error.code;
  if (
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause &&
    typeof error.cause.code === "string"
  ) {
    return error.cause.code;
  }
  return null;
}

function getConstraintName(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if (
    "constraint" in error &&
    typeof error.constraint === "string" &&
    error.constraint.length > 0
  ) {
    return error.constraint;
  }
  if (
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "constraint" in error.cause &&
    typeof error.cause.constraint === "string" &&
    error.cause.constraint.length > 0
  ) {
    return error.cause.constraint;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : null;
  if (!message) return null;
  if (message.includes("journals_slug_unique")) return "journals_slug_unique";
  if (message.includes("journals_name_unique")) return "journals_name_unique";
  return null;
}

export async function updateUserAdminAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/users",
    unauthorizedRedirectTo: "/settings",
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
  revalidatePath("/settings");
  redirect("/admin/users?update=success");
}

export async function createDepartmentAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/departments",
    unauthorizedRedirectTo: "/settings",
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
    unauthorizedRedirectTo: "/settings",
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
    unauthorizedRedirectTo: "/settings",
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
    unauthorizedRedirectTo: "/settings",
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
    unauthorizedRedirectTo: "/settings",
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
    unauthorizedRedirectTo: "/settings",
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
    unauthorizedRedirectTo: "/settings",
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
    unauthorizedRedirectTo: "/settings",
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

export async function createJournalAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const parsed = createJournalSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    coverImageKey: formData.get("coverImageKey"),
    issn: formData.get("issn"),
    eissn: formData.get("eissn"),
    aimAndScope: formData.get("aimAndScope"),
    topics: formData.get("topics"),
    contentTypes: formData.get("contentTypes"),
    ethicsPolicy: formData.get("ethicsPolicy"),
    disclosuresPolicy: formData.get("disclosuresPolicy"),
    rightsPermissions: formData.get("rightsPermissions"),
    contactInfo: formData.get("contactInfo"),
    submissionChecklist: formData.get("submissionChecklist"),
    submissionGuidelines: formData.get("submissionGuidelines"),
    howToPublish: formData.get("howToPublish"),
    feesAndFunding: formData.get("feesAndFunding"),
    boardMembersJson: formData.get("boardMembersJson"),
    editorialBoardCanReviewSubmissions: formData.get(
      "editorialBoardCanReviewSubmissions",
    ),
  });

  if (!parsed.success) {
    redirect("/admin/journals?op=invalid");
  }

  let journal: { id: string; slug: string };
  try {
    const [inserted] = await db
      .insert(journals)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        coverImageKey: parsed.data.coverImageKey || null,
        issn: parsed.data.issn || null,
        eissn: parsed.data.eissn || null,
        aimAndScope: parsed.data.aimAndScope || null,
        topics: parsed.data.topics || null,
        contentTypes: parsed.data.contentTypes || null,
        ethicsPolicy: parsed.data.ethicsPolicy,
        disclosuresPolicy: parsed.data.disclosuresPolicy,
        rightsPermissions: parsed.data.rightsPermissions,
        contactInfo: parsed.data.contactInfo,
        submissionChecklist: parsed.data.submissionChecklist,
        submissionGuidelines: parsed.data.submissionGuidelines,
        howToPublish: parsed.data.howToPublish,
        feesAndFunding: parsed.data.feesAndFunding,
        editorialBoardCanReviewSubmissions:
          parsed.data.editorialBoardCanReviewSubmissions,
      })
      .returning({ id: journals.id, slug: journals.slug });
    journal = inserted;
  } catch (error) {
    if (getErrorCode(error) === "23505") {
      const constraint = getConstraintName(error);
      if (constraint === "journals_slug_unique") {
        redirect("/admin/journals?op=slug-exists");
      }
      if (constraint === "journals_name_unique") {
        redirect("/admin/journals?op=name-exists");
      }
      redirect("/admin/journals?op=invalid");
    }
    throw error;
  }

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "journal",
    targetId: journal.id,
    action: "journal_created",
    metadata: JSON.stringify({ journalId: journal.id, slug: journal.slug }),
  });

  if (parsed.data.boardMembersJson && parsed.data.boardMembersJson.length > 0) {
    await db.insert(journalEditorialBoard).values(
      parsed.data.boardMembersJson.map((member, index) => ({
        journalId: journal.id,
        role: member.role,
        personName: member.personName,
        affiliation: member.affiliation || null,
        email: member.email || null,
        orcid: member.orcid || null,
        displayOrder: Number.isFinite(member.displayOrder)
          ? member.displayOrder
          : index,
      })),
    );
  }

  revalidatePath("/admin/journals");
  revalidatePath("/journals");
  revalidatePath("/editor");
  redirect("/admin/journals?op=created");
}

export async function updateJournalAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const parsed = updateJournalSchema.safeParse({
    journalId: formData.get("journalId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    coverImageKey: formData.get("coverImageKey"),
    issn: formData.get("issn"),
    eissn: formData.get("eissn"),
    aimAndScope: formData.get("aimAndScope"),
    topics: formData.get("topics"),
    contentTypes: formData.get("contentTypes"),
    ethicsPolicy: formData.get("ethicsPolicy"),
    disclosuresPolicy: formData.get("disclosuresPolicy"),
    rightsPermissions: formData.get("rightsPermissions"),
    contactInfo: formData.get("contactInfo"),
    submissionChecklist: formData.get("submissionChecklist"),
    submissionGuidelines: formData.get("submissionGuidelines"),
    howToPublish: formData.get("howToPublish"),
    feesAndFunding: formData.get("feesAndFunding"),
    editorialBoardCanReviewSubmissions: formData.get(
      "editorialBoardCanReviewSubmissions",
    ),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect("/admin/journals?op=invalid");
  }

  try {
    await db
      .update(journals)
      .set({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        coverImageKey: parsed.data.coverImageKey || null,
        issn: parsed.data.issn || null,
        eissn: parsed.data.eissn || null,
        aimAndScope: parsed.data.aimAndScope || null,
        topics: parsed.data.topics || null,
        contentTypes: parsed.data.contentTypes || null,
        ethicsPolicy: parsed.data.ethicsPolicy,
        disclosuresPolicy: parsed.data.disclosuresPolicy,
        rightsPermissions: parsed.data.rightsPermissions,
        contactInfo: parsed.data.contactInfo,
        submissionChecklist: parsed.data.submissionChecklist,
        submissionGuidelines: parsed.data.submissionGuidelines,
        howToPublish: parsed.data.howToPublish,
        feesAndFunding: parsed.data.feesAndFunding,
        editorialBoardCanReviewSubmissions:
          parsed.data.editorialBoardCanReviewSubmissions,
        status: parsed.data.status,
        updatedAt: new Date(),
      })
      .where(eq(journals.id, parsed.data.journalId));
  } catch (error) {
    if (getErrorCode(error) === "23505") {
      const constraint = getConstraintName(error);
      if (constraint === "journals_slug_unique") {
        redirect("/admin/journals?op=slug-exists");
      }
      if (constraint === "journals_name_unique") {
        redirect("/admin/journals?op=name-exists");
      }
      redirect("/admin/journals?op=invalid");
    }
    throw error;
  }

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "journal",
    targetId: parsed.data.journalId,
    action: "journal_updated",
    metadata: JSON.stringify({ journalId: parsed.data.journalId, status: parsed.data.status }),
  });

  revalidatePath("/admin/journals");
  revalidatePath("/journals");
  revalidatePath("/editor");
  redirect("/admin/journals?op=updated");
}

export async function createJournalVolumeAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const parsed = createJournalVolumeSchema.safeParse({
    journalId: formData.get("journalId"),
    volumeNumber: formData.get("volumeNumber"),
    title: formData.get("title"),
    year: formData.get("year"),
  });

  if (!parsed.success) {
    redirect("/admin/journals?op=invalid-volume");
  }

  const [volume] = await db
    .insert(journalVolumes)
    .values({
      journalId: parsed.data.journalId,
      volumeNumber: parsed.data.volumeNumber,
      title: parsed.data.title || null,
      year: parsed.data.year,
    })
    .returning({ id: journalVolumes.id });

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "journal_volume",
    targetId: volume.id,
    action: "journal_volume_created",
    metadata: JSON.stringify({ journalId: parsed.data.journalId, volumeId: volume.id }),
  });

  revalidatePath("/admin/journals");
  redirect("/admin/journals?op=volume-created");
}

export async function createJournalIssueAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const parsed = createJournalIssueSchema.safeParse({
    journalId: formData.get("journalId"),
    volumeId: formData.get("volumeId"),
    issueNumber: formData.get("issueNumber"),
    title: formData.get("title"),
    publishedAt: formData.get("publishedAt"),
  });

  if (!parsed.success) {
    redirect("/admin/journals?op=invalid-issue");
  }

  const [volume] = await db
    .select({ id: journalVolumes.id, journalId: journalVolumes.journalId })
    .from(journalVolumes)
    .where(eq(journalVolumes.id, parsed.data.volumeId))
    .limit(1);

  if (!volume || volume.journalId !== parsed.data.journalId) {
    redirect("/admin/journals?op=invalid-issue");
  }

  const [issue] = await db
    .insert(journalIssues)
    .values({
      journalId: parsed.data.journalId,
      volumeId: parsed.data.volumeId,
      issueNumber: parsed.data.issueNumber,
      title: parsed.data.title || null,
      publishedAt: parsed.data.publishedAt ?? null,
    })
    .returning({ id: journalIssues.id });

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "journal_issue",
    targetId: issue.id,
    action: "journal_issue_created",
    metadata: JSON.stringify({ journalId: parsed.data.journalId, issueId: issue.id }),
  });

  revalidatePath("/admin/journals");
  revalidatePath("/journals");
  redirect("/admin/journals?op=issue-created");
}

export async function createJournalEditorialBoardAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const parsed = createJournalEditorialBoardSchema.safeParse({
    journalId: formData.get("journalId"),
    role: formData.get("role"),
    personName: formData.get("personName"),
    affiliation: formData.get("affiliation"),
    email: formData.get("email"),
    orcid: formData.get("orcid"),
    displayOrder: formData.get("displayOrder"),
  });

  if (!parsed.success) {
    redirect("/admin/journals?op=invalid-board");
  }

  const [member] = await db
    .insert(journalEditorialBoard)
    .values({
      journalId: parsed.data.journalId,
      role: parsed.data.role,
      personName: parsed.data.personName,
      affiliation: parsed.data.affiliation || null,
      email: parsed.data.email || null,
      orcid: parsed.data.orcid || null,
      displayOrder: parsed.data.displayOrder,
    })
    .returning({ id: journalEditorialBoard.id });

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "journal_editorial_board",
    targetId: member.id,
    action: "journal_editorial_board_created",
    metadata: JSON.stringify({
      journalId: parsed.data.journalId,
      boardMemberId: member.id,
      role: parsed.data.role,
    }),
  });

  revalidatePath("/admin/journals");
  revalidatePath("/journals");
  redirect("/admin/journals?op=board-created");
}

export async function updateJournalEditorialBoardAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const parsed = updateJournalEditorialBoardSchema.safeParse({
    boardMemberId: formData.get("boardMemberId"),
    journalId: formData.get("journalId"),
    role: formData.get("role"),
    personName: formData.get("personName"),
    affiliation: formData.get("affiliation"),
    email: formData.get("email"),
    orcid: formData.get("orcid"),
    displayOrder: formData.get("displayOrder"),
  });

  if (!parsed.success) {
    redirect("/admin/journals?op=invalid-board");
  }

  await db
    .update(journalEditorialBoard)
    .set({
      role: parsed.data.role,
      personName: parsed.data.personName,
      affiliation: parsed.data.affiliation || null,
      email: parsed.data.email || null,
      orcid: parsed.data.orcid || null,
      displayOrder: parsed.data.displayOrder,
      updatedAt: new Date(),
    })
    .where(eq(journalEditorialBoard.id, parsed.data.boardMemberId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "journal_editorial_board",
    targetId: parsed.data.boardMemberId,
    action: "journal_editorial_board_updated",
    metadata: JSON.stringify({
      journalId: parsed.data.journalId,
      boardMemberId: parsed.data.boardMemberId,
      role: parsed.data.role,
    }),
  });

  revalidatePath("/admin/journals");
  revalidatePath("/journals");
  redirect("/admin/journals?op=board-updated");
}

export async function deleteJournalEditorialBoardAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const parsed = deleteJournalEditorialBoardSchema.safeParse({
    boardMemberId: formData.get("boardMemberId"),
  });

  if (!parsed.success) {
    redirect("/admin/journals?op=invalid-board");
  }

  const [member] = await db
    .select({ id: journalEditorialBoard.id, journalId: journalEditorialBoard.journalId })
    .from(journalEditorialBoard)
    .where(eq(journalEditorialBoard.id, parsed.data.boardMemberId))
    .limit(1);

  if (!member) {
    redirect("/admin/journals?op=invalid-board");
  }

  await db.delete(journalEditorialBoard).where(eq(journalEditorialBoard.id, parsed.data.boardMemberId));

  await db.insert(activityLogs).values({
    actorUserId: session.appUser.id,
    targetType: "journal_editorial_board",
    targetId: parsed.data.boardMemberId,
    action: "journal_editorial_board_deleted",
    metadata: JSON.stringify({
      journalId: member.journalId,
      boardMemberId: parsed.data.boardMemberId,
    }),
  });

  revalidatePath("/admin/journals");
  revalidatePath("/journals");
  redirect("/admin/journals?op=board-deleted");
}
