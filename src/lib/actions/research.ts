"use server";

import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  activityLogs,
  authors,
  files,
  itemVersions,
  researchItemAuthors,
  researchItemTags,
  researchItems,
  tags,
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

  if (!parsed.success) {
    redirect("/editor?submission=invalid");
  }

  if (!isR2Configured) {
    redirect("/editor?submission=storage-not-configured");
  }

  const submissionPdf = formData.get("pdf");
  const hasPdfFile = submissionPdf instanceof File && submissionPdf.size > 0;

  if (!hasPdfFile && !hasUploadedMeta(formData, "uploaded")) {
    redirect("/editor?submission=missing-file");
  }

  const submissionCover = formData.get("coverImage");
  const hasCoverFile = submissionCover instanceof File && submissionCover.size > 0;

  if (!hasCoverFile && !hasUploadedMeta(formData, "coverUploaded")) {
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

      if (parsed.data.authors.some((author) => author.id)) {
        throw new Error("New submissions cannot reuse existing author ids.");
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
        status: "submitted",
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
        const authorId = randomUUID();

        await tx.insert(authors).values({
          id: authorId,
          displayName: author.displayName,
          email: author.email || null,
          affiliation: author.affiliation || null,
          orcid: author.orcid || null,
        });

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

      await tx.insert(files).values({
        id: randomUUID(),
        researchItemId: itemId,
        itemVersionId: versionId,
        fileKind: "main_pdf",
        storageBucket: mainPdf.file!.bucketName,
        objectKey: mainPdf.file!.objectKey,
        originalName: mainPdf.file!.originalName,
        mimeType: mainPdf.file!.mimeType,
        sizeBytes: mainPdf.file!.sizeBytes,
        checksum: mainPdf.file!.checksum,
        uploadedByUserId: session.appUser.id,
      });

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
        action: "research_item_submitted",
        metadata: JSON.stringify({
          researchItemId: itemId,
          title: parsed.data.title,
          versionId,
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
  redirect("/editor?submission=submitted");
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

  const pendingCount = await countPendingResearchModerationItems();

  if (pendingCount <= 0) {
    redirect("/admin?moderation=empty");
  }

  const reviewedItem = await reviewResearchSubmission({
    researchItemId: parsed.data.researchItemId,
    reviewerUserId: session.appUser.id,
    decision: parsed.data.decision,
    comment: parsed.data.comment,
  });

  const targetUser = await getAppUserById(reviewedItem.submittedByUserId);

  if (targetUser) {
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
  redirect(
    `/admin?moderation=${parsed.data.decision === "publish" ? "published" : "changes-requested"}`,
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

  if (!parsed.success) {
    redirect(`/editor/${slug}/revise?revision=invalid`);
  }

  const replacementPdf = formData.get("pdf");
  const replacementCoverImage = formData.get("coverImage");
  const hasNewPdf = replacementPdf instanceof File && replacementPdf.size > 0;
  const hasNewCoverImage =
    replacementCoverImage instanceof File && replacementCoverImage.size > 0;

  if (!existingItem.pdfFile && !hasNewPdf && !hasUploadedMeta(formData, "uploaded")) {
    redirect(`/editor/${slug}/revise?revision=missing-file`);
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

      const allowedAuthorIds = new Set(existingItem.authors.map((author) => author.id));
      const seenAuthorIds = new Set<string>();

      for (const author of parsed.data.authors) {
        if (!author.id) {
          continue;
        }

        if (!allowedAuthorIds.has(author.id) || seenAuthorIds.has(author.id)) {
          throw new Error("One or more author ids are invalid.");
        }

        seenAuthorIds.add(author.id);
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
          status: "submitted",
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
        const authorId = author.id ?? randomUUID();

        if (author.id) {
          await tx
            .update(authors)
            .set({
              displayName: author.displayName,
              email: author.email || null,
              affiliation: author.affiliation || null,
              orcid: author.orcid || null,
              updatedAt: new Date(),
            })
            .where(eq(authors.id, author.id));
        } else {
          await tx.insert(authors).values({
            id: authorId,
            displayName: author.displayName,
            email: author.email || null,
            affiliation: author.affiliation || null,
            orcid: author.orcid || null,
          });
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
        action: "research_item_resubmitted",
        metadata: JSON.stringify({
          researchItemId: existingItem.id,
          versionId,
          versionNumber: nextVersionNumber,
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
  redirect(`/editor/${slug}/revise?revision=submitted`);
}
