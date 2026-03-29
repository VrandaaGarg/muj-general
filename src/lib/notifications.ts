import "server-only";

import { sendEmail } from "@/lib/email";
import { buildEmailHtml, buildEmailText } from "@/lib/email-template";
import { env } from "@/lib/env";

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

  const template =
    params.decision === "approved"
      ? {
          previewText: "Your editor access request has been approved",
          title: "Editor access approved",
          greeting: `Hi ${params.name},`,
          paragraphs: [
            "Your request for editor access on MUJ General has been approved.",
            "You can now sign in and submit research for editorial and admin review.",
          ],
          actionLabel: "Open MUJ General",
          actionUrl: env.NEXT_PUBLIC_APP_URL,
        }
      : {
          previewText: "Your editor access request has been reviewed",
          title: "Editor access request reviewed",
          greeting: `Hi ${params.name},`,
          paragraphs: [
            "Your request for editor access on MUJ General was reviewed and is not approved at this time.",
            ...(params.rejectionReason
              ? [`Reason provided: ${params.rejectionReason}`]
              : []),
            "You may review the feedback and apply again later if needed.",
          ],
          actionLabel: "Open dashboard",
          actionUrl: env.NEXT_PUBLIC_APP_URL,
        };

  await sendEmail({
    to: params.to,
    subject,
    text: buildEmailText(template),
    html: buildEmailHtml(template),
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

  const template =
    params.decision === "publish"
      ? {
          previewText: "Your submission has been published",
          title: "Submission published",
          greeting: `Hi ${params.name},`,
          paragraphs: [
            `Your submission \"${params.researchTitle}\" has been published on MUJ General.`,
            "You can now view and share the published version.",
          ],
          actionLabel: "View published item",
          actionUrl: itemUrl,
        }
      : {
          previewText: "Changes were requested on your submission",
          title: "Changes requested",
          greeting: `Hi ${params.name},`,
          paragraphs: [
            `Your submission \"${params.researchTitle}\" needs updates before publication.`,
            ...(params.comment
              ? [`Reviewer feedback: ${params.comment}`]
              : []),
            "Please sign in and submit a revised version.",
          ],
          actionLabel: "Open dashboard",
          actionUrl: `${params.appUrl.replace(/\/$/, "")}/editor`,
        };

  await sendEmail({
    to: params.to,
    subject,
    text: buildEmailText(template),
    html: buildEmailHtml(template),
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
  const confirmUrl = `${params.appUrl.replace(/\/$/, "")}/submissions/${params.researchItemId}`;
  const subject = `Final confirmation required for your MUJ General submission`;

  const template = {
    previewText: "Final confirmation is required for your submission",
    title: "Final confirmation required",
    greeting: `Hi ${params.name},`,
    paragraphs: [
      `Your submission \"${params.researchTitle}\" has reached final review.`,
      "Please choose one of the available confirmation actions: confirm publication, request revisions, or decline publication.",
      ...(params.comment ? [`Admin note: ${params.comment}`] : []),
    ],
    actionLabel: "Review and respond",
    actionUrl: confirmUrl,
  };

  await sendEmail({
    to: params.to,
    subject,
    text: buildEmailText(template),
    html: buildEmailHtml(template),
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

  const template = {
    previewText: "You have been invited to peer review a manuscript",
    title: "Peer review invitation",
    greeting: `Hi ${params.name},`,
    paragraphs: [
      `${params.invitedByName} has invited you to provide a peer review for \"${params.researchTitle}\".`,
      "If you do not already have an account, sign up using this same email address and verify it to access the review dashboard.",
    ],
    actionLabel: "Open review dashboard",
    actionUrl: params.reviewUrl,
  };

  await sendEmail({
    to: params.to,
    subject,
    text: buildEmailText(template),
    html: buildEmailHtml(template),
  });
}
