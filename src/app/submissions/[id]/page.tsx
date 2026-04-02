import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  LinkIcon,
  Mail,
  User,
  UserPlus,
} from "lucide-react";

import { AdminReviewActions } from "@/components/admin-review-actions";
import { AdminVersionDiff } from "@/components/admin-version-diff";
import { ResearchThumbnail } from "@/components/pdf-thumbnail-viewer";
import { SiteHeader } from "@/components/site-header";
import { SubmissionSidebarNav } from "@/components/submission-sidebar-nav";
import { SubmitterConfirmationForm } from "@/components/submitter-confirmation-form";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  getResearchItemForAdminReview,
  getResearchItemVersionDiff,
  listPeerReviewInvitesForResearchItem,
} from "@/lib/db/queries";
import { getTypeLabel } from "@/lib/research-types";
import { getPublicFileUrl } from "@/lib/storage/r2";
import { getSubmissionAccessContext } from "@/lib/submission-access";

interface SubmissionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SubmissionPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getResearchItemForAdminReview(id);

  if (!item) {
    return { title: "Not Found - Submission" };
  }

  return { title: `${item.title} - Submission` };
}

function formatDate(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const PEER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-600/10 text-amber-600" },
  accepted: { label: "Accepted", className: "bg-primary/10 text-primary" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
  completed: { label: "Completed", className: "bg-emerald-600/10 text-emerald-600" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  revoked: { label: "Revoked", className: "bg-muted text-muted-foreground" },
};

const PEER_REC_LABELS: Record<string, string> = {
  accept: "Accept",
  minor_revision: "Minor Revision",
  major_revision: "Major Revision",
  reject: "Reject",
};

type PeerInviteRow = Awaited<
  ReturnType<typeof listPeerReviewInvitesForResearchItem>
>[number];

function PeerReviewSummary({ invites }: { invites: PeerInviteRow[] }) {
  return (
    <section className="   border border-border/60 bg-card/50 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
        <UserPlus className="size-4 text-primary" />
        Peer Reviews
      </h2>
      <div className="space-y-3">
        {invites.map((invite) => {
          const statusCfg =
            PEER_STATUS_CONFIG[invite.status] ?? PEER_STATUS_CONFIG.pending;

          return (
            <div
              key={invite.id}
              className="   border border-border/40 bg-background px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-foreground">
                  {invite.inviteeName || invite.inviteeEmail}
                </span>
                {invite.inviteeName && (
                  <span className="text-xs text-muted-foreground">
                    {invite.inviteeEmail}
                  </span>
                )}
                <span
                  className={`   px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.className}`}
                >
                  {statusCfg.label}
                </span>
                {invite.recommendation && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                    <Check className="size-3" />
                    {PEER_REC_LABELS[invite.recommendation] ?? invite.recommendation}
                  </span>
                )}
              </div>
              {invite.reviewSubmittedAt && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Reviewed {formatDateTime(invite.reviewSubmittedAt)}
                </p>
              )}
              {invite.reviewComment && (
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                  {invite.reviewComment}
                </p>
              )}
              {invite.confidentialComment && (
                <div className="mt-2   border border-amber-600/20 bg-amber-600/5 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700">
                    Confidential note
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">
                    {invite.confidentialComment}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const { id } = await params;
  const access = await getSubmissionAccessContext(id);

  if (!access) {
    notFound();
  }

  const { session, item, actorType } = access;
  const isSubmitter = actorType === "submitter";

  const [versionDiff, peerInvites] = await Promise.all([
    actorType === "admin" ? getResearchItemVersionDiff(id) : Promise.resolve(null),
    actorType === "admin"
      ? listPeerReviewInvitesForResearchItem({ researchItemId: id })
      : Promise.resolve([]),
  ]);

  const pdfUrl = item.pdfFile ? getPublicFileUrl(item.pdfFile.objectKey) : null;
  const coverImageUrl = item.coverImageFile
    ? getPublicFileUrl(item.coverImageFile.objectKey)
    : null;
  const submittedAt = formatDate(item.createdAt);
  const publicationDate = formatDate(item.publicationDate);
  const stageLabel = formatLabel(item.workflowStage ?? item.status) ?? "Submission";
  const confirmationLabel = formatLabel(item.submitterConfirmationStatus);
  const canRespondConfirmation =
    actorType === "submitter" &&
    item.workflowStage === "awaiting_submitter_confirmation" &&
    item.submitterConfirmationStatus === "pending";
  const showInternalDetails = actorType === "admin" || actorType === "editor";
  const showSubmitterIdentity = actorType !== "reviewer";
  const showSubmitterNotes = actorType !== "reviewer" && Boolean(item.notesToAdmin);
  const showChangeSummary = actorType !== "reviewer" && Boolean(item.changeSummary);

  const sections = [
    { id: "abstract", label: "Abstract" },
    ...(item.supervisorName || item.programName || item.license
      ? [{ id: "additional-details", label: "Additional details" }]
      : []),
    ...(item.references.length > 0 ? [{ id: "references", label: "References" }] : []),
    { id: "about-this-submission", label: "About this submission" },
  ];

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <SiteHeader role={session.appUser.role} />

      <main className="relative z-10 pt-4 md:pt-8">
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -top-20 bg-linear-to-b from-primary/3 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-7xl px-6 pt-4 pb-12 md:px-12 lg:px-20">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Link
                href="/"
                className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
              >
                Home
              </Link>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <span className="font-medium text-foreground">Submission</span>
            </nav>

            <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-semibold text-primary">
                    {getTypeLabel(item.itemType)}
                  </span>
                  {item.departmentName && (
                    <span className="    bg-muted/60 px-2 py-0.5 text-sm font-medium text-muted-foreground">
                      {item.departmentName}
                    </span>
                  )}
                  <span className="    border border-primary/20 bg-primary/5 px-2 py-0.5 text-sm font-medium text-primary">
                    {actorType === "reviewer" ? "Peer review" : stageLabel}
                  </span>
                </div>

                <h1 className="mt-5 text-2xl font-bold leading-[1.2] tracking-tight text-foreground sm:text-3xl">
                  {item.title}
                </h1>

                {item.authors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {item.authors.map((author, index) => (
                        <span key={author.id}>
                          {index > 0 && ", "}
                          <span className="text-foreground/85">{author.displayName}</span>
                        </span>
                      ))}
                    </p>
                  </div>
                )}

                {item.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="   border border-primary/30 px-3 py-1 text-sm font-medium text-primary"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ size: "lg" })}
                    >
                      <Download className="size-4" />
                      {actorType === "reviewer" ? "Open manuscript PDF" : "Open submitted PDF"}
                      {item.pdfFile?.sizeBytes ? (
                        <span className="ml-1 text-xs opacity-70">
                          ({(item.pdfFile.sizeBytes / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      ) : null}
                    </a>
                  )}
                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      <ExternalLink className="size-3.5" />
                      External source
                    </a>
                  )}
                  {item.doi && (
                    <a
                      href={`https://doi.org/${item.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      <LinkIcon className="size-3.5" />
                      DOI: {item.doi}
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {submittedAt && <span>Submitted {submittedAt}</span>}
                  {submittedAt && item.publicationYear ? (
                    <span className="text-border">·</span>
                  ) : null}
                  <span>{item.publicationYear}</span>
                </div>
              </div>

              {pdfUrl && coverImageUrl && (
                <div className="w-full shrink-0 sm:w-56 lg:w-52 xl:w-60">
                  <ResearchThumbnail
                    fileUrl={pdfUrl}
                    coverImageUrl={coverImageUrl}
                    title={item.title}
                  />
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-border/60" />

            <div className="mt-8 flex flex-col gap-10 lg:flex-row">
              <div className="min-w-0 flex-1 space-y-10">
                <section id="abstract">
                  <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                    Abstract
                  </h2>
                  <p className="text-base leading-[1.85] text-foreground/85">
                    {item.abstract}
                  </p>
                </section>

                {(item.supervisorName || item.programName || item.license) && (
                  <section id="additional-details">
                    <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                      Additional details
                    </h2>
                    <div className="grid gap-3    border border-border/60 bg-card/50 p-5 sm:grid-cols-2 md:grid-cols-3">
                      {item.supervisorName && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Supervisor
                          </p>
                          <p className="text-base text-foreground">{item.supervisorName}</p>
                        </div>
                      )}
                      {item.programName && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Program
                          </p>
                          <p className="text-base text-foreground">{item.programName}</p>
                        </div>
                      )}
                      {item.license && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            License
                          </p>
                          <p className="text-base text-foreground">{item.license}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {item.references.length > 0 && (
                  <section id="references">
                    <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                      References ({item.references.length})
                    </h2>
                    <ol className="space-y-2.5">
                      {item.references.map((reference, index) => (
                        <li
                          key={`${index}-${reference.citationText}`}
                          className="flex items-baseline gap-2.5 text-base leading-relaxed text-foreground/85"
                        >
                          <span className="shrink-0 text-sm font-medium text-muted-foreground">
                            [{index + 1}]
                          </span>
                          <span>
                            {reference.citationText}
                            {reference.url && (
                              <>
                                {" "}
                                <a
                                  href={reference.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary/80"
                                >
                                  Link
                                </a>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <section id="about-this-submission">
                  <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
                    About this submission
                  </h2>
                  <div className="mb-6 border-b border-border/60" />
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                    {submittedAt && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Submitted
                        </p>
                        <p className="mt-1 text-base text-foreground">{submittedAt}</p>
                      </div>
                    )}
                    {publicationDate && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Requested publication date
                        </p>
                        <p className="mt-1 text-base text-foreground">{publicationDate}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Publication year
                      </p>
                      <p className="mt-1 text-base text-foreground">{item.publicationYear}</p>
                    </div>
                    {item.departmentName && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Department
                        </p>
                        <p className="mt-1 text-base text-foreground">{item.departmentName}</p>
                      </div>
                    )}
                    {showInternalDetails && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Workflow stage
                        </p>
                        <p className="mt-1 text-base text-foreground">{stageLabel}</p>
                      </div>
                    )}
                    {confirmationLabel && actorType !== "reviewer" && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Confirmation status
                        </p>
                        <p className="mt-1 text-base text-foreground">{confirmationLabel}</p>
                      </div>
                    )}
                    {showSubmitterIdentity && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Submitted by
                        </p>
                        <div className="mt-1 space-y-1 text-base text-foreground">
                          <p className="flex items-center gap-2">
                            <User className="size-4 text-muted-foreground" />
                            {isSubmitter ? "You" : item.submittedByName}
                          </p>
                          {!isSubmitter && showInternalDetails && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="size-4" />
                              {item.submittedByEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {showChangeSummary && item.changeSummary && (
                  <section className="   border border-border/60 bg-card/50 p-5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      Change summary
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-foreground/85">
                      {item.changeSummary}
                    </p>
                  </section>
                )}

                {showSubmitterNotes && item.notesToAdmin && (
                  <section className="   border border-border/60 bg-card/50 p-5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      Notes from submitter
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-foreground/85">
                      {item.notesToAdmin}
                    </p>
                  </section>
                )}

                {actorType === "submitter" && item.submitterConfirmationRequestedAt && (
                  <section className="   border border-primary/20 bg-primary/[0.03] p-5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      Publication confirmation
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Requested {formatDateTime(item.submitterConfirmationRequestedAt)}
                    </p>
                    {item.submitterConfirmationNote && (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                        {item.submitterConfirmationNote}
                      </p>
                    )}
                    <div className="mt-5    border border-border/60 bg-background p-5">
                      {canRespondConfirmation ? (
                        <SubmitterConfirmationForm researchItemId={item.id} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Your latest response is recorded as {confirmationLabel?.toLowerCase() ?? "updated"}.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {actorType === "admin" && versionDiff && (
                  <AdminVersionDiff
                    current={{
                      ...versionDiff.current,
                      files: versionDiff.current.files.map((file) => ({
                        ...file,
                        publicUrl: getPublicFileUrl(file.objectKey),
                      })),
                    }}
                    previous={{
                      ...versionDiff.previous,
                      files: versionDiff.previous.files.map((file) => ({
                        ...file,
                        publicUrl: getPublicFileUrl(file.objectKey),
                      })),
                    }}
                  />
                )}

                {actorType === "admin" && peerInvites.length > 0 && (
                  <PeerReviewSummary invites={peerInvites} />
                )}

                {actorType === "admin" && (
                  <section className="border-t border-border/60 pt-6">
                    <AdminReviewActions
                      researchItemId={item.id}
                      status={item.status}
                      workflowStage={item.workflowStage}
                      submitterConfirmationStatus={item.submitterConfirmationStatus}
                    />
                  </section>
                )}
              </div>

              <SubmissionSidebarNav
                sections={sections}
                references={item.references}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
