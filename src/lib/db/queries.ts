import "server-only";

import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { normalizeJournalRichText } from "@/lib/journal-rich-text";
import {
  activityLogs,
  appUsers,
  departments,
  editorAccessRequests,
  itemVersions,
  journalEditorialBoard,
  journalIssues,
  journals,
  journalVolumes,
  moderationDecisions,
  researchItemAuthors,
  researchItemReferences,
  researchItemPeerReviews,
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
  coverImageObjectKey: string | null;
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
    const slugs = filters.department.split(",").filter(Boolean);
    if (slugs.length === 1) {
      conditions.push(eq(departments.slug, slugs[0]));
    } else if (slugs.length > 1) {
      conditions.push(inArray(departments.slug, slugs));
    }
  }

  if (filters.type) {
    const types = filters.type.split(",").filter(Boolean);
    if (types.length === 1) {
      conditions.push(eq(researchItems.itemType, types[0] as never));
    } else if (types.length > 1) {
      conditions.push(inArray(researchItems.itemType, types as never));
    }
  }

  if (filters.year) {
    const years = filters.year.split(",").map(Number).filter((n) => !Number.isNaN(n));
    if (years.length === 1) {
      conditions.push(eq(researchItems.publicationYear, years[0]));
    } else if (years.length > 1) {
      conditions.push(inArray(researchItems.publicationYear, years));
    }
  }

  if (filters.tag) {
    const tagSlugs = filters.tag.split(",").filter(Boolean);
    if (tagSlugs.length === 1) {
      conditions.push(eq(tags.slug, tagSlugs[0]));
    } else if (tagSlugs.length > 1) {
      conditions.push(inArray(tags.slug, tagSlugs));
    }
  }

  return and(...conditions);
}

type ResearchMeta = {
  authors: PublishedResearchListItem["authors"];
  tags: PublishedResearchListItem["tags"];
  coverImageObjectKey: string | null;
};

async function attachResearchMeta<T extends { id: string }>(
  items: T[],
): Promise<Map<string, ResearchMeta>> {
  const itemIds = items.map((item) => item.id);
  const metaMap = new Map<string, ResearchMeta>();

  if (itemIds.length === 0) {
    return metaMap;
  }

  const [authorRows, tagRows, coverRows] = await Promise.all([
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
    db
      .select({
        researchItemId: files.researchItemId,
        objectKey: files.objectKey,
      })
      .from(files)
      .innerJoin(researchItems, eq(researchItems.id, files.researchItemId))
      .where(
        and(
          inArray(files.researchItemId, itemIds),
          eq(files.fileKind, "cover_image"),
          sql`${files.itemVersionId} = ${researchItems.currentVersionId}`,
        ),
      ),
  ]);

  for (const itemId of itemIds) {
    metaMap.set(itemId, { authors: [], tags: [], coverImageObjectKey: null });
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

  for (const row of coverRows) {
    const meta = metaMap.get(row.researchItemId);
    if (meta) {
      meta.coverImageObjectKey = row.objectKey;
    }
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

export async function listDepartments(options?: { includeIds?: string[] }) {
  const includeIds = options?.includeIds ?? [];

  const whereClause =
    includeIds.length > 0
      ? or(isNull(departments.archivedAt), inArray(departments.id, includeIds))
      : isNull(departments.archivedAt);

  return db
    .select({
      id: departments.id,
      name: departments.name,
      slug: departments.slug,
      description: departments.description,
      archivedAt: departments.archivedAt,
    })
    .from(departments)
    .where(whereClause)
    .orderBy(departments.name);
}

export async function listTags(options?: { includeIds?: string[] }) {
  const includeIds = options?.includeIds ?? [];

  const whereClause =
    includeIds.length > 0
      ? or(isNull(tags.archivedAt), inArray(tags.id, includeIds))
      : isNull(tags.archivedAt);

  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      archivedAt: tags.archivedAt,
    })
    .from(tags)
    .where(whereClause)
    .orderBy(asc(tags.name));
}

export async function listJournalOptions(options?: { includeIds?: string[] }) {
  const includeIds = options?.includeIds ?? [];

  return db
    .select({
      id: journals.id,
      name: journals.name,
      slug: journals.slug,
      status: journals.status,
    })
    .from(journals)
    .where(
      includeIds.length > 0
        ? or(eq(journals.status, "active"), inArray(journals.id, includeIds))
        : eq(journals.status, "active"),
    )
    .orderBy(asc(journals.name));
}

export async function listJournalIssueOptions(journalId?: string) {
  return db
    .select({
      id: journalIssues.id,
      journalId: journalIssues.journalId,
      volumeId: journalIssues.volumeId,
      issueNumber: journalIssues.issueNumber,
      issueTitle: journalIssues.title,
      publishedAt: journalIssues.publishedAt,
      volumeNumber: journalVolumes.volumeNumber,
      volumeYear: journalVolumes.year,
    })
    .from(journalIssues)
    .innerJoin(journalVolumes, eq(journalVolumes.id, journalIssues.volumeId))
    .where(journalId ? eq(journalIssues.journalId, journalId) : undefined)
    .orderBy(desc(journalVolumes.year), desc(journalVolumes.volumeNumber), desc(journalIssues.issueNumber));
}

export async function listJournalAdminOverview() {
  const rows = await db
    .select({
      id: journals.id,
      name: journals.name,
      slug: journals.slug,
      description: journals.description,
      coverImageKey: journals.coverImageKey,
      issn: journals.issn,
      eissn: journals.eissn,
      aimAndScope: journals.aimAndScope,
      topics: journals.topics,
      contentTypes: journals.contentTypes,
      ethicsPolicy: journals.ethicsPolicy,
      disclosuresPolicy: journals.disclosuresPolicy,
      rightsPermissions: journals.rightsPermissions,
      contactInfo: journals.contactInfo,
      submissionChecklist: journals.submissionChecklist,
      submissionGuidelines: journals.submissionGuidelines,
      howToPublish: journals.howToPublish,
      feesAndFunding: journals.feesAndFunding,
      editorialBoardCanReviewSubmissions:
        journals.editorialBoardCanReviewSubmissions,
      status: journals.status,
      createdAt: journals.createdAt,
      volumeCount: sql<number>`count(distinct ${journalVolumes.id})`,
      issueCount: sql<number>`count(distinct ${journalIssues.id})`,
      itemCount: sql<number>`count(distinct ${researchItems.id})`,
    })
    .from(journals)
    .leftJoin(journalVolumes, eq(journalVolumes.journalId, journals.id))
    .leftJoin(journalIssues, eq(journalIssues.journalId, journals.id))
    .leftJoin(researchItems, eq(researchItems.journalId, journals.id))
    .groupBy(journals.id)
    .orderBy(asc(journals.name));

  const [volumes, issues, editorialBoard] = await Promise.all([
    db
      .select({
        id: journalVolumes.id,
        journalId: journalVolumes.journalId,
        volumeNumber: journalVolumes.volumeNumber,
        title: journalVolumes.title,
        year: journalVolumes.year,
      })
      .from(journalVolumes)
      .orderBy(desc(journalVolumes.year), desc(journalVolumes.volumeNumber)),
    db
      .select({
        id: journalIssues.id,
        journalId: journalIssues.journalId,
        volumeId: journalIssues.volumeId,
        issueNumber: journalIssues.issueNumber,
        title: journalIssues.title,
        publishedAt: journalIssues.publishedAt,
      })
      .from(journalIssues)
      .orderBy(desc(journalIssues.publishedAt), desc(journalIssues.issueNumber)),
    db
      .select({
        id: journalEditorialBoard.id,
        journalId: journalEditorialBoard.journalId,
        role: journalEditorialBoard.role,
        personName: journalEditorialBoard.personName,
        affiliation: journalEditorialBoard.affiliation,
        email: journalEditorialBoard.email,
        orcid: journalEditorialBoard.orcid,
        displayOrder: journalEditorialBoard.displayOrder,
      })
      .from(journalEditorialBoard)
      .orderBy(
        asc(journalEditorialBoard.journalId),
        asc(journalEditorialBoard.displayOrder),
        asc(journalEditorialBoard.personName),
      ),
  ]);

  return rows.map((row) => ({
    ...row,
    ethicsPolicy: normalizeJournalRichText(row.ethicsPolicy),
    disclosuresPolicy: normalizeJournalRichText(row.disclosuresPolicy),
    rightsPermissions: normalizeJournalRichText(row.rightsPermissions),
    contactInfo: normalizeJournalRichText(row.contactInfo),
    submissionChecklist: normalizeJournalRichText(row.submissionChecklist),
    submissionGuidelines: normalizeJournalRichText(row.submissionGuidelines),
    howToPublish: normalizeJournalRichText(row.howToPublish),
    feesAndFunding: normalizeJournalRichText(row.feesAndFunding),
    volumes: volumes.filter((volume) => volume.journalId === row.id),
    issues: issues.filter((issue) => issue.journalId === row.id),
    editorialBoard: editorialBoard.filter((member) => member.journalId === row.id),
  }));
}

export async function getJournalForAdminEdit(journalSlug: string) {
  const [journal] = await db
    .select({
      id: journals.id,
      name: journals.name,
      slug: journals.slug,
      description: journals.description,
      coverImageKey: journals.coverImageKey,
      issn: journals.issn,
      eissn: journals.eissn,
      aimAndScope: journals.aimAndScope,
      topics: journals.topics,
      contentTypes: journals.contentTypes,
      ethicsPolicy: journals.ethicsPolicy,
      disclosuresPolicy: journals.disclosuresPolicy,
      rightsPermissions: journals.rightsPermissions,
      contactInfo: journals.contactInfo,
      submissionChecklist: journals.submissionChecklist,
      submissionGuidelines: journals.submissionGuidelines,
      howToPublish: journals.howToPublish,
      feesAndFunding: journals.feesAndFunding,
      editorialBoardCanReviewSubmissions:
        journals.editorialBoardCanReviewSubmissions,
      status: journals.status,
      createdAt: journals.createdAt,
    })
    .from(journals)
    .where(eq(journals.slug, journalSlug))
    .limit(1);

  if (!journal) return null;

  const [volumes, issues, editorialBoard] = await Promise.all([
    db
      .select({
        id: journalVolumes.id,
        journalId: journalVolumes.journalId,
        volumeNumber: journalVolumes.volumeNumber,
        title: journalVolumes.title,
        year: journalVolumes.year,
      })
      .from(journalVolumes)
      .where(eq(journalVolumes.journalId, journal.id))
      .orderBy(desc(journalVolumes.year), desc(journalVolumes.volumeNumber)),
    db
      .select({
        id: journalIssues.id,
        journalId: journalIssues.journalId,
        volumeId: journalIssues.volumeId,
        issueNumber: journalIssues.issueNumber,
        title: journalIssues.title,
        publishedAt: journalIssues.publishedAt,
      })
      .from(journalIssues)
      .where(eq(journalIssues.journalId, journal.id))
      .orderBy(desc(journalIssues.publishedAt), desc(journalIssues.issueNumber)),
    db
      .select({
        id: journalEditorialBoard.id,
        journalId: journalEditorialBoard.journalId,
        role: journalEditorialBoard.role,
        personName: journalEditorialBoard.personName,
        affiliation: journalEditorialBoard.affiliation,
        email: journalEditorialBoard.email,
        orcid: journalEditorialBoard.orcid,
        displayOrder: journalEditorialBoard.displayOrder,
      })
      .from(journalEditorialBoard)
      .where(eq(journalEditorialBoard.journalId, journal.id))
      .orderBy(
        asc(journalEditorialBoard.displayOrder),
        asc(journalEditorialBoard.personName),
      ),
  ]);

  return {
    ...journal,
    ethicsPolicy: normalizeJournalRichText(journal.ethicsPolicy),
    disclosuresPolicy: normalizeJournalRichText(journal.disclosuresPolicy),
    rightsPermissions: normalizeJournalRichText(journal.rightsPermissions),
    contactInfo: normalizeJournalRichText(journal.contactInfo),
    submissionChecklist: normalizeJournalRichText(journal.submissionChecklist),
    submissionGuidelines: normalizeJournalRichText(journal.submissionGuidelines),
    howToPublish: normalizeJournalRichText(journal.howToPublish),
    feesAndFunding: normalizeJournalRichText(journal.feesAndFunding),
    volumes,
    issues,
    editorialBoard,
  };
}

export async function listPublicJournals() {
  return db
    .select({
      id: journals.id,
      name: journals.name,
      slug: journals.slug,
      coverImageKey: journals.coverImageKey,
      description: journals.description,
      issn: journals.issn,
      eissn: journals.eissn,
      createdAt: journals.createdAt,
      itemCount: sql<number>`count(distinct ${researchItems.id})`,
    })
    .from(journals)
    .leftJoin(
      researchItems,
      and(eq(researchItems.journalId, journals.id), eq(researchItems.status, "published")),
    )
    .where(eq(journals.status, "active"))
    .groupBy(journals.id)
    .orderBy(asc(journals.name));
}

export async function getPublicJournalBySlug(slug: string) {
  const [journal] = await db
    .select({
      id: journals.id,
      name: journals.name,
      slug: journals.slug,
      coverImageKey: journals.coverImageKey,
      description: journals.description,
      issn: journals.issn,
      eissn: journals.eissn,
      aimAndScope: journals.aimAndScope,
      topics: journals.topics,
      contentTypes: journals.contentTypes,
      ethicsPolicy: journals.ethicsPolicy,
      disclosuresPolicy: journals.disclosuresPolicy,
      rightsPermissions: journals.rightsPermissions,
      contactInfo: journals.contactInfo,
      submissionChecklist: journals.submissionChecklist,
      submissionGuidelines: journals.submissionGuidelines,
      howToPublish: journals.howToPublish,
      feesAndFunding: journals.feesAndFunding,
    })
    .from(journals)
    .where(and(eq(journals.slug, slug), eq(journals.status, "active")))
    .limit(1);

  if (!journal) return null;

  const [editorialBoard, onlineFirstRows] = await Promise.all([
    db
      .select({
        id: journalEditorialBoard.id,
        role: journalEditorialBoard.role,
        personName: journalEditorialBoard.personName,
        affiliation: journalEditorialBoard.affiliation,
        email: journalEditorialBoard.email,
        orcid: journalEditorialBoard.orcid,
        displayOrder: journalEditorialBoard.displayOrder,
      })
      .from(journalEditorialBoard)
      .where(eq(journalEditorialBoard.journalId, journal.id))
      .orderBy(asc(journalEditorialBoard.displayOrder), asc(journalEditorialBoard.personName)),
    db
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
        eq(researchItems.journalId, journal.id),
        eq(researchItems.status, "published"),
        isNull(researchItems.journalIssueId),
      ),
    )
    .orderBy(desc(researchItems.publishedAt), desc(researchItems.updatedAt)),
  ]);

  const issueRows = await db
    .select({
      id: journalIssues.id,
      title: journalIssues.title,
      issueNumber: journalIssues.issueNumber,
      publishedAt: journalIssues.publishedAt,
      volumeId: journalIssues.volumeId,
      volumeNumber: journalVolumes.volumeNumber,
      volumeTitle: journalVolumes.title,
      volumeYear: journalVolumes.year,
    })
    .from(journalIssues)
    .innerJoin(journalVolumes, eq(journalVolumes.id, journalIssues.volumeId))
    .where(eq(journalIssues.journalId, journal.id))
    .orderBy(desc(journalVolumes.year), desc(journalVolumes.volumeNumber), desc(journalIssues.issueNumber));

  const issueItems = await db
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
      journalIssueId: researchItems.journalIssueId,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .where(
      and(
        eq(researchItems.journalId, journal.id),
        eq(researchItems.status, "published"),
        sql`${researchItems.journalIssueId} IS NOT NULL`,
      ),
    )
    .orderBy(desc(researchItems.publishedAt), desc(researchItems.updatedAt));

  const metaMap = await attachResearchMeta([...onlineFirstRows, ...issueItems]);

  return {
    ...journal,
    ethicsPolicy: normalizeJournalRichText(journal.ethicsPolicy),
    disclosuresPolicy: normalizeJournalRichText(journal.disclosuresPolicy),
    rightsPermissions: normalizeJournalRichText(journal.rightsPermissions),
    contactInfo: normalizeJournalRichText(journal.contactInfo),
    submissionChecklist: normalizeJournalRichText(journal.submissionChecklist),
    submissionGuidelines: normalizeJournalRichText(journal.submissionGuidelines),
    howToPublish: normalizeJournalRichText(journal.howToPublish),
    feesAndFunding: normalizeJournalRichText(journal.feesAndFunding),
    editorialBoard,
    onlineFirstItems: onlineFirstRows.map((row) => ({
      ...row,
      authors: metaMap.get(row.id)?.authors ?? [],
      tags: metaMap.get(row.id)?.tags ?? [],
      coverImageObjectKey: metaMap.get(row.id)?.coverImageObjectKey ?? null,
    })),
    issues: issueRows.map((issue) => ({
      ...issue,
      items: issueItems
        .filter((item) => item.journalIssueId === issue.id)
        .map((row) => ({
          ...row,
          authors: metaMap.get(row.id)?.authors ?? [],
          tags: metaMap.get(row.id)?.tags ?? [],
          coverImageObjectKey: metaMap.get(row.id)?.coverImageObjectKey ?? null,
        })),
    })),
  };
}

export async function searchAuthorSuggestions(params: {
  query: string;
  limit?: number;
}) {
  const query = params.query.trim();
  if (query.length < 2) {
    return [];
  }

  const limit = Math.min(Math.max(params.limit ?? 8, 1), 20);
  const pattern = `%${query}%`;

  const rows = await db
    .select({
      id: authors.id,
      displayName: authors.displayName,
      email: authors.email,
    })
    .from(authors)
    .where(
      or(
        ilike(authors.displayName, pattern),
        ilike(sql`coalesce(${authors.email}, '')`, pattern),
      ),
    )
    .orderBy(asc(authors.displayName))
    .limit(limit * 4);

  const deduped: Array<{
    id: string;
    displayName: string;
    email: string | null;
  }> = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = row.email ? `email:${row.email.trim().toLowerCase()}` : `id:${row.id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(row);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
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
  const rows = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      abstract: researchItems.abstract,
      status: researchItems.status,
      workflowStage: researchItems.workflowStage,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      journalId: researchItems.journalId,
      journalIssueId: researchItems.journalIssueId,
      currentVersionId: researchItems.currentVersionId,
      createdAt: researchItems.createdAt,
      updatedAt: researchItems.updatedAt,
      departmentName: departments.name,
      journalName: journals.name,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(journals, eq(journals.id, researchItems.journalId))
    .where(eq(researchItems.submittedByUserId, userId))
    .orderBy(desc(researchItems.updatedAt));

  const itemIds = rows.map((r) => r.id);
  if (itemIds.length === 0) return rows.map((r) => ({ ...r, coverImageObjectKey: null as string | null }));

  const coverRows = await db
    .select({
      researchItemId: files.researchItemId,
      objectKey: files.objectKey,
    })
    .from(files)
    .innerJoin(researchItems, eq(researchItems.id, files.researchItemId))
    .where(
      and(
        inArray(files.researchItemId, itemIds),
        eq(files.fileKind, "cover_image"),
        sql`${files.itemVersionId} = ${researchItems.currentVersionId}`,
      ),
    );

  const coverMap = new Map(coverRows.map((r) => [r.researchItemId, r.objectKey]));

  return rows.map((r) => ({
    ...r,
    coverImageObjectKey: coverMap.get(r.id) ?? null,
  }));
}

export async function listDepartmentResearchItemsForReview(userId: string) {
  const appUserRecord = await getAppUserById(userId);
  if (!appUserRecord) {
    return [];
  }

  const boardJournalRows = await db
    .selectDistinct({ journalId: journalEditorialBoard.journalId })
    .from(journalEditorialBoard)
    .innerJoin(journals, eq(journals.id, journalEditorialBoard.journalId))
    .where(
      and(
        eq(journals.editorialBoardCanReviewSubmissions, true),
        sql`lower(${journalEditorialBoard.email}) = lower(${appUserRecord.email})`,
      ),
    );

  const boardJournalIds = boardJournalRows.map((row) => row.journalId);

  const workflowFilter = inArray(researchItems.workflowStage, [
    "submitted",
    "editor_review",
    "peer_review",
    "editor_revision_requested",
  ]);

  const departmentFlowFilter =
    appUserRecord.role === "admin"
      ? and(
          workflowFilter,
          or(
            isNull(researchItems.journalId),
            eq(journals.editorialBoardCanReviewSubmissions, false),
          ),
        )
      : appUserRecord.departmentId
        ? and(
            workflowFilter,
            eq(researchItems.departmentId, appUserRecord.departmentId),
            or(
              isNull(researchItems.journalId),
              eq(journals.editorialBoardCanReviewSubmissions, false),
            ),
          )
        : sql`false`;

  const journalBoardFilter =
    boardJournalIds.length > 0
      ? and(
          workflowFilter,
          inArray(researchItems.journalId, boardJournalIds),
          eq(journals.editorialBoardCanReviewSubmissions, true),
        )
      : sql`false`;

  return db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      itemType: researchItems.itemType,
      workflowStage: researchItems.workflowStage,
      status: researchItems.status,
      submittedAt: researchItems.createdAt,
      updatedAt: researchItems.updatedAt,
      submittedByUserId: researchItems.submittedByUserId,
      submittedByName: user.name,
      submittedByEmail: user.email,
      departmentName: departments.name,
      journalName: journals.name,
      currentVersionId: researchItems.currentVersionId,
      notesToAdmin: itemVersions.notesToAdmin,
    })
    .from(researchItems)
    .innerJoin(appUsers, eq(appUsers.id, researchItems.submittedByUserId))
    .innerJoin(user, eq(user.id, appUsers.id))
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(journals, eq(journals.id, researchItems.journalId))
    .leftJoin(itemVersions, eq(itemVersions.id, researchItems.currentVersionId))
    .where(
      and(
        ne(researchItems.submittedByUserId, userId),
        or(departmentFlowFilter, journalBoardFilter),
      ),
    )
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
    .where(
      inArray(researchItems.workflowStage, [
        "editor_forwarded_to_admin",
        "ready_to_publish",
      ]),
    )
    .orderBy(desc(researchItems.updatedAt));
}

export async function countPendingResearchModerationItems() {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(researchItems)
    .where(
      inArray(researchItems.workflowStage, [
        "editor_forwarded_to_admin",
        "ready_to_publish",
      ]),
    );

  return Number(result?.count ?? 0);
}

export async function getResearchItemForAdminReview(researchItemId: string) {
  const [item] = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      abstract: researchItems.abstract,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      status: researchItems.status,
      workflowStage: researchItems.workflowStage,
      submitterConfirmationStatus: researchItems.submitterConfirmationStatus,
      license: researchItems.license,
      externalUrl: researchItems.externalUrl,
      doi: researchItems.doi,
      createdAt: researchItems.createdAt,
      updatedAt: researchItems.updatedAt,
      departmentName: departments.name,
      departmentSlug: departments.slug,
      currentVersionId: researchItems.currentVersionId,
      submittedByName: user.name,
      submittedByEmail: user.email,
      supervisorName: itemVersions.supervisorName,
      programName: itemVersions.programName,
      notesToAdmin: itemVersions.notesToAdmin,
      changeSummary: itemVersions.changeSummary,
      publicationDate: itemVersions.publicationDate,
      versionNumber: itemVersions.versionNumber,
    })
    .from(researchItems)
    .innerJoin(appUsers, eq(appUsers.id, researchItems.submittedByUserId))
    .innerJoin(user, eq(user.id, appUsers.id))
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .leftJoin(itemVersions, eq(itemVersions.id, researchItems.currentVersionId))
    .where(eq(researchItems.id, researchItemId))
    .limit(1);

  if (!item) return null;

  const [authorRows, tagRows, currentFiles, referenceRows] = await Promise.all([
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
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(researchItemTags)
      .innerJoin(tags, eq(tags.id, researchItemTags.tagId))
      .where(eq(researchItemTags.researchItemId, item.id))
      .orderBy(asc(tags.name)),
    item.currentVersionId
      ? db
          .select({
            id: files.id,
            fileKind: files.fileKind,
            objectKey: files.objectKey,
            originalName: files.originalName,
            mimeType: files.mimeType,
            sizeBytes: files.sizeBytes,
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
    db
      .select({
        citationText: researchItemReferences.citationText,
        url: researchItemReferences.url,
      })
      .from(researchItemReferences)
      .where(eq(researchItemReferences.researchItemId, item.id))
      .orderBy(asc(researchItemReferences.referenceOrder)),
  ]);

  return {
    ...item,
    authors: authorRows,
    tags: tagRows,
    references: referenceRows,
    pdfFile: currentFiles.find((f) => f.fileKind === "main_pdf") ?? null,
    coverImageFile: currentFiles.find((f) => f.fileKind === "cover_image") ?? null,
  };
}

export async function getResearchItemVersionDiff(researchItemId: string) {
  // Get all versions ordered newest first
  const versions = await db
    .select({
      id: itemVersions.id,
      versionNumber: itemVersions.versionNumber,
      title: itemVersions.title,
      abstract: itemVersions.abstract,
      license: itemVersions.license,
      changeSummary: itemVersions.changeSummary,
      notesToAdmin: itemVersions.notesToAdmin,
      supervisorName: itemVersions.supervisorName,
      programName: itemVersions.programName,
      publicationDate: itemVersions.publicationDate,
      createdAt: itemVersions.createdAt,
    })
    .from(itemVersions)
    .where(eq(itemVersions.researchItemId, researchItemId))
    .orderBy(desc(itemVersions.versionNumber))
    .limit(2);

  if (versions.length < 2) return null;

  const [current, previous] = versions;

  // Files for both versions
  const [currentFiles, previousFiles] = await Promise.all([
    db
      .select({
        fileKind: files.fileKind,
        objectKey: files.objectKey,
        originalName: files.originalName,
        sizeBytes: files.sizeBytes,
      })
      .from(files)
      .where(
        and(
          eq(files.researchItemId, researchItemId),
          eq(files.itemVersionId, current.id),
          inArray(files.fileKind, ["main_pdf", "cover_image"]),
        ),
      ),
    db
      .select({
        fileKind: files.fileKind,
        objectKey: files.objectKey,
        originalName: files.originalName,
        sizeBytes: files.sizeBytes,
      })
      .from(files)
      .where(
        and(
          eq(files.researchItemId, researchItemId),
          eq(files.itemVersionId, previous.id),
          inArray(files.fileKind, ["main_pdf", "cover_image"]),
        ),
      ),
  ]);

  // Authors for both versions (via research_item_authors – join currently links to item level, so both show same)
  // We fetch current state as "current" authors — historical author snapshots are not stored separately
  const currentAuthors = await db
    .select({
      id: authors.id,
      displayName: authors.displayName,
      email: authors.email,
      affiliation: authors.affiliation,
      isCorresponding: researchItemAuthors.isCorresponding,
      authorOrder: researchItemAuthors.authorOrder,
    })
    .from(researchItemAuthors)
    .innerJoin(authors, eq(authors.id, researchItemAuthors.authorId))
    .where(eq(researchItemAuthors.researchItemId, researchItemId))
    .orderBy(asc(researchItemAuthors.authorOrder));

  return {
    current: { ...current, files: currentFiles, authors: currentAuthors },
    previous: { ...previous, files: previousFiles },
  };
}

export async function reviewResearchSubmission(params: {
  researchItemId: string;
  reviewerUserId: string;
  decision:
    | "publish"
    | "request_changes"
    | "archive"
    | "request_submitter_confirmation";
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
        workflowStage: researchItems.workflowStage,
        submitterConfirmationStatus: researchItems.submitterConfirmationStatus,
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

    if (params.decision === "archive") {
      if (item.status !== "published") {
        throw new Error("Only published items can be archived.");
      }
    } else if (params.decision === "publish") {
      if (
        item.workflowStage !== "ready_to_publish" ||
        item.submitterConfirmationStatus !== "confirmed"
      ) {
        throw new Error("Submitter confirmation is required before publishing.");
      }
    } else if (
      item.workflowStage !== "editor_forwarded_to_admin" &&
      item.workflowStage !== "ready_to_publish"
    ) {
      throw new Error("This submission is not currently awaiting admin review.");
    }

    if (params.decision !== "request_submitter_confirmation") {
      await tx.insert(moderationDecisions).values({
        researchItemId: item.id,
        itemVersionId: item.currentVersionId,
        reviewedByUserId: params.reviewerUserId,
        decision:
          params.decision === "publish"
            ? "approved"
            : params.decision === "archive"
              ? "archived"
              : "changes_requested",
        comment: params.comment?.trim() || null,
      });
    }

    await tx
      .update(researchItems)
      .set({
        status:
          params.decision === "publish"
            ? "published"
            : params.decision === "archive"
              ? "archived"
              : params.decision === "request_submitter_confirmation"
                ? "submitted"
              : "changes_requested",
        workflowStage:
          params.decision === "publish"
            ? "published"
            : params.decision === "archive"
              ? "archived"
              : params.decision === "request_submitter_confirmation"
                ? "awaiting_submitter_confirmation"
              : "editor_revision_requested",
        submitterConfirmationStatus:
          params.decision === "publish"
            ? "confirmed"
            : params.decision === "request_submitter_confirmation"
              ? "pending"
              : "not_requested",
        submitterConfirmationNote:
          params.decision === "request_submitter_confirmation"
            ? params.comment?.trim() || null
            : params.decision === "publish"
              ? undefined
              : null,
        submitterConfirmationRequestedAt:
          params.decision === "request_submitter_confirmation"
            ? new Date()
            : params.decision === "publish"
              ? undefined
              : null,
        submitterConfirmationRespondedAt:
          params.decision === "publish" ? undefined : null,
        publishedAt: params.decision === "publish" ? new Date() : null,
        archivedAt: params.decision === "archive" ? new Date() : null,
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
          : params.decision === "archive"
            ? "research_item_archived"
            : params.decision === "request_submitter_confirmation"
              ? "research_item_submitter_confirmation_requested"
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

export async function reviewDepartmentResearchSubmission(params: {
  researchItemId: string;
  reviewerUserId: string;
  decision: "forward_to_admin" | "request_changes";
  comment?: string;
}) {
  return db.transaction(async (tx) => {
    const [reviewer] = await tx
      .select({
        id: appUsers.id,
        role: appUsers.role,
        departmentId: appUsers.departmentId,
        email: user.email,
      })
      .from(appUsers)
      .innerJoin(user, eq(user.id, appUsers.id))
      .where(eq(appUsers.id, params.reviewerUserId))
      .limit(1);

    if (!reviewer || (reviewer.role !== "editor" && reviewer.role !== "admin")) {
      throw new Error("Only editors or admins can review department submissions.");
    }

    const [item] = await tx
      .select({
        id: researchItems.id,
        slug: researchItems.slug,
        title: researchItems.title,
        journalId: researchItems.journalId,
        departmentId: researchItems.departmentId,
        submittedByUserId: researchItems.submittedByUserId,
      })
      .from(researchItems)
      .leftJoin(journals, eq(journals.id, researchItems.journalId))
      .where(
        and(
          eq(researchItems.id, params.researchItemId),
          inArray(researchItems.workflowStage, [
            "submitted",
            "editor_review",
            "peer_review",
            "editor_revision_requested",
          ]),
        ),
      )
      .limit(1);

    if (!item) {
      throw new Error("Submission is not available for editor review.");
    }

    if (item.submittedByUserId === params.reviewerUserId) {
      throw new Error("You cannot review your own submission.");
    }

    const isJournalBoardReviewer = item.journalId
      ? !!(
          await tx
            .select({ id: journalEditorialBoard.id })
            .from(journalEditorialBoard)
            .innerJoin(journals, eq(journals.id, journalEditorialBoard.journalId))
            .where(
              and(
                eq(journalEditorialBoard.journalId, item.journalId),
                eq(journals.editorialBoardCanReviewSubmissions, true),
                sql`lower(${journalEditorialBoard.email}) = lower(${reviewer.email})`,
              ),
            )
            .limit(1)
        )[0]
      : false;

    if (
      reviewer.role === "editor" &&
      reviewer.departmentId &&
      item.departmentId !== reviewer.departmentId &&
      !isJournalBoardReviewer
    ) {
      throw new Error("This submission is outside your department scope.");
    }

    if (
      reviewer.role === "editor" &&
      !reviewer.departmentId &&
      !isJournalBoardReviewer
    ) {
      throw new Error("Assign a department before reviewing submissions.");
    }

    if (params.decision === "forward_to_admin") {
      const [peerSummary] = await tx
        .select({
          totalInvites: sql<number>`count(*)`,
          outstandingInvites: sql<number>`count(*) filter (where ${researchItemPeerReviews.status} in ('pending', 'accepted'))`,
          positiveCompletedReviews: sql<number>`count(*) filter (where ${researchItemPeerReviews.status} = 'completed' and ${researchItemPeerReviews.recommendation} <> 'reject')`,
        })
        .from(researchItemPeerReviews)
        .where(eq(researchItemPeerReviews.researchItemId, item.id));

      const totalInvites = Number(peerSummary?.totalInvites ?? 0);
      const outstandingInvites = Number(peerSummary?.outstandingInvites ?? 0);
      const positiveCompletedReviews = Number(
        peerSummary?.positiveCompletedReviews ?? 0,
      );

      if (totalInvites > 0) {
        if (outstandingInvites > 0) {
          throw new Error(
            "Peer review invitations are still pending. Complete peer review before forwarding.",
          );
        }

        if (positiveCompletedReviews <= 0) {
          throw new Error(
            "At least one completed non-reject peer review is required before forwarding.",
          );
        }
      }
    }

    await tx
      .update(researchItems)
      .set({
        workflowStage:
          params.decision === "forward_to_admin"
            ? "editor_forwarded_to_admin"
            : "editor_revision_requested",
        status:
          params.decision === "forward_to_admin"
            ? "submitted"
            : "changes_requested",
        submitterConfirmationStatus: "not_requested",
        submitterConfirmationNote: null,
        submitterConfirmationRequestedAt: null,
        submitterConfirmationRespondedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(researchItems.id, item.id));

    await tx.insert(activityLogs).values({
      actorUserId: params.reviewerUserId,
      targetType: "research_item",
      targetId: item.id,
      action:
        params.decision === "forward_to_admin"
          ? "research_item_forwarded_to_admin"
          : "research_item_editor_changes_requested",
      metadata: JSON.stringify({
        researchItemId: item.id,
        decision: params.decision,
        comment: params.comment?.trim() || null,
      }),
    });

    return {
      ...item,
      decision: params.decision,
    };
  });
}

export async function listPeerReviewInvitesForResearchItem(params: {
  researchItemId: string;
}) {
  return db
    .select({
      id: researchItemPeerReviews.id,
      status: researchItemPeerReviews.status,
      inviteeEmail: researchItemPeerReviews.inviteeEmail,
      inviteeName: researchItemPeerReviews.inviteeName,
      recommendation: researchItemPeerReviews.recommendation,
      reviewComment: researchItemPeerReviews.reviewComment,
      confidentialComment: researchItemPeerReviews.confidentialComment,
      createdAt: researchItemPeerReviews.createdAt,
      respondedAt: researchItemPeerReviews.respondedAt,
      reviewSubmittedAt: researchItemPeerReviews.reviewSubmittedAt,
      reviewerName: user.name,
      reviewerEmail: user.email,
    })
    .from(researchItemPeerReviews)
    .leftJoin(user, eq(user.id, researchItemPeerReviews.inviteeUserId))
    .where(eq(researchItemPeerReviews.researchItemId, params.researchItemId))
    .orderBy(desc(researchItemPeerReviews.createdAt));
}

export async function listPeerReviewInvitesForResearchItems(
  researchItemIds: string[],
) {
  if (researchItemIds.length === 0) return {};

  const rows = await db
    .select({
      id: researchItemPeerReviews.id,
      researchItemId: researchItemPeerReviews.researchItemId,
      status: researchItemPeerReviews.status,
      inviteeEmail: researchItemPeerReviews.inviteeEmail,
      inviteeName: researchItemPeerReviews.inviteeName,
      recommendation: researchItemPeerReviews.recommendation,
      createdAt: researchItemPeerReviews.createdAt,
      reviewSubmittedAt: researchItemPeerReviews.reviewSubmittedAt,
    })
    .from(researchItemPeerReviews)
    .where(inArray(researchItemPeerReviews.researchItemId, researchItemIds))
    .orderBy(desc(researchItemPeerReviews.createdAt));

  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    const key = row.researchItemId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }
  return grouped;
}

export async function createPeerReviewInvite(params: {
  researchItemId: string;
  invitedByUserId: string;
  inviteeEmail: string;
  inviteeName?: string | null;
  inviteToken?: string | null;
  inviteExpiresAt?: Date | null;
}) {
  const normalizedEmail = params.inviteeEmail.trim().toLowerCase();

  return db.transaction(async (tx) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [recentInviteCount] = await tx
      .select({
        count: sql<number>`count(*)`,
      })
      .from(researchItemPeerReviews)
      .where(
        and(
          eq(researchItemPeerReviews.invitedByUserId, params.invitedByUserId),
          sql`${researchItemPeerReviews.createdAt} >= ${oneHourAgo}`,
        ),
      );

    if (Number(recentInviteCount?.count ?? 0) >= 20) {
      throw new Error("Invite rate limit reached. Please try again later.");
    }

    const [activeInviteCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(researchItemPeerReviews)
      .where(
        and(
          eq(researchItemPeerReviews.researchItemId, params.researchItemId),
          inArray(researchItemPeerReviews.status, ["pending", "accepted"]),
        ),
      );

    if (Number(activeInviteCount?.count ?? 0) >= 10) {
      throw new Error(
        "Maximum active peer-review invites reached for this submission.",
      );
    }

    const [existing] = await tx
      .select({ id: researchItemPeerReviews.id })
      .from(researchItemPeerReviews)
      .where(
        and(
          eq(researchItemPeerReviews.researchItemId, params.researchItemId),
          eq(researchItemPeerReviews.inviteeEmail, normalizedEmail),
          inArray(researchItemPeerReviews.status, ["pending", "accepted"]),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("An active peer-review invite already exists for this email.");
    }

    const [inviteeUser] = await tx
      .select({ id: user.id, emailVerified: user.emailVerified })
      .from(user)
      .where(sql`lower(${user.email}) = ${normalizedEmail}`)
      .limit(1);

    const [created] = await tx
      .insert(researchItemPeerReviews)
      .values({
        researchItemId: params.researchItemId,
        invitedByUserId: params.invitedByUserId,
        inviteeUserId: inviteeUser?.emailVerified ? inviteeUser.id : null,
        inviteeEmail: normalizedEmail,
        inviteeName: params.inviteeName ?? null,
        status: "pending",
        inviteToken: params.inviteToken ?? null,
        inviteExpiresAt: params.inviteExpiresAt ?? null,
      })
      .returning({
        id: researchItemPeerReviews.id,
        researchItemId: researchItemPeerReviews.researchItemId,
        inviteeEmail: researchItemPeerReviews.inviteeEmail,
      });

    await tx
      .update(researchItems)
      .set({ workflowStage: "peer_review", updatedAt: new Date() })
      .where(
        and(
          eq(researchItems.id, params.researchItemId),
          inArray(researchItems.workflowStage, [
            "submitted",
            "editor_review",
            "editor_revision_requested",
          ]),
        ),
      );

    return created;
  });
}

export async function listPeerReviewInvitesForUser(params: {
  userId: string;
  userEmail: string;
}) {
  return db
    .select({
      id: researchItemPeerReviews.id,
      status: researchItemPeerReviews.status,
      researchItemId: researchItems.id,
      researchSlug: researchItems.slug,
      researchTitle: researchItems.title,
      invitedAt: researchItemPeerReviews.createdAt,
      respondedAt: researchItemPeerReviews.respondedAt,
      recommendation: researchItemPeerReviews.recommendation,
      reviewComment: researchItemPeerReviews.reviewComment,
      invitedByName: user.name,
      invitedByEmail: user.email,
    })
    .from(researchItemPeerReviews)
    .innerJoin(researchItems, eq(researchItems.id, researchItemPeerReviews.researchItemId))
    .innerJoin(appUsers, eq(appUsers.id, researchItemPeerReviews.invitedByUserId))
    .innerJoin(user, eq(user.id, appUsers.id))
    .where(
      or(
        eq(researchItemPeerReviews.inviteeUserId, params.userId),
        sql`lower(${researchItemPeerReviews.inviteeEmail}) = lower(${params.userEmail})`,
      ),
    )
    .orderBy(desc(researchItemPeerReviews.updatedAt));
}

export async function respondToPeerReviewInvite(params: {
  inviteId: string;
  userId: string;
  userEmail: string;
  decision: "accepted" | "declined";
}) {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: researchItemPeerReviews.id,
        status: researchItemPeerReviews.status,
        inviteeUserId: researchItemPeerReviews.inviteeUserId,
        inviteeEmail: researchItemPeerReviews.inviteeEmail,
      })
      .from(researchItemPeerReviews)
      .where(eq(researchItemPeerReviews.id, params.inviteId))
      .limit(1);

    if (!invite) {
      throw new Error("Invite not found.");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite is no longer pending.");
    }

    if (invite.inviteeUserId && invite.inviteeUserId !== params.userId) {
      throw new Error("You are not allowed to respond to this invite.");
    }

    if (
      !invite.inviteeUserId &&
      invite.inviteeEmail.toLowerCase() !== params.userEmail.toLowerCase()
    ) {
      throw new Error("You are not allowed to respond to this invite.");
    }

    const [updated] = await tx
      .update(researchItemPeerReviews)
      .set({
        inviteeUserId: params.userId,
        status: params.decision,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchItemPeerReviews.id, params.inviteId))
      .returning({
        id: researchItemPeerReviews.id,
        researchItemId: researchItemPeerReviews.researchItemId,
      });

    return updated;
  });
}

export async function submitPeerReview(params: {
  inviteId: string;
  userId: string;
  userEmail: string;
  recommendation: "accept" | "minor_revision" | "major_revision" | "reject";
  reviewComment: string;
  confidentialComment?: string;
}) {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: researchItemPeerReviews.id,
        status: researchItemPeerReviews.status,
        inviteeUserId: researchItemPeerReviews.inviteeUserId,
        inviteeEmail: researchItemPeerReviews.inviteeEmail,
        researchItemId: researchItemPeerReviews.researchItemId,
      })
      .from(researchItemPeerReviews)
      .where(eq(researchItemPeerReviews.id, params.inviteId))
      .limit(1);

    if (!invite) {
      throw new Error("Invite not found.");
    }

    if (invite.inviteeUserId && invite.inviteeUserId !== params.userId) {
      throw new Error("You are not allowed to submit this review.");
    }

    if (
      !invite.inviteeUserId &&
      invite.inviteeEmail.toLowerCase() !== params.userEmail.toLowerCase()
    ) {
      throw new Error("You are not allowed to submit this review.");
    }

    if (invite.status !== "accepted") {
      throw new Error("Invite must be accepted before submitting review.");
    }

    const [updated] = await tx
      .update(researchItemPeerReviews)
      .set({
        inviteeUserId: params.userId,
        status: "completed",
        recommendation: params.recommendation,
        reviewComment: params.reviewComment.trim(),
        confidentialComment: params.confidentialComment?.trim() || null,
        reviewSubmittedAt: new Date(),
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchItemPeerReviews.id, params.inviteId))
      .returning({
        id: researchItemPeerReviews.id,
        researchItemId: researchItemPeerReviews.researchItemId,
      });

    return updated;
  });
}

export async function listPendingSubmitterConfirmations(userId: string) {
  return db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
      itemType: researchItems.itemType,
      publicationYear: researchItems.publicationYear,
      workflowStage: researchItems.workflowStage,
      submitterConfirmationStatus: researchItems.submitterConfirmationStatus,
      submitterConfirmationNote: researchItems.submitterConfirmationNote,
      submitterConfirmationRequestedAt:
        researchItems.submitterConfirmationRequestedAt,
      updatedAt: researchItems.updatedAt,
    })
    .from(researchItems)
    .where(
      and(
        eq(researchItems.submittedByUserId, userId),
        eq(researchItems.workflowStage, "awaiting_submitter_confirmation"),
        eq(researchItems.submitterConfirmationStatus, "pending"),
      ),
    )
    .orderBy(desc(researchItems.updatedAt));
}

export async function getSubmitterConfirmationItem(params: {
  researchItemId: string;
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
      workflowStage: researchItems.workflowStage,
      submitterConfirmationStatus: researchItems.submitterConfirmationStatus,
      submitterConfirmationNote: researchItems.submitterConfirmationNote,
      submitterConfirmationRequestedAt:
        researchItems.submitterConfirmationRequestedAt,
      departmentName: departments.name,
    })
    .from(researchItems)
    .leftJoin(departments, eq(departments.id, researchItems.departmentId))
    .where(
      and(
        eq(researchItems.id, params.researchItemId),
        eq(researchItems.submittedByUserId, params.userId),
      ),
    )
    .limit(1);

  return item ?? null;
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
    coverImageObjectKey: metaMap.get(row.id)?.coverImageObjectKey ?? null,
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
      viewCount: researchItems.viewCount,
      downloadCount: researchItems.downloadCount,
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

  const [metaMap, referenceRows] = await Promise.all([
    attachResearchMeta([{ id: item.id }]),
    db
      .select({
        citationText: researchItemReferences.citationText,
        url: researchItemReferences.url,
      })
      .from(researchItemReferences)
      .where(eq(researchItemReferences.researchItemId, item.id))
      .orderBy(asc(researchItemReferences.referenceOrder)),
  ]);

  return {
    ...item,
    authors: metaMap.get(item.id)?.authors ?? [],
    tags: metaMap.get(item.id)?.tags ?? [],
    references: referenceRows,
    coverImageObjectKey: coverImage?.objectKey ?? null,
  };
}

const RELATED_LIMIT = 4;

export async function listRelatedPublishedResearchItems(params: {
  researchItemId: string;
  departmentSlug?: string | null;
  itemType?: string;
}) {
  const relatedRows = await db
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
    .limit(RELATED_LIMIT);

  let moreRows: typeof relatedRows = [];

  if (relatedRows.length < RELATED_LIMIT) {
    const excludeIds = [params.researchItemId, ...relatedRows.map((r) => r.id)];

    moreRows = await db
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
          sql`${researchItems.id} NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})`,
        ),
      )
      .orderBy(desc(researchItems.publishedAt), desc(researchItems.updatedAt))
      .limit(RELATED_LIMIT - relatedRows.length);
  }

  const allItems = [...relatedRows, ...moreRows];
  const metaMap = await attachResearchMeta(allItems);

  const enrich = (row: (typeof relatedRows)[number]) => ({
    ...row,
    authors: metaMap.get(row.id)?.authors ?? [],
    coverImageObjectKey: metaMap.get(row.id)?.coverImageObjectKey ?? null,
  });

  return {
    related: relatedRows.map(enrich),
    more: moreRows.map(enrich),
  };
}

const SAME_AUTHORS_LIMIT = 6;

export async function listMoreFromSameAuthors(params: {
  researchItemId: string;
  authorIds: string[];
}) {
  if (params.authorIds.length === 0) {
    return [];
  }

  const rows = await db
    .selectDistinctOn([researchItems.id], {
      id: researchItems.id,
      slug: researchItems.slug,
      title: researchItems.title,
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
        inArray(researchItemAuthors.authorId, params.authorIds),
        eq(researchItems.status, "published"),
        sql`${researchItems.id} <> ${params.researchItemId}`,
      ),
    )
    .orderBy(researchItems.id, desc(researchItems.publishedAt))
    .limit(SAME_AUTHORS_LIMIT);

  if (rows.length === 0) return [];

  const metaMap = await attachResearchMeta(rows);

  return rows.map((row) => ({
    ...row,
    authors: metaMap.get(row.id)?.authors ?? [],
    coverImageObjectKey: metaMap.get(row.id)?.coverImageObjectKey ?? null,
  }));
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
      coverImageObjectKey: metaMap.get(item.id)?.coverImageObjectKey ?? null,
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

  const rawContributors = await db
    .select({
      id: authors.id,
      name: authors.displayName,
      email: authors.email,
      affiliation: authors.affiliation,
      contributionCount: sql<number>`count(distinct ${researchItems.id})::int`,
    })
    .from(researchItemAuthors)
    .innerJoin(
      researchItems,
      eq(researchItems.id, researchItemAuthors.researchItemId),
    )
    .innerJoin(authors, eq(authors.id, researchItemAuthors.authorId))
    .innerJoin(departments, eq(departments.id, researchItems.departmentId))
    .where(
      and(
        eq(researchItems.status, "published"),
        eq(departments.slug, departmentSlug),
      ),
    )
    .groupBy(authors.id, authors.displayName, authors.email, authors.affiliation)
    .orderBy(
      desc(sql<number>`count(distinct ${researchItems.id})::int`),
      asc(authors.displayName),
    );

  // Deduplicate authors that share the same email address
  const seenEmails = new Set<string>();
  const contributors: typeof rawContributors = [];
  for (const c of rawContributors) {
    const key = c.email?.toLowerCase().trim();
    if (key) {
      if (seenEmails.has(key)) continue;
      seenEmails.add(key);
    }
    contributors.push(c);
  }

  const metaMap = await attachResearchMeta(items);

  return {
    ...department,
    contributors,
    items: items.map((item) => ({
      ...item,
      authors: metaMap.get(item.id)?.authors ?? [],
      tags: metaMap.get(item.id)?.tags ?? [],
      coverImageObjectKey: metaMap.get(item.id)?.coverImageObjectKey ?? null,
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
      journalId: researchItems.journalId,
      journalIssueId: researchItems.journalIssueId,
      status: researchItems.status,
      workflowStage: researchItems.workflowStage,
      license: researchItems.license,
      externalUrl: researchItems.externalUrl,
      doi: researchItems.doi,
      pageRange: researchItems.pageRange,
      articleNumber: researchItems.articleNumber,
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

  const [decisions, versions, authorRows, tagRows, currentFiles, referenceRows] = await Promise.all([
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
    db
      .select({
        citationText: researchItemReferences.citationText,
        url: researchItemReferences.url,
      })
      .from(researchItemReferences)
      .where(eq(researchItemReferences.researchItemId, item.id))
      .orderBy(asc(researchItemReferences.referenceOrder)),
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
    references: referenceRows,
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
      archivedAt: departments.archivedAt,
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
      archivedAt: tags.archivedAt,
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


export async function incrementViewCount(researchItemId: string) {
  await db
    .update(researchItems)
    .set({ viewCount: sql`${researchItems.viewCount} + 1` })
    .where(eq(researchItems.id, researchItemId));
}

export async function incrementDownloadCount(researchItemId: string) {
  await db
    .update(researchItems)
    .set({ downloadCount: sql`${researchItems.downloadCount} + 1` })
    .where(eq(researchItems.id, researchItemId));
}
