import { notFound, redirect } from "next/navigation";

import { requireAppSession } from "@/lib/auth/session";
import { getPeerReviewInviteForUser } from "@/lib/db/queries";

export default async function LegacyPeerReviewSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAppSession(`/reviews/${id}`);

  const invite = await getPeerReviewInviteForUser({
    inviteId: id,
    userId: session.appUser.id,
    userEmail: session.appUser.email,
  });

  if (!invite) {
    notFound();
  }

  redirect(`/submissions/${invite.researchItemId}`);
}
