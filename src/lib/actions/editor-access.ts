"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppSession, requireRole } from "@/lib/auth/session";
import {
  createEditorAccessRequest,
  getLatestEditorAccessRequestForUser,
  getAppUserById,
  hasPendingEditorAccessRequest,
  reviewEditorAccessRequest,
} from "@/lib/db/queries";
import { sendEditorAccessDecisionEmail } from "@/lib/notifications";
import {
  createEditorAccessRequestSchema,
  reviewEditorAccessRequestSchema,
} from "@/lib/validation/editor-access";

export async function submitEditorAccessRequest(formData: FormData) {
  const session = await requireAppSession("/dashboard");

  if (!session.user.emailVerified) {
    redirect("/dashboard?request=email-not-verified");
  }

  if (session.appUser.role !== "reader") {
    redirect("/dashboard?request=already-elevated");
  }

  const latestRequest = await getLatestEditorAccessRequestForUser(session.appUser.id);

  if (latestRequest?.status === "approved") {
    redirect("/dashboard?request=already-approved");
  }

  if (await hasPendingEditorAccessRequest(session.appUser.id)) {
    redirect("/dashboard?request=already-pending");
  }

  const parsed = createEditorAccessRequestSchema.safeParse({
    message: formData.get("message"),
  });

  if (!parsed.success) {
    redirect("/dashboard?request=invalid");
  }

  await createEditorAccessRequest({
    userId: session.appUser.id,
    message: parsed.data.message,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard?request=submitted");
}

export async function reviewEditorAccessRequestAction(formData: FormData) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin",
    unauthorizedRedirectTo: "/dashboard",
  });

  const rejectionReasonEntry = formData.get("rejectionReason");

  const parsed = reviewEditorAccessRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    rejectionReason:
      typeof rejectionReasonEntry === "string"
        ? rejectionReasonEntry
        : undefined,
  });

  if (!parsed.success) {
    redirect("/admin?review=invalid");
  }

  const { requestId, decision, rejectionReason } = parsed.data;

  if (decision === "rejected" && !rejectionReason?.trim()) {
    redirect(`/admin?review=missing-reason&requestId=${requestId}`);
  }

  const reviewedRequest = await reviewEditorAccessRequest({
    requestId,
    reviewerUserId: session.appUser.id,
    status: decision,
    rejectionReason,
  });

  const targetUser = await getAppUserById(reviewedRequest.userId);

  if (targetUser) {
    try {
      await sendEditorAccessDecisionEmail({
        to: targetUser.email,
        name: targetUser.name,
        decision,
        rejectionReason,
      });
    } catch (error) {
      console.error("Failed to send editor access review email", error);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/editor");
  redirect(`/admin?review=${decision}`);
}
