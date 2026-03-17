"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { activityLogs, files, itemVersions, researchItems } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import {
  countPendingResearchModerationItems,
  reviewResearchSubmission,
} from "@/lib/db/queries";
import { createResearchItemSlug } from "@/lib/research/slug";
import {
  deleteResearchPdf,
  uploadResearchPdf,
} from "@/lib/storage/research-files";
import { isR2Configured } from "@/lib/env";
import {
  createResearchSubmissionSchema,
  reviewResearchSubmissionSchema,
} from "@/lib/validation/research";

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

  try {
    const uploadedFile = await uploadResearchPdf({
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

  await reviewResearchSubmission({
    researchItemId: parsed.data.researchItemId,
    reviewerUserId: session.appUser.id,
    decision: parsed.data.decision,
    comment: parsed.data.comment,
  });

  revalidatePath("/editor");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(
    `/admin?moderation=${parsed.data.decision === "publish" ? "published" : "changes-requested"}`,
  );
}
