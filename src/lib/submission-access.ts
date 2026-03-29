import "server-only";

import { requireAppSession } from "@/lib/auth/session";
import {
  getPeerReviewInviteForResearchItemForUser,
  getResearchItemForAdminReview,
  listDepartmentResearchItemsForReview,
} from "@/lib/db/queries";

export type SubmissionActorType = "admin" | "editor" | "submitter" | "reviewer";

type SubmissionItem = NonNullable<
  Awaited<ReturnType<typeof getResearchItemForAdminReview>>
>;

export interface SubmissionAccessContext {
  session: SubmissionSession;
  item: SubmissionItem;
  actorType: SubmissionActorType;
  canAdminModerate: boolean;
  canDepartmentReview: boolean;
  canSubmitterConfirm: boolean;
  canPeerReview: boolean;
}

export type SubmissionSession = Awaited<ReturnType<typeof requireAppSession>>;

export async function resolveSubmissionAccessContext(params: {
  submissionId: string;
  session: SubmissionSession;
}): Promise<SubmissionAccessContext | null> {
  const item = await getResearchItemForAdminReview(params.submissionId);

  if (!item) {
    return null;
  }

  const isAdmin = params.session.appUser.role === "admin";
  const isSubmitter = item.submittedByUserId === params.session.appUser.id;

  const [reviewerInvite, editorQueue] = await Promise.all([
    getPeerReviewInviteForResearchItemForUser({
      researchItemId: params.submissionId,
      userId: params.session.appUser.id,
      userEmail: params.session.appUser.email,
    }),
    params.session.appUser.role === "editor"
      ? listDepartmentResearchItemsForReview(params.session.appUser.id)
      : Promise.resolve([]),
  ]);

  const isEditor =
    params.session.appUser.role === "editor" &&
    editorQueue.some((entry) => entry.id === params.submissionId);
  const isReviewer = Boolean(reviewerInvite);

  const actorType: SubmissionActorType | null = isAdmin
    ? "admin"
    : isEditor
      ? "editor"
      : isSubmitter
        ? "submitter"
        : isReviewer
          ? "reviewer"
          : null;

  if (!actorType) {
    return null;
  }

  return {
    session: params.session,
    item,
    actorType,
    canAdminModerate: isAdmin,
    canDepartmentReview: isEditor,
    canSubmitterConfirm: isSubmitter,
    canPeerReview: isReviewer,
  };
}

export async function getSubmissionAccessContext(
  submissionId: string,
): Promise<SubmissionAccessContext | null> {
  const session = await requireAppSession(`/submissions/${submissionId}`);
  return resolveSubmissionAccessContext({ submissionId, session });
}
