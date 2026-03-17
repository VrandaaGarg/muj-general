"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppSession, requireRole } from "@/lib/auth/session";
import {
  createEditorAccessRequest,
  getLatestEditorAccessRequestForUser,
  hasPendingEditorAccessRequest,
  reviewEditorAccessRequest,
} from "@/lib/db/queries";
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

  const parsed = reviewEditorAccessRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    rejectionReason: formData.get("rejectionReason"),
  });

  if (!parsed.success) {
    redirect("/admin?review=invalid");
  }

  const { requestId, decision, rejectionReason } = parsed.data;

  if (decision === "rejected" && !rejectionReason?.trim()) {
    redirect(`/admin?review=missing-reason&requestId=${requestId}`);
  }

  await reviewEditorAccessRequest({
    requestId,
    reviewerUserId: session.appUser.id,
    status: decision,
    rejectionReason,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/editor");
  redirect(`/admin?review=${decision}`);
}
