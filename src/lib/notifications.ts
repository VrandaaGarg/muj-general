import "server-only";

import { sendEmail } from "@/lib/email";

export async function sendEditorAccessDecisionEmail(params: {
  to: string;
  name: string;
  decision: "approved" | "rejected";
  rejectionReason?: string | null;
}) {
  const subject =
    params.decision === "approved"
      ? "Your MUJ General editor access has been approved"
      : "Your MUJ General editor access request was reviewed";

  const text =
    params.decision === "approved"
      ? `Hi ${params.name},

Your request for editor access on MUJ General has been approved. You can now sign in and submit research for review.

Thanks,
MUJ General`
      : `Hi ${params.name},

Your request for editor access on MUJ General was reviewed and is not approved right now.${params.rejectionReason ? `

Reason: ${params.rejectionReason}` : ""}

You can review the feedback in your dashboard and apply again later if needed.

Thanks,
MUJ General`;

  await sendEmail({
    to: params.to,
    subject,
    text,
    html: `<p>Hi ${params.name},</p><p>${
      params.decision === "approved"
        ? "Your request for editor access on <strong>MUJ General</strong> has been approved. You can now sign in and submit research for review."
        : `Your request for editor access on <strong>MUJ General</strong> was reviewed and is not approved right now.${params.rejectionReason ? `</p><p><strong>Reason:</strong> ${params.rejectionReason}` : ""}<p>You can review the feedback in your dashboard and apply again later if needed.`
    }</p><p>Thanks,<br />MUJ General</p>`,
  });
}

export async function sendResearchModerationEmail(params: {
  to: string;
  name: string;
  decision: "publish" | "request_changes";
  researchTitle: string;
  researchSlug: string;
  comment?: string | null;
  appUrl: string;
}) {
  const itemUrl = `${params.appUrl.replace(/\/$/, "")}/research/${params.researchSlug}`;
  const subject =
    params.decision === "publish"
      ? `Your research was published on MUJ General`
      : `Changes requested for your MUJ General submission`;

  const text =
    params.decision === "publish"
      ? `Hi ${params.name},

Your submission "${params.researchTitle}" has been published on MUJ General.

View it here: ${itemUrl}

Thanks,
MUJ General`
      : `Hi ${params.name},

Your submission "${params.researchTitle}" needs some updates before it can be published.${params.comment ? `

Reviewer feedback: ${params.comment}` : ""}

Please sign in to MUJ General and revise your submission.

Thanks,
MUJ General`;

  await sendEmail({
    to: params.to,
    subject,
    text,
    html: `<p>Hi ${params.name},</p><p>${
      params.decision === "publish"
        ? `Your submission <strong>${params.researchTitle}</strong> has been published on MUJ General.`
        : `Your submission <strong>${params.researchTitle}</strong> needs some updates before it can be published.`
    }</p>${params.comment ? `<p><strong>Reviewer feedback:</strong> ${params.comment}</p>` : ""}${
      params.decision === "publish"
        ? `<p><a href="${itemUrl}">View your published item</a></p>`
        : `<p>Please sign in to MUJ General and revise your submission.</p>`
    }<p>Thanks,<br />MUJ General</p>`,
  });
}

export async function sendSubmitterConfirmationRequestEmail(params: {
  to: string;
  name: string;
  researchTitle: string;
  researchItemId: string;
  comment?: string | null;
  appUrl: string;
}) {
  const confirmUrl = `${params.appUrl.replace(/\/$/, "")}/submissions/confirm/${params.researchItemId}`;
  const subject = `Final confirmation required for your MUJ General submission`;

  const text = `Hi ${params.name},

Your submission "${params.researchTitle}" has reached final review.

Please confirm one of the following:
- Confirm publication
- Request revisions
- Decline publication

Review and respond here: ${confirmUrl}${params.comment ? `

Admin note: ${params.comment}` : ""}

Thanks,
MUJ General`;

  await sendEmail({
    to: params.to,
    subject,
    text,
    html: `<p>Hi ${params.name},</p><p>Your submission <strong>${params.researchTitle}</strong> has reached final review.</p><p>Please confirm one of the following: confirm publication, request revisions, or decline publication.</p>${params.comment ? `<p><strong>Admin note:</strong> ${params.comment}</p>` : ""}<p><a href="${confirmUrl}">Review and submit your confirmation</a></p><p>Thanks,<br />MUJ General</p>`,
  });
}

export async function sendPeerReviewInviteEmail(params: {
  to: string;
  name: string;
  invitedByName: string;
  researchTitle: string;
  reviewUrl: string;
}) {
  const subject = `Peer review invitation for MUJ General`;

  const text = `Hi ${params.name},

${params.invitedByName} invited you to provide a peer review for "${params.researchTitle}".

Open your review dashboard: ${params.reviewUrl}

If you do not have an account, sign up with this same email and verify it to access the review.

Thanks,
MUJ General`;

  await sendEmail({
    to: params.to,
    subject,
    text,
    html: `<p>Hi ${params.name},</p><p>${params.invitedByName} invited you to provide a peer review for <strong>${params.researchTitle}</strong>.</p><p><a href="${params.reviewUrl}">Open review dashboard</a></p><p>If you do not have an account, sign up with this same email and verify it to access the review.</p><p>Thanks,<br />MUJ General</p>`,
  });
}
