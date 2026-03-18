"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  activityLogs,
  authors,
  files,
  itemVersions,
  researchItemAuthors,
  researchItemReferences,
  researchItemTags,
  researchItems,
  tags,
  user,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import {
  countPendingResearchModerationItems,
  getAppUserById,
  getOwnedResearchItemForRevision,
  reviewResearchSubmission,
} from "@/lib/db/queries";
import { createResearchItemSlug } from "@/lib/research/slug";
import {
  deleteResearchObject,
  getResearchObjectMetadata,
  type ResearchUploadKind,
  uploadResearchFile,
} from "@/lib/storage/research-files";
import { isR2Configured } from "@/lib/env";
import {
  createResearchSubmissionSchema,
  editorItemActionSchema,
  reviewResearchSubmissionSchema,
  type CreateResearchSubmissionInput,
} from "@/lib/validation/research";
import { sendResearchModerationEmail } from "@/lib/notifications";
import { env } from "@/lib/env";

type StoredResearchFile = {
  bucketName: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  checksum: string | null;
};

type UploadMetaPrefix = "uploaded" | "coverUploaded";
type SubmissionIntent = "submit" | "save_draft";

function getSubmissionIntent(formData: FormData): SubmissionIntent {
  const value = formData.get("workflowIntent");
  return value === "save_draft" ? "save_draft" : "submit";
}

function normalizeEmail(email: string | undefined) {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

async function findVerifiedUserIdByEmail(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  email: string,
): Promise<string | null> {
  const [match] = await tx
    .select({ id: user.id })
    .from(user)
    .where(and(sql`lower(${user.email}) = ${email}`, eq(user.emailVerified, true)))
    .limit(1);

  return match?.id ?? null;
}

function parseSubmissionPayload(formData: FormData) {
  const authorsValue = formData.get("authors");
  let parsedAuthors: unknown = [];

  if (typeof authorsValue === "string" && authorsValue.trim()) {
    try {
      parsedAuthors = JSON.parse(authorsValue);
    } catch {
      parsedAuthors = null;
    }
  }

  const referencesValue = formData.get("references");
  let parsedReferences: unknown = [];

  if (typeof referencesValue === "string" && referencesValue.trim()) {
    try {
      parsedReferences = JSON.parse(referencesValue);
    } catch {
      parsedReferences = [];
    }
  }

  const tagIds = formData
    .getAll("tagIds")
    .filter((value): value is string => typeof value === "string");

  return createResearchSubmissionSchema.safeParse({
    title: formData.get("title"),
    abstract: formData.get("abstract"),
    itemType: formData.get("itemType"),
    publicationYear: formData.get("publicationYear"),
    departmentId: formData.get("departmentId"),
    publicationDate: formData.get("publicationDate"),
    changeSummary: formData.get("changeSummary"),
    license: formData.get("license"),
    externalUrl: formData.get("externalUrl"),
    doi: formData.get("doi"),
    notesToAdmin: formData.get("notesToAdmin"),
    supervisorName: formData.get("supervisorName"),
    programName: formData.get("programName"),
    authors: parsedAuthors,
    tagIds,
    references: parsedReferences,
  });
}

function toPublicationDate(value: CreateResearchSubmissionInput["publicationDate"]) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function buildVersionUploadKey(params: {
  researchItemId: string;
  versionNumber: number;
  kind: ResearchUploadKind;
}) {
  return `research-items/${params.researchItemId}/v${params.versionNumber}/${params.kind}-${randomUUID()}`;
}

function hasUploadedMeta(formData: FormData, prefix: UploadMetaPrefix) {
  return (
    formData.get(`${prefix}ObjectKey`) !== null ||
    formData.get(`${prefix}OriginalName`) !== null ||
    formData.get(`${prefix}MimeType`) !== null ||
    formData.get(`${prefix}SizeBytes`) !== null
  );
}

async function resolveUploadedResearchFile(params: {
  formData: FormData;
  fileFieldName: string;
  prefix: UploadMetaPrefix;
  kind: ResearchUploadKind;
  fallbackKey: string;
}) {
  const objectKey = params.formData.get(`${params.prefix}ObjectKey`);
  const originalName = params.formData.get(`${params.prefix}OriginalName`);
  const mimeType = params.formData.get(`${params.prefix}MimeType`);
  const sizeBytes = params.formData.get(`${params.prefix}SizeBytes`);

  const hasMeta =
    objectKey !== null ||
    originalName !== null ||
    mimeType !== null ||
    sizeBytes !== null;

  if (hasMeta) {
    if (
      typeof objectKey !== "string" ||
      typeof originalName !== "string" ||
      typeof mimeType !== "string" ||
      typeof sizeBytes !== "string"
    ) {
      throw new Error("Invalid upload metadata.");
    }

    const parsedSizeBytes = Number(sizeBytes);
    if (!Number.isFinite(parsedSizeBytes) || parsedSizeBytes <= 0) {
      throw new Error("Invalid uploaded file size.");
    }

    const objectMeta = await getResearchObjectMetadata(objectKey);

    return {
      file: {
        ...objectMeta,
        originalName,
        mimeType:
          objectMeta.mimeType !== "application/octet-stream"
            ? objectMeta.mimeType
            : mimeType,
        sizeBytes: objectMeta.sizeBytes > 0 ? objectMeta.sizeBytes : parsedSizeBytes,
      } satisfies StoredResearchFile,
      cleanupObjectKey: objectKey,
    };
  }

  const inputFile = params.formData.get(params.fileFieldName);
  if (!(inputFile instanceof File) || inputFile.size === 0) {
    return {
      file: null,
      cleanupObjectKey: null,
    };
  }

  const uploadedFile = await uploadResearchFile({
    key: params.fallbackKey,
    file: inputFile,
    kind: params.kind,
  });

  return {
    file: uploadedFile satisfies StoredResearchFile,
    cleanupObjectKey: uploadedFile.objectKey,
  };
}

export async function submitResearchSubmission(formData: FormData) {
  const session = await requireRole(["editor", "admin"], {
    returnTo: "/editor",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = parseSubmissionPayload(formData);
  const workflowIntent = getSubmissionIntent(formData);

  if (!parsed.success) {
    redirect("/editor?submission=invalid");
  }

  const submissionPdf = formData.get("pdf");
  const hasPdfFile = submissionPdf instanceof File && submissionPdf.size > 0;
  const hasPdfMeta = hasUploadedMeta(formData, "uploaded");

  const submissionCover = formData.get("coverImage");
  const hasCoverFile = submissionCover instanceof File && submissionCover.size > 0;
  const hasCoverMeta = hasUploadedMeta(formData, "coverUploaded");

  const hasFileUpload = hasPdfFile || hasCoverFile || hasPdfMeta || hasCoverMeta;

  if (!isR2Configured && hasFileUpload) {
    redirect("/editor?submission=storage-not-configured");
  }

  if (workflowIntent === "submit" && !hasPdfFile && !hasPdfMeta) {
    redirect("/editor?submission=missing-file");
  }

  if (workflowIntent === "submit" && !hasCoverFile && !hasCoverMeta) {
    redirect("/editor?submission=missing-cover");
  }

  const itemId = randomUUID();
  const versionId = randomUUID();
  const slug = createResearchItemSlug(parsed.data.title);
  const cleanupObjectKeys = new Set<string>();

  try {
    const mainPdf = await resolveUploadedResearchFile({
      formData,
      fileFieldName: "pdf",
      prefix: "uploaded",
      kind: "main_pdf",
      fallbackKey: buildVersionUploadKey({
        researchItemId: itemId,
        versionNumber: 1,
        kind: "main_pdf",
      }),
    });

    if (mainPdf.cleanupObjectKey) {
      cleanupObjectKeys.add(mainPdf.cleanupObjectKey);
    }

    const coverImage = await resolveUploadedResearchFile({
      formData,
      fileFieldName: "coverImage",
      prefix: "coverUploaded",
      kind: "cover_image",
      fallbackKey: buildVersionUploadKey({
        researchItemId: itemId,
        versionNumber: 1,
        kind: "cover_image",
      }),
    });

    if (coverImage.cleanupObjectKey) {
      cleanupObjectKeys.add(coverImage.cleanupObjectKey);
    }

    await db.transaction(async (tx) => {
      const uniqueTagIds = Array.from(new Set(parsed.data.tagIds));

      if (uniqueTagIds.length > 0) {
        const existingTagRows = await tx
          .select({ id: tags.id })
          .from(tags)
          .where(inArray(tags.id, uniqueTagIds));

        if (existingTagRows.length !== uniqueTagIds.length) {
          throw new Error("One or more selected tags are invalid.");
        }
      }

      const authorIds = parsed.data.authors
        .map((author) => author.id)
        .filter((value): value is string => Boolean(value));
      const uniqueAuthorIds = Array.from(new Set(authorIds));

      if (authorIds.length !== uniqueAuthorIds.length) {
        throw new Error("Duplicate author ids are not allowed.");
      }

      if (uniqueAuthorIds.length > 0) {
        const existingAuthorRows = await tx
          .select({ id: authors.id })
          .from(authors)
          .where(inArray(authors.id, uniqueAuthorIds));

        if (existingAuthorRows.length !== uniqueAuthorIds.length) {
          throw new Error("One or more author ids are invalid.");
        }
      }

      await tx.insert(researchItems).values({
        id: itemId,
        slug,
        title: parsed.data.title,
        abstract: parsed.data.abstract,
        itemType: parsed.data.itemType,
        publicationYear: parsed.data.publicationYear,
        departmentId: parsed.data.departmentId,
        submittedByUserId: session.appUser.id,
        currentVersionId: versionId,
        status: workflowIntent === "submit" ? "submitted" : "draft",
        license: parsed.data.license || null,
        externalUrl: parsed.data.externalUrl || null,
        doi: parsed.data.doi || null,
      });

      await tx.insert(itemVersions).values({
        id: versionId,
        researchItemId: itemId,
        versionNumber: 1,
        title: parsed.data.title,
        abstract: parsed.data.abstract,
        license: parsed.data.license || null,
        changeSummary: parsed.data.changeSummary || null,
        notesToAdmin: parsed.data.notesToAdmin || null,
        supervisorName: parsed.data.supervisorName || null,
        programName: parsed.data.programName || null,
        publicationDate: toPublicationDate(parsed.data.publicationDate),
        createdByUserId: session.appUser.id,
      });

      const authorJoinRows = [] as Array<{
        researchItemId: string;
        authorId: string;
        authorOrder: number;
        isCorresponding: boolean;
      }>;

      for (const [index, author] of parsed.data.authors.entries()) {
        let authorId = author.id;
        const normalizedEmail = normalizeEmail(author.email);
        let matchedExistingAuthor = false;

        if (!authorId && normalizedEmail) {
          const [existingAuthorByEmail] = await tx
            .select({ id: authors.id })
            .from(authors)
            .where(sql`lower(${authors.email}) = ${normalizedEmail}`)
            .orderBy(desc(authors.updatedAt), desc(authors.createdAt))
            .limit(1);

          if (existingAuthorByEmail) {
            authorId = existingAuthorByEmail.id;
            matchedExistingAuthor = true;
          }
        }

        if (!authorId) {
          authorId = randomUUID();
        }

        if (!author.id && !matchedExistingAuthor) {
          const linkedUserId = normalizedEmail
            ? await findVerifiedUserIdByEmail(tx, normalizedEmail)
            : null;

          await tx.insert(authors).values({
            id: authorId,
            displayName: author.displayName,
            email: normalizedEmail,
            affiliation: author.affiliation || null,
            orcid: author.orcid || null,
            linkedUserId,
          });
        } else if (matchedExistingAuthor && normalizedEmail) {
          // backfill linkedUserId if existing author row is missing it
          const linkedUserId = await findVerifiedUserIdByEmail(tx, normalizedEmail);
          if (linkedUserId) {
            await tx
              .update(authors)
              .set({ linkedUserId, updatedAt: new Date() })
              .where(and(eq(authors.id, authorId), sql`${authors.linkedUserId} IS NULL`));
          }
        }

        authorJoinRows.push({
          researchItemId: itemId,
          authorId,
          authorOrder: index + 1,
          isCorresponding: author.isCorresponding,
        });
      }

      await tx.insert(researchItemAuthors).values(authorJoinRows);

      if (uniqueTagIds.length > 0) {
        await tx.insert(researchItemTags).values(
          uniqueTagIds.map((tagId) => ({
            researchItemId: itemId,
            tagId,
          })),
        );
      }

      if (parsed.data.references.length > 0) {
        await tx.insert(researchItemReferences).values(
          parsed.data.references.map((ref, idx) => ({
            researchItemId: itemId,
            citationText: ref.citationText,
            url: ref.url || null,
            referenceOrder: idx + 1,
          })),
        );
      }

      if (mainPdf.file) {
        await tx.insert(files).values({
          id: randomUUID(),
          researchItemId: itemId,
          itemVersionId: versionId,
          fileKind: "main_pdf",
          storageBucket: mainPdf.file.bucketName,
          objectKey: mainPdf.file.objectKey,
          originalName: mainPdf.file.originalName,
          mimeType: mainPdf.file.mimeType,
          sizeBytes: mainPdf.file.sizeBytes,
          checksum: mainPdf.file.checksum,
          uploadedByUserId: session.appUser.id,
        });
      }

      if (coverImage.file) {
        await tx.insert(files).values({
          id: randomUUID(),
          researchItemId: itemId,
          itemVersionId: versionId,
          fileKind: "cover_image",
          storageBucket: coverImage.file.bucketName,
          objectKey: coverImage.file.objectKey,
          originalName: coverImage.file.originalName,
          mimeType: coverImage.file.mimeType,
          sizeBytes: coverImage.file.sizeBytes,
          checksum: coverImage.file.checksum,
          uploadedByUserId: session.appUser.id,
        });
      }

      await tx.insert(activityLogs).values({
        actorUserId: session.appUser.id,
        targetType: "research_item",
        targetId: itemId,
        action:
          workflowIntent === "submit"
            ? "research_item_submitted"
            : "research_item_draft_saved",
        metadata: JSON.stringify({
          researchItemId: itemId,
          title: parsed.data.title,
          versionId,
          workflowIntent,
          authorCount: parsed.data.authors.length,
          tagCount: uniqueTagIds.length,
          hasCoverImage: Boolean(coverImage.file),
        }),
      });
    });
  } catch (error) {
    for (const objectKey of cleanupObjectKeys) {
      try {
        await deleteResearchObject(objectKey);
      } catch {
        // ignore storage cleanup failures
      }
    }

    console.error("Failed to submit research item", error);
    redirect("/editor?submission=failed");
  }

  revalidatePath("/editor");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(
    workflowIntent === "submit"
      ? "/editor?submission=submitted"
      : "/editor?submission=draft-saved",
  );
}

export async function reviewResearchSubmissionAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = reviewResearchSubmissionSchema.safeParse({
    researchItemId: formData.get("researchItemId"),
    decision: formData.get("decision"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    redirect("/admin?moderation=invalid");
  }

  if (parsed.data.decision === "archive" && !parsed.data.comment?.trim()) {
    redirect("/admin?moderation=invalid");
  }

  if (parsed.data.decision !== "archive") {
    const pendingCount = await countPendingResearchModerationItems();

    if (pendingCount <= 0) {
      redirect("/admin?moderation=empty");
    }
  }

  const reviewedItem = await reviewResearchSubmission({
    researchItemId: parsed.data.researchItemId,
    reviewerUserId: session.appUser.id,
    decision: parsed.data.decision,
    comment: parsed.data.comment,
  });

  const targetUser = await getAppUserById(reviewedItem.submittedByUserId);

  if (targetUser && parsed.data.decision !== "archive") {
    try {
      await sendResearchModerationEmail({
        to: targetUser.email,
        name: targetUser.name,
        decision: parsed.data.decision,
        researchTitle: reviewedItem.title,
        researchSlug: reviewedItem.slug,
        comment: parsed.data.comment,
        appUrl: env.NEXT_PUBLIC_APP_URL,
      });
    } catch (error) {
      console.error("Failed to send research moderation email", error);
    }
  }

  revalidatePath("/editor");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/research/${reviewedItem.slug}`);
  redirect(
    `/admin?moderation=${
      parsed.data.decision === "publish"
        ? "published"
        : parsed.data.decision === "archive"
          ? "archived"
          : "changes-requested"
    }`,
  );
}

export async function submitResearchRevision(formData: FormData) {
  const session = await requireRole(["editor", "admin"], {
    returnTo: "/editor",
    unauthorizedRedirectTo: "/dashboard",
  });

  const slug = formData.get("slug");

  if (typeof slug !== "string" || !slug) {
    redirect("/editor?revision=invalid");
  }

  const existingItem = await getOwnedResearchItemForRevision({
    slug,
    userId: session.appUser.id,
  });

  if (!existingItem) {
    redirect("/editor?revision=not-found");
  }

  const parsed = parseSubmissionPayload(formData);
  const workflowIntent = getSubmissionIntent(formData);

  if (!parsed.success) {
    redirect(`/editor/${slug}/revise?revision=invalid`);
  }

  if (workflowIntent === "save_draft" && existingItem.status !== "draft") {
    redirect(`/editor/${slug}/revise?revision=invalid`);
  }

  const replacementPdf = formData.get("pdf");
  const replacementCoverImage = formData.get("coverImage");
  const hasNewPdf = replacementPdf instanceof File && replacementPdf.size > 0;
  const hasNewCoverImage =
    replacementCoverImage instanceof File && replacementCoverImage.size > 0;

  if (
    workflowIntent === "submit" &&
    !existingItem.pdfFile &&
    !hasNewPdf &&
    !hasUploadedMeta(formData, "uploaded")
  ) {
    redirect(`/editor/${slug}/revise?revision=missing-file`);
  }

  if (
    workflowIntent === "submit" &&
    !existingItem.coverImageFile &&
    !hasNewCoverImage &&
    !hasUploadedMeta(formData, "coverUploaded")
  ) {
    redirect(`/editor/${slug}/revise?revision=missing-cover`);
  }

  if (
    (hasNewPdf ||
      hasNewCoverImage ||
      hasUploadedMeta(formData, "uploaded") ||
      hasUploadedMeta(formData, "coverUploaded")) &&
    !isR2Configured
  ) {
    redirect(`/editor/${slug}/revise?revision=storage-not-configured`);
  }

  const nextVersionNumber = (existingItem.currentVersionNumber ?? 0) + 1;
  const versionId = randomUUID();
  const cleanupObjectKeys = new Set<string>();

  try {
    const mainPdf = await resolveUploadedResearchFile({
      formData,
      fileFieldName: "pdf",
      prefix: "uploaded",
      kind: "main_pdf",
      fallbackKey: buildVersionUploadKey({
        researchItemId: existingItem.id,
        versionNumber: nextVersionNumber,
        kind: "main_pdf",
      }),
    });

    if (mainPdf.cleanupObjectKey) {
      cleanupObjectKeys.add(mainPdf.cleanupObjectKey);
    }

    const coverImage = await resolveUploadedResearchFile({
      formData,
      fileFieldName: "coverImage",
      prefix: "coverUploaded",
      kind: "cover_image",
      fallbackKey: buildVersionUploadKey({
        researchItemId: existingItem.id,
        versionNumber: nextVersionNumber,
        kind: "cover_image",
      }),
    });

    if (coverImage.cleanupObjectKey) {
      cleanupObjectKeys.add(coverImage.cleanupObjectKey);
    }

    await db.transaction(async (tx) => {
      const uniqueTagIds = Array.from(new Set(parsed.data.tagIds));

      if (uniqueTagIds.length > 0) {
        const existingTagRows = await tx
          .select({ id: tags.id })
          .from(tags)
          .where(inArray(tags.id, uniqueTagIds));

        if (existingTagRows.length !== uniqueTagIds.length) {
          throw new Error("One or more selected tags are invalid.");
        }
      }

      const authorIds = parsed.data.authors
        .map((author) => author.id)
        .filter((value): value is string => Boolean(value));
      const uniqueAuthorIds = Array.from(new Set(authorIds));

      if (authorIds.length !== uniqueAuthorIds.length) {
        throw new Error("Duplicate author ids are not allowed.");
      }

      if (uniqueAuthorIds.length > 0) {
        const existingAuthorRows = await tx
          .select({ id: authors.id })
          .from(authors)
          .where(inArray(authors.id, uniqueAuthorIds));

        if (existingAuthorRows.length !== uniqueAuthorIds.length) {
          throw new Error("One or more author ids are invalid.");
        }
      }

      await tx.insert(itemVersions).values({
        id: versionId,
        researchItemId: existingItem.id,
        versionNumber: nextVersionNumber,
        title: parsed.data.title,
        abstract: parsed.data.abstract,
        license: parsed.data.license || null,
        changeSummary: parsed.data.changeSummary || null,
        notesToAdmin: parsed.data.notesToAdmin || null,
        supervisorName: parsed.data.supervisorName || null,
        programName: parsed.data.programName || null,
        publicationDate: toPublicationDate(parsed.data.publicationDate),
        createdByUserId: session.appUser.id,
      });

      await tx
        .update(researchItems)
        .set({
          title: parsed.data.title,
          abstract: parsed.data.abstract,
          itemType: parsed.data.itemType,
          publicationYear: parsed.data.publicationYear,
          departmentId: parsed.data.departmentId,
          currentVersionId: versionId,
          status: workflowIntent === "submit" ? "submitted" : "draft",
          license: parsed.data.license || null,
          externalUrl: parsed.data.externalUrl || null,
          doi: parsed.data.doi || null,
          updatedAt: new Date(),
        })
        .where(eq(researchItems.id, existingItem.id));

      await tx
        .delete(researchItemAuthors)
        .where(eq(researchItemAuthors.researchItemId, existingItem.id));

      const authorJoinRows = [] as Array<{
        researchItemId: string;
        authorId: string;
        authorOrder: number;
        isCorresponding: boolean;
      }>;

      for (const [index, author] of parsed.data.authors.entries()) {
        let authorId = author.id;
        const normalizedEmail = normalizeEmail(author.email);
        let matchedExistingAuthor = false;

        if (!authorId && normalizedEmail) {
          const [existingAuthorByEmail] = await tx
            .select({ id: authors.id })
            .from(authors)
            .where(sql`lower(${authors.email}) = ${normalizedEmail}`)
            .orderBy(desc(authors.updatedAt), desc(authors.createdAt))
            .limit(1);

          if (existingAuthorByEmail) {
            authorId = existingAuthorByEmail.id;
            matchedExistingAuthor = true;
          }
        }

        if (!authorId) {
          authorId = randomUUID();
        }

        if (!author.id && !matchedExistingAuthor) {
          const linkedUserId = normalizedEmail
            ? await findVerifiedUserIdByEmail(tx, normalizedEmail)
            : null;

          await tx.insert(authors).values({
            id: authorId,
            displayName: author.displayName,
            email: normalizedEmail,
            affiliation: author.affiliation || null,
            orcid: author.orcid || null,
            linkedUserId,
          });
        } else if (matchedExistingAuthor && normalizedEmail) {
          const linkedUserId = await findVerifiedUserIdByEmail(tx, normalizedEmail);
          if (linkedUserId) {
            await tx
              .update(authors)
              .set({ linkedUserId, updatedAt: new Date() })
              .where(and(eq(authors.id, authorId), sql`${authors.linkedUserId} IS NULL`));
          }
        }

        authorJoinRows.push({
          researchItemId: existingItem.id,
          authorId,
          authorOrder: index + 1,
          isCorresponding: author.isCorresponding,
        });
      }

      await tx.insert(researchItemAuthors).values(authorJoinRows);

      await tx
        .delete(researchItemTags)
        .where(eq(researchItemTags.researchItemId, existingItem.id));

      if (uniqueTagIds.length > 0) {
        await tx.insert(researchItemTags).values(
          uniqueTagIds.map((tagId) => ({
            researchItemId: existingItem.id,
            tagId,
          })),
        );
      }

      await tx
        .delete(researchItemReferences)
        .where(eq(researchItemReferences.researchItemId, existingItem.id));

      if (parsed.data.references.length > 0) {
        await tx.insert(researchItemReferences).values(
          parsed.data.references.map((ref, idx) => ({
            researchItemId: existingItem.id,
            citationText: ref.citationText,
            url: ref.url || null,
            referenceOrder: idx + 1,
          })),
        );
      }

      if (mainPdf.file) {
        await tx.insert(files).values({
          id: randomUUID(),
          researchItemId: existingItem.id,
          itemVersionId: versionId,
          fileKind: "main_pdf",
          storageBucket: mainPdf.file.bucketName,
          objectKey: mainPdf.file.objectKey,
          originalName: mainPdf.file.originalName,
          mimeType: mainPdf.file.mimeType,
          sizeBytes: mainPdf.file.sizeBytes,
          checksum: mainPdf.file.checksum,
          uploadedByUserId: session.appUser.id,
        });
      } else if (existingItem.pdfFile) {
        await tx
          .update(files)
          .set({
            itemVersionId: versionId,
            updatedAt: new Date(),
          })
          .where(eq(files.id, existingItem.pdfFile.id));
      }

      if (coverImage.file) {
        await tx.insert(files).values({
          id: randomUUID(),
          researchItemId: existingItem.id,
          itemVersionId: versionId,
          fileKind: "cover_image",
          storageBucket: coverImage.file.bucketName,
          objectKey: coverImage.file.objectKey,
          originalName: coverImage.file.originalName,
          mimeType: coverImage.file.mimeType,
          sizeBytes: coverImage.file.sizeBytes,
          checksum: coverImage.file.checksum,
          uploadedByUserId: session.appUser.id,
        });
      } else if (existingItem.coverImageFile) {
        await tx
          .update(files)
          .set({
            itemVersionId: versionId,
            updatedAt: new Date(),
          })
          .where(eq(files.id, existingItem.coverImageFile.id));
      }

      await tx.insert(activityLogs).values({
        actorUserId: session.appUser.id,
        targetType: "research_item",
        targetId: existingItem.id,
        action:
          workflowIntent === "submit"
            ? "research_item_resubmitted"
            : "research_item_draft_saved",
        metadata: JSON.stringify({
          researchItemId: existingItem.id,
          versionId,
          versionNumber: nextVersionNumber,
          workflowIntent,
          hasNewPdf: Boolean(mainPdf.file),
          hasNewCoverImage: Boolean(coverImage.file),
          authorCount: parsed.data.authors.length,
          tagCount: uniqueTagIds.length,
        }),
      });
    });
  } catch (error) {
    for (const objectKey of cleanupObjectKeys) {
      try {
        await deleteResearchObject(objectKey);
      } catch {
        // ignore cleanup failures
      }
    }

    console.error("Failed to resubmit research item", error);
    redirect(`/editor/${slug}/revise?revision=failed`);
  }

  revalidatePath("/editor");
  revalidatePath(`/editor/${slug}/revise`);
  revalidatePath("/admin");
  revalidatePath(`/research/${slug}`);
  redirect(
    workflowIntent === "submit"
      ? `/editor/${slug}/revise?revision=submitted`
      : `/editor/${slug}/revise?revision=draft-saved`,
  );
}

export async function manageEditorResearchItemAction(formData: FormData) {
  const session = await requireRole(["editor", "admin"], {
    returnTo: "/editor",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = editorItemActionSchema.safeParse({
    researchItemId: formData.get("researchItemId"),
    action: formData.get("action"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect("/editor?item=invalid");
  }

  const [item] = await db
    .select({
      id: researchItems.id,
      slug: researchItems.slug,
      status: researchItems.status,
    })
    .from(researchItems)
    .where(
      and(
        eq(researchItems.id, parsed.data.researchItemId),
        eq(researchItems.submittedByUserId, session.appUser.id),
      ),
    )
    .limit(1);

  if (!item) {
    redirect("/editor?item=missing");
  }

  if (parsed.data.action === "delete_draft") {
    if (item.status !== "draft") {
      redirect("/editor?item=invalid");
    }

    const fileRows = await db
      .select({ objectKey: files.objectKey })
      .from(files)
      .where(eq(files.researchItemId, item.id));

    await db.transaction(async (tx) => {
      await tx.insert(activityLogs).values({
        actorUserId: session.appUser.id,
        targetType: "research_item",
        targetId: item.id,
        action: "research_item_draft_deleted",
        metadata: JSON.stringify({
          researchItemId: item.id,
          slug: item.slug,
          status: item.status,
        }),
      });

      await tx.delete(researchItems).where(eq(researchItems.id, item.id));
    });

    for (const row of fileRows) {
      try {
        await deleteResearchObject(row.objectKey);
      } catch {
        // ignore storage cleanup failures
      }
    }

    revalidatePath("/editor");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    redirect("/editor?item=draft-deleted");
  }

  if (item.status !== "submitted" && item.status !== "changes_requested") {
    redirect("/editor?item=invalid");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(researchItems)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchItems.id, item.id));

    await tx.insert(activityLogs).values({
      actorUserId: session.appUser.id,
      targetType: "research_item",
      targetId: item.id,
      action: "research_item_archived",
      metadata: JSON.stringify({
        researchItemId: item.id,
        slug: item.slug,
        archivedBy: "editor",
        archiveSource: "withdraw",
        previousStatus: item.status,
        reason: parsed.data.reason ?? "Withdrawn by editor from workspace",
      }),
    });
  });

  revalidatePath("/editor");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/research/${item.slug}`);
  redirect("/editor?item=withdrawn");
}


export async function trackDownload(researchItemId: string) {
  const { incrementDownloadCount } = await import("@/lib/db/queries");
  await incrementDownloadCount(researchItemId);
}
