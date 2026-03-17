import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activityLogs,
  appUsers,
  departments,
  editorAccessRequests,
  itemVersions,
  moderationDecisions,
  researchItems,
  user,
} from "@/db/schema";

export type EditorAccessRequestStatus =
  (typeof editorAccessRequests.$inferSelect)["status"];

export async function logActivity(params: {
  actorUserId?: string | null;
  targetType: string;
  targetId: string;
  action: string;
  metadata?: Record<string, string | null | undefined>;
}) {
  await db.insert(activityLogs).values({
    actorUserId: params.actorUserId ?? null,
    targetType: params.targetType,
    targetId: params.targetId,
    action: params.action,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
  });
}

export async function ensureAppUser(userId: string) {
  await db.insert(appUsers).values({ id: userId }).onConflictDoNothing();
  return getAppUserById(userId);
}

export async function getAppUserById(userId: string) {
  const [result] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: appUsers.role,
      departmentId: appUsers.departmentId,
      departmentName: departments.name,
      departmentSlug: departments.slug,
    })
    .from(user)
    .innerJoin(appUsers, eq(appUsers.id, user.id))
    .leftJoin(departments, eq(departments.id, appUsers.departmentId))
    .where(eq(user.id, userId))
    .limit(1);

  return result ?? null;
}

export async function listDepartments() {
  return db
    .select({
      id: departments.id,
      name: departments.name,
      slug: departments.slug,
      description: departments.description,
    })
    .from(departments)
    .orderBy(departments.name);
}

export async function getLatestEditorAccessRequestForUser(userId: string) {
  const [request] = await db
    .select({
      id: editorAccessRequests.id,
      status: editorAccessRequests.status,
      message: editorAccessRequests.message,
      rejectionReason: editorAccessRequests.rejectionReason,
      reviewedAt: editorAccessRequests.reviewedAt,
      createdAt: editorAccessRequests.createdAt,
      updatedAt: editorAccessRequests.updatedAt,
    })
    .from(editorAccessRequests)
    .where(eq(editorAccessRequests.userId, userId))
    .orderBy(desc(editorAccessRequests.createdAt))
    .limit(1);

  return request ?? null;
}

export async function hasPendingEditorAccessRequest(userId: string) {
  const [request] = await db
    .select({ id: editorAccessRequests.id })
    .from(editorAccessRequests)
    .where(
      and(
        eq(editorAccessRequests.userId, userId),
        eq(editorAccessRequests.status, "pending"),
      ),
    )
    .limit(1);

  return Boolean(request);
}

export async function createEditorAccessRequest(params: {
  userId: string;
  message?: string;
}) {
  const [request] = await db
    .insert(editorAccessRequests)
    .values({
      userId: params.userId,
      message: params.message?.trim() || null,
    })
    .returning({
      id: editorAccessRequests.id,
      status: editorAccessRequests.status,
    });

  return request;
}

export async function listPendingEditorAccessRequests() {
  return db
    .select({
      id: editorAccessRequests.id,
      status: editorAccessRequests.status,
      message: editorAccessRequests.message,
      rejectionReason: editorAccessRequests.rejectionReason,
      createdAt: editorAccessRequests.createdAt,
      requestedByUserId: user.id,
      requestedByName: user.name,
      requestedByEmail: user.email,
      requestedByDepartmentName: departments.name,
    })
    .from(editorAccessRequests)
    .innerJoin(appUsers, eq(appUsers.id, editorAccessRequests.userId))
    .innerJoin(user, eq(user.id, appUsers.id))
    .leftJoin(departments, eq(departments.id, appUsers.departmentId))
    .where(eq(editorAccessRequests.status, "pending"))
    .orderBy(desc(editorAccessRequests.createdAt));
}

export async function countPendingEditorAccessRequests() {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(editorAccessRequests)
    .where(eq(editorAccessRequests.status, "pending"));

  return Number(result?.count ?? 0);
}

export async function reviewEditorAccessRequest(params: {
  requestId: string;
  reviewerUserId: string;
  status: Extract<EditorAccessRequestStatus, "approved" | "rejected">;
  rejectionReason?: string;
}) {
  return db.transaction(async (tx) => {
    const [existingRequest] = await tx
      .select({
        id: editorAccessRequests.id,
        userId: editorAccessRequests.userId,
        status: editorAccessRequests.status,
      })
      .from(editorAccessRequests)
      .where(eq(editorAccessRequests.id, params.requestId))
      .limit(1);

    if (!existingRequest) {
      throw new Error("Editor access request not found.");
    }

    if (existingRequest.status !== "pending") {
      throw new Error("This request has already been reviewed.");
    }

    const [updatedRequest] = await tx
      .update(editorAccessRequests)
      .set({
        status: params.status,
        reviewedByUserId: params.reviewerUserId,
        reviewedAt: new Date(),
        rejectionReason:
          params.status === "rejected"
            ? params.rejectionReason?.trim() || null
            : null,
        updatedAt: new Date(),
      })
      .where(eq(editorAccessRequests.id, params.requestId))
      .returning({
        id: editorAccessRequests.id,
        userId: editorAccessRequests.userId,
        status: editorAccessRequests.status,
      });

    if (params.status === "approved") {
      await tx
        .update(appUsers)
        .set({ role: "editor", updatedAt: new Date() })
        .where(eq(appUsers.id, existingRequest.userId));
    }

    await tx.insert(activityLogs).values({
      actorUserId: params.reviewerUserId,
      targetType: "editor_access_request",
      targetId: params.requestId,
      action:
        params.status === "approved"
          ? "editor_request_approved"
          : "editor_request_rejected",
      metadata: JSON.stringify({
        requestId: params.requestId,
        userId: existingRequest.userId,
        status: params.status,
      }),
    });

    return updatedRequest;
  });
}

export async function listResearchItemsForEditor(userId: string) {
  return db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      status: researchItems.status,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      createdAt: researchItems.createdAt,
      updatedAt: researchItems.updatedAt,
      departmentName: departments.name,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .where(eq(researchItems.submittedByUserId, userId))
    .orderBy(desc(researchItems.updatedAt));
}

export async function listPendingResearchModerationItems() {
  return db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      createdAt: researchItems.createdAt,
      updatedAt: researchItems.updatedAt,
      submittedByName: user.name,
      submittedByEmail: user.email,
      departmentName: departments.name,
      notesToAdmin: itemVersions.notesToAdmin,
      currentVersionId: itemVersions.id,
    })
    .from(researchItems)
    .innerJoin(appUsers, eq(appUsers.id, researchItems.submittedByUserId))
    .innerJoin(user, eq(user.id, appUsers.id))
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(itemVersions, eq(itemVersions.id, researchItems.currentVersionId))
    .where(eq(researchItems.status, "submitted"))
    .orderBy(desc(researchItems.updatedAt));
}

export async function countPendingResearchModerationItems() {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(researchItems)
    .where(eq(researchItems.status, "submitted"));

  return Number(result?.count ?? 0);
}

export async function reviewResearchSubmission(params: {
  researchItemId: string;
  reviewerUserId: string;
  decision: "publish" | "request_changes";
  comment?: string;
}) {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .select({
        id: researchItems.id,
        currentVersionId: researchItems.currentVersionId,
        status: researchItems.status,
        submittedByUserId: researchItems.submittedByUserId,
      })
      .from(researchItems)
      .where(eq(researchItems.id, params.researchItemId))
      .limit(1);

    if (!item) {
      throw new Error("Research submission not found.");
    }

    if (!item.currentVersionId) {
      throw new Error("Research submission is missing its current version.");
    }

    if (item.status !== "submitted") {
      throw new Error("This submission is not currently awaiting review.");
    }

    await tx.insert(moderationDecisions).values({
      researchItemId: item.id,
      itemVersionId: item.currentVersionId,
      reviewedByUserId: params.reviewerUserId,
      decision:
        params.decision === "publish" ? "approved" : "changes_requested",
      comment: params.comment?.trim() || null,
    });

    await tx
      .update(researchItems)
      .set({
        status:
          params.decision === "publish" ? "published" : "changes_requested",
        publishedAt: params.decision === "publish" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(researchItems.id, params.researchItemId));

    await tx.insert(activityLogs).values({
      actorUserId: params.reviewerUserId,
      targetType: "research_item",
      targetId: params.researchItemId,
      action:
        params.decision === "publish"
          ? "research_item_published"
          : "research_item_changes_requested",
      metadata: JSON.stringify({
        researchItemId: params.researchItemId,
        decision: params.decision,
      }),
    });

    return {
      id: item.id,
      decision: params.decision,
      submittedByUserId: item.submittedByUserId,
    };
  });
}
