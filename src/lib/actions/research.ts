"use server";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { activityLogs, files, itemVersions, researchItems } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import {
  countPendingResearchModerationItems,
  getAppUserById,
  getOwnedResearchItemForRevision,
  reviewResearchSubmission,
} from "@/lib/db/queries";
import { createResearchItemSlug } from "@/lib/research/slug";
import {
  getResearchObjectMetadata,
  deleteResearchPdf,
  uploadResearchPdf,
} from "@/lib/storage/research-files";
import { isR2Configured } from "@/lib/env";
import {
  createResearchSubmissionSchema,
  reviewResearchSubmissionSchema,
} from "@/lib/validation/research";
import { sendResearchModerationEmail } from "@/lib/notifications";
import { env } from "@/lib/env";

export async function submitResearchSubmission(formData: FormData) {
  const session = await requireRole(["editor", "admin"], {
    returnTo: "/editor",
    unauthorizedRedirectTo: "/dashboard",
  });

  const parsed = createResearchSubmissionSchema.safeParse({
    title: formData.get("title"),
    abstract: formData.get("abstract"),
    itemType: formData.get("itemType"),
    publicationYear: formData.get("publicationYear"),
    departmentId: formData.get("departmentId"),
    license: formData.get("license"),
    externalUrl: formData.get("externalUrl"),
    doi: formData.get("doi"),
    notesToAdmin: formData.get("notesToAdmin"),
    supervisorName: formData.get("supervisorName"),
    programName: formData.get("programName"),
  });

  if (!parsed.success) {
    redirect("/editor?submission=invalid");
  }

  if (!isR2Configured) {
    redirect("/editor?submission=storage-not-configured");
  }

  const pdfFile = formData.get("pdf");

  if (!(pdfFile instanceof File)) {
    redirect("/editor?submission=missing-file");
  }

  const itemId = randomUUID();
  const versionId = randomUUID();
  const fileId = randomUUID();
  const slug = createResearchItemSlug(parsed.data.title);
  const objectKey = `research-items/${itemId}/v1/main.pdf`;
  const uploadedObjectKey = formData.get("uploadedObjectKey");
  const uploadedOriginalName = formData.get("uploadedOriginalName");
  const uploadedMimeType = formData.get("uploadedMimeType");
  const uploadedSizeBytes = formData.get("uploadedSizeBytes");

  try {
    const uploadedFile =
      typeof uploadedObjectKey === "string" &&
      typeof uploadedOriginalName === "string" &&
      typeof uploadedMimeType === "string" &&
      typeof uploadedSizeBytes === "string"
        ? {
            ...(await getResearchObjectMetadata(uploadedObjectKey)),
            originalName: uploadedOriginalName,
            mimeType: uploadedMimeType,
            sizeBytes: Number(uploadedSizeBytes),
          }
        : await uploadResearchPdf({
            key: objectKey,
            file: pdfFile,
          });

    await db.transaction(async (tx) => {
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
        notesToAdmin: parsed.data.notesToAdmin || null,
        supervisorName: parsed.data.supervisorName || null,
        programName: parsed.data.programName || null,
        createdByUserId: session.appUser.id,
      });

      await tx.insert(files).values({
        id: fileId,
        researchItemId: itemId,
        itemVersionId: versionId,
        fileKind: "main_pdf",
        storageBucket: uploadedFile.bucketName,
        objectKey: uploadedFile.objectKey,
        originalName: uploadedFile.originalName,
        mimeType: uploadedFile.mimeType,
        sizeBytes: uploadedFile.sizeBytes,
        uploadedByUserId: session.appUser.id,
      });

      await tx.insert(activityLogs).values({
        actorUserId: session.appUser.id,
        targetType: "research_item",
        targetId: itemId,
        action: "research_item_submitted",
        metadata: JSON.stringify({
          researchItemId: itemId,
          title: parsed.data.title,
          versionId,
        }),
      });
    });
  } catch (error) {
    try {
      await deleteResearchPdf(objectKey);
    } catch {
      // ignore storage cleanup failures
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

  const parsed = createResearchSubmissionSchema.safeParse({
    title: formData.get("title"),
    abstract: formData.get("abstract"),
    itemType: formData.get("itemType"),
    publicationYear: formData.get("publicationYear"),
    departmentId: formData.get("departmentId"),
    license: formData.get("license"),
    externalUrl: formData.get("externalUrl"),
    doi: formData.get("doi"),
    notesToAdmin: formData.get("notesToAdmin"),
    supervisorName: formData.get("supervisorName"),
    programName: formData.get("programName"),
  });

  if (!parsed.success) {
    redirect(`/editor/${slug}/revise?revision=invalid`);
  }

  const replacementPdf = formData.get("pdf");
  const hasNewPdf = replacementPdf instanceof File && replacementPdf.size > 0;

  if (hasNewPdf && !isR2Configured) {
    redirect(`/editor/${slug}/revise?revision=storage-not-configured`);
  }

  const nextVersionNumber = (existingItem.currentVersionNumber ?? 0) + 1;
  const versionId = randomUUID();
  const fileId = randomUUID();
  const objectKey = `research-items/${existingItem.id}/v${nextVersionNumber}/main.pdf`;
  const uploadedObjectKey = formData.get("uploadedObjectKey");
  const uploadedOriginalName = formData.get("uploadedOriginalName");
  const uploadedMimeType = formData.get("uploadedMimeType");
  const uploadedSizeBytes = formData.get("uploadedSizeBytes");

  let uploadedFile:
    | {
        bucketName: string;
        objectKey: string;
        mimeType: string;
        sizeBytes: number;
        originalName: string;
      }
    | null = null;

  try {
    if (
      typeof uploadedObjectKey === "string" &&
      typeof uploadedOriginalName === "string" &&
      typeof uploadedMimeType === "string" &&
      typeof uploadedSizeBytes === "string"
    ) {
      uploadedFile = {
        ...(await getResearchObjectMetadata(uploadedObjectKey)),
        originalName: uploadedOriginalName,
        mimeType: uploadedMimeType,
        sizeBytes: Number(uploadedSizeBytes),
      };
    } else if (hasNewPdf && replacementPdf instanceof File) {
      uploadedFile = await uploadResearchPdf({
        key: objectKey,
        file: replacementPdf,
      });
    }

    await db.transaction(async (tx) => {
      await tx.insert(itemVersions).values({
        id: versionId,
        researchItemId: existingItem.id,
        versionNumber: nextVersionNumber,
        title: parsed.data.title,
        abstract: parsed.data.abstract,
        license: parsed.data.license || null,
        notesToAdmin: parsed.data.notesToAdmin || null,
        supervisorName: parsed.data.supervisorName || null,
        programName: parsed.data.programName || null,
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

      if (uploadedFile) {
        await tx.insert(files).values({
          id: fileId,
          researchItemId: existingItem.id,
          itemVersionId: versionId,
          fileKind: "main_pdf",
          storageBucket: uploadedFile.bucketName,
          objectKey: uploadedFile.objectKey,
          originalName: uploadedFile.originalName,
          mimeType: uploadedFile.mimeType,
          sizeBytes: uploadedFile.sizeBytes,
          uploadedByUserId: session.appUser.id,
        });
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
          hasNewPdf: Boolean(uploadedFile),
        }),
      });
    });
  } catch (error) {
    if (uploadedFile) {
      try {
        await deleteResearchPdf(objectKey);
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
