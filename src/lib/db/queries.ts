import "server-only";

import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activityLogs,
  appUsers,
  departments,
  editorAccessRequests,
  itemVersions,
  moderationDecisions,
  researchItemAuthors,
  researchItemTags,
  researchItems,
  authors,
  files,
  tags,
  user,
} from "@/db/schema";

export type EditorAccessRequestStatus =
  (typeof editorAccessRequests.$inferSelect)["status"];

type PublishedResearchFilters = {
  query?: string;
  department?: string;
  type?: string;
  year?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
};

type PublishedResearchListItem = {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  publishedAt: Date | null;
  departmentName: string | null;
  departmentSlug: string | null;
  authors: { id: string; name: string }[];
  tags: { id: string; name: string; slug: string }[];
};

function buildPublishedResearchWhere(filters: PublishedResearchFilters) {
  const conditions = [eq(researchItems.status, "published")];

  if (filters.query?.trim()) {
    const pattern = `%${filters.query.trim()}%`;
    conditions.push(
      sql`(${ilike(researchItems.title, pattern)} or ${ilike(researchItems.abstract, pattern)})`,
    );
  }

  if (filters.department) {
    conditions.push(eq(departments.slug, filters.department));
  }

  if (filters.type) {
    conditions.push(eq(researchItems.itemType, filters.type as never));
  }

  if (filters.year) {
    const year = Number(filters.year);
    if (!Number.isNaN(year)) {
      conditions.push(eq(researchItems.publicationYear, year));
    }
  }

  if (filters.tag) {
    conditions.push(eq(tags.slug, filters.tag));
  }

  return and(...conditions);
}

async function attachResearchMeta<T extends { id: string }>(
  items: T[],
): Promise<Map<string, { authors: PublishedResearchListItem["authors"]; tags: PublishedResearchListItem["tags"] }>> {
  const itemIds = items.map((item) => item.id);
  const metaMap = new Map<
    string,
    { authors: PublishedResearchListItem["authors"]; tags: PublishedResearchListItem["tags"] }
  >();

  if (itemIds.length === 0) {
    return metaMap;
  }

  const [authorRows, tagRows] = await Promise.all([
    db
      .select({
        researchItemId: researchItemAuthors.researchItemId,
        authorId: authors.id,
        authorName: authors.displayName,
        authorOrder: researchItemAuthors.authorOrder,
      })
      .from(researchItemAuthors)
      .innerJoin(authors, eq(authors.id, researchItemAuthors.authorId))
      .where(inArray(researchItemAuthors.researchItemId, itemIds))
      .orderBy(asc(researchItemAuthors.authorOrder)),
    db
      .select({
        researchItemId: researchItemTags.researchItemId,
        tagId: tags.id,
        tagName: tags.name,
        tagSlug: tags.slug,
      })
      .from(researchItemTags)
      .innerJoin(tags, eq(tags.id, researchItemTags.tagId))
      .where(inArray(researchItemTags.researchItemId, itemIds))
      .orderBy(asc(tags.name)),
  ]);

  for (const itemId of itemIds) {
    metaMap.set(itemId, { authors: [], tags: [] });
  }

  for (const row of authorRows) {
    metaMap.get(row.researchItemId)?.authors.push({
      id: row.authorId,
      name: row.authorName,
    });
  }

  for (const row of tagRows) {
    metaMap.get(row.researchItemId)?.tags.push({
      id: row.tagId,
      name: row.tagName,
      slug: row.tagSlug,
    });
  }

  return metaMap;
}

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

export async function listTags() {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(tags)
    .orderBy(asc(tags.name));
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
      currentVersionId: researchItems.currentVersionId,
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
        title: researchItems.title,
        slug: researchItems.slug,
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
      title: item.title,
      slug: item.slug,
    };
  });
}

export async function listPublishedResearchItems(filters: PublishedResearchFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 9;

  const rows = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      abstract: researchItems.abstract,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      publishedAt: researchItems.publishedAt,
      departmentName: departments.name,
      departmentSlug: departments.slug,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(researchItemTags, eq(researchItemTags.researchItemId, researchItems.id))
    .leftJoin(tags, eq(tags.id, researchItemTags.tagId))
    .where(buildPublishedResearchWhere(filters))
    .groupBy(
      researchItems.id,
      departments.name,
      departments.slug,
    )
    .orderBy(desc(researchItems.publishedAt), desc(researchItems.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const metaMap = await attachResearchMeta(rows);

  return rows.map((row) => ({
    ...row,
    authors: metaMap.get(row.id)?.authors ?? [],
    tags: metaMap.get(row.id)?.tags ?? [],
  })) satisfies PublishedResearchListItem[];
}

export async function countPublishedResearchItems(filters: PublishedResearchFilters) {
  const [result] = await db
    .select({ count: sql<number>`count(distinct ${researchItems.id})` })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(researchItemTags, eq(researchItemTags.researchItemId, researchItems.id))
    .leftJoin(tags, eq(tags.id, researchItemTags.tagId))
    .where(buildPublishedResearchWhere(filters));

  return Number(result?.count ?? 0);
}

export async function listPublishedFilterOptions() {
  const [departmentOptions, yearOptions, tagOptions] = await Promise.all([
    db
      .selectDistinct({ name: departments.name, slug: departments.slug })
      .from(researchItems)
      .innerJoin(departments, eq(departments.id, researchItems.departmentId))
      .where(eq(researchItems.status, "published"))
      .orderBy(asc(departments.name)),
    db
      .selectDistinct({ year: researchItems.publicationYear })
      .from(researchItems)
      .where(eq(researchItems.status, "published"))
      .orderBy(desc(researchItems.publicationYear)),
    db
      .selectDistinct({ name: tags.name, slug: tags.slug })
      .from(researchItemTags)
      .innerJoin(researchItems, eq(researchItems.id, researchItemTags.researchItemId))
      .innerJoin(tags, eq(tags.id, researchItemTags.tagId))
      .where(eq(researchItems.status, "published"))
      .orderBy(asc(tags.name)),
  ]);

  return {
    departments: departmentOptions,
    years: yearOptions.map((option) => option.year),
    tags: tagOptions,
  };
}

export async function getPublishedResearchItemBySlug(slug: string) {
  const [item] = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      abstract: researchItems.abstract,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      publishedAt: researchItems.publishedAt,
      license: researchItems.license,
      externalUrl: researchItems.externalUrl,
      doi: researchItems.doi,
      departmentName: departments.name,
      departmentSlug: departments.slug,
      currentVersionId: researchItems.currentVersionId,
      supervisorName: itemVersions.supervisorName,
      programName: itemVersions.programName,
      notesToAdmin: itemVersions.notesToAdmin,
      fileId: files.id,
      fileOriginalName: files.originalName,
      fileObjectKey: files.objectKey,
      fileMimeType: files.mimeType,
      fileSizeBytes: files.sizeBytes,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(itemVersions, eq(itemVersions.id, researchItems.currentVersionId))
    .leftJoin(
      files,
      and(
        eq(files.researchItemId, researchItems.id),
        eq(files.itemVersionId, researchItems.currentVersionId),
        eq(files.fileKind, "main_pdf"),
      ),
    )
    .where(and(eq(researchItems.slug, slug), eq(researchItems.status, "published")))
    .limit(1);

  if (!item) {
    return null;
  }

  const [coverImage] = await db
    .select({
      objectKey: files.objectKey,
      originalName: files.originalName,
    })
    .from(files)
    .where(
      and(
        eq(files.researchItemId, item.id),
        eq(files.itemVersionId, item.currentVersionId!),
        eq(files.fileKind, "cover_image"),
      ),
    )
    .limit(1);

  const metaMap = await attachResearchMeta([{ id: item.id }]);

  return {
    ...item,
    authors: metaMap.get(item.id)?.authors ?? [],
    tags: metaMap.get(item.id)?.tags ?? [],
    coverImageObjectKey: coverImage?.objectKey ?? null,
  };
}

export async function listRelatedPublishedResearchItems(params: {
  researchItemId: string;
  departmentSlug?: string | null;
  itemType?: string;
}) {
  const rows = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      departmentName: departments.name,
      departmentSlug: departments.slug,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .where(
      and(
        eq(researchItems.status, "published"),
        sql`${researchItems.id} <> ${params.researchItemId}`,
        params.departmentSlug ? eq(departments.slug, params.departmentSlug) : undefined,
      ),
    )
    .orderBy(desc(researchItems.publishedAt), desc(researchItems.updatedAt))
    .limit(3);

  return rows;
}

export async function getAuthorById(authorId: string) {
  const [author] = await db
    .select({
      id: authors.id,
      name: authors.displayName,
      affiliation: authors.affiliation,
      email: authors.email,
      orcid: authors.orcid,
    })
    .from(authors)
    .where(eq(authors.id, authorId))
    .limit(1);

  if (!author) {
    return null;
  }

  const items = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      abstract: researchItems.abstract,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      publishedAt: researchItems.publishedAt,
      departmentName: departments.name,
      departmentSlug: departments.slug,
    })
    .from(researchItemAuthors)
    .innerJoin(researchItems, eq(researchItems.id, researchItemAuthors.researchItemId))
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .where(
      and(
        eq(researchItemAuthors.authorId, authorId),
        eq(researchItems.status, "published"),
      ),
    )
    .orderBy(desc(researchItems.publishedAt), desc(researchItems.updatedAt));

  const metaMap = await attachResearchMeta(items);

  return {
    ...author,
    items: items.map((item) => ({
      ...item,
      authors: metaMap.get(item.id)?.authors ?? [],
      tags: metaMap.get(item.id)?.tags ?? [],
    })),
  };
}

export async function getDepartmentBySlug(departmentSlug: string) {
  const [department] = await db
    .select({
      id: departments.id,
      name: departments.name,
      slug: departments.slug,
      description: departments.description,
    })
    .from(departments)
    .where(eq(departments.slug, departmentSlug))
    .limit(1);

  if (!department) {
    return null;
  }

  const items = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      abstract: researchItems.abstract,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      publishedAt: researchItems.publishedAt,
      departmentName: departments.name,
      departmentSlug: departments.slug,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .where(
      and(
        eq(researchItems.status, "published"),
        eq(departments.slug, departmentSlug),
      ),
    )
    .orderBy(desc(researchItems.publishedAt), desc(researchItems.updatedAt));

  const metaMap = await attachResearchMeta(items);

  return {
    ...department,
    items: items.map((item) => ({
      ...item,
      authors: metaMap.get(item.id)?.authors ?? [],
      tags: metaMap.get(item.id)?.tags ?? [],
    })),
  };
}

export async function getOwnedResearchItemForRevision(params: {
  slug: string;
  userId: string;
}) {
  const [item] = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      abstract: researchItems.abstract,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      departmentId: researchItems.departmentId,
      departmentName: departments.name,
      status: researchItems.status,
      license: researchItems.license,
      externalUrl: researchItems.externalUrl,
      doi: researchItems.doi,
      currentVersionId: researchItems.currentVersionId,
      currentVersionNumber: itemVersions.versionNumber,
      changeSummary: itemVersions.changeSummary,
      notesToAdmin: itemVersions.notesToAdmin,
      supervisorName: itemVersions.supervisorName,
      programName: itemVersions.programName,
      publicationDate: itemVersions.publicationDate,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(itemVersions, eq(itemVersions.id, researchItems.currentVersionId))
    .where(
      and(
        eq(researchItems.slug, params.slug),
        eq(researchItems.submittedByUserId, params.userId),
      ),
    )
    .limit(1);

  if (!item) {
    return null;
  }

  const [decisions, versions, authorRows, tagRows, currentFiles] = await Promise.all([
    db
      .select({
        id: moderationDecisions.id,
        decision: moderationDecisions.decision,
        comment: moderationDecisions.comment,
        createdAt: moderationDecisions.createdAt,
      })
      .from(moderationDecisions)
      .where(eq(moderationDecisions.researchItemId, item.id))
      .orderBy(desc(moderationDecisions.createdAt)),
    db
      .select({
        id: itemVersions.id,
        versionNumber: itemVersions.versionNumber,
        title: itemVersions.title,
        createdAt: itemVersions.createdAt,
        notesToAdmin: itemVersions.notesToAdmin,
      })
      .from(itemVersions)
      .where(eq(itemVersions.researchItemId, item.id))
      .orderBy(desc(itemVersions.versionNumber)),
    db
      .select({
        id: authors.id,
        displayName: authors.displayName,
        email: authors.email,
        affiliation: authors.affiliation,
        orcid: authors.orcid,
        authorOrder: researchItemAuthors.authorOrder,
        isCorresponding: researchItemAuthors.isCorresponding,
      })
      .from(researchItemAuthors)
      .innerJoin(authors, eq(authors.id, researchItemAuthors.authorId))
      .where(eq(researchItemAuthors.researchItemId, item.id))
      .orderBy(asc(researchItemAuthors.authorOrder)),
    db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(researchItemTags)
      .innerJoin(tags, eq(tags.id, researchItemTags.tagId))
      .where(eq(researchItemTags.researchItemId, item.id))
      .orderBy(asc(tags.name)),
    item.currentVersionId
      ? db
          .select({
            id: files.id,
            fileKind: files.fileKind,
            storageBucket: files.storageBucket,
            objectKey: files.objectKey,
            originalName: files.originalName,
            mimeType: files.mimeType,
            sizeBytes: files.sizeBytes,
            checksum: files.checksum,
          })
          .from(files)
          .where(
            and(
              eq(files.researchItemId, item.id),
              eq(files.itemVersionId, item.currentVersionId),
              inArray(files.fileKind, ["main_pdf", "cover_image"]),
            ),
          )
      : Promise.resolve([]),
  ]);

  const currentPdf =
    currentFiles.find((file) => file.fileKind === "main_pdf") ?? null;
  const currentCoverImage =
    currentFiles.find((file) => file.fileKind === "cover_image") ?? null;

  return {
    ...item,
    authors: authorRows.map((author) => ({
      id: author.id,
      displayName: author.displayName,
      email: author.email,
      affiliation: author.affiliation,
      orcid: author.orcid,
      isCorresponding: author.isCorresponding,
      authorOrder: author.authorOrder,
    })),
    tags: tagRows,
    tagIds: tagRows.map((tag) => tag.id),
    pdfFile: currentPdf,
    coverImageFile: currentCoverImage,
    decisions,
    versions,
  };
}

export async function listAdminUsers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: appUsers.role,
      departmentId: appUsers.departmentId,
      departmentName: departments.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .innerJoin(appUsers, eq(appUsers.id, user.id))
    .leftJoin(departments, eq(departments.id, appUsers.departmentId))
    .orderBy(desc(user.createdAt));
}

export async function listDepartmentAdminStats() {
  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      slug: departments.slug,
      description: departments.description,
      createdAt: departments.createdAt,
      userCount: sql<number>`count(distinct ${appUsers.id})`,
      researchCount: sql<number>`count(distinct ${researchItems.id})`,
    })
    .from(departments)
    .leftJoin(appUsers, eq(appUsers.departmentId, departments.id))
    .leftJoin(researchItems, eq(researchItems.departmentId, departments.id))
    .groupBy(departments.id)
    .orderBy(asc(departments.name));

  return rows.map((row) => ({
    ...row,
    userCount: Number(row.userCount ?? 0),
    researchCount: Number(row.researchCount ?? 0),
  }));
}

export async function listTagAdminStats() {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      createdAt: tags.createdAt,
      researchCount: sql<number>`count(distinct ${researchItemTags.researchItemId})`,
    })
    .from(tags)
    .leftJoin(researchItemTags, eq(researchItemTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));

  return rows.map((row) => ({
    ...row,
    researchCount: Number(row.researchCount ?? 0),
  }));
}

export async function listModerationHistory() {
  return db
    .select({
      id: moderationDecisions.id,
      decision: moderationDecisions.decision,
      comment: moderationDecisions.comment,
      createdAt: moderationDecisions.createdAt,
      researchItemId: researchItems.id,
      researchTitle: researchItems.title,
      researchSlug: researchItems.slug,
      reviewerName: user.name,
      reviewerEmail: user.email,
      departmentName: departments.name,
    })
    .from(moderationDecisions)
    .innerJoin(researchItems, eq(researchItems.id, moderationDecisions.researchItemId))
    .innerJoin(appUsers, eq(appUsers.id, moderationDecisions.reviewedByUserId))
    .innerJoin(user, eq(user.id, appUsers.id))
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .orderBy(desc(moderationDecisions.createdAt));
}
