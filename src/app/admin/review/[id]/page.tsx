import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  LinkIcon,
  Mail,
  ScrollText,
  Tag,
  User,
  UserPlus,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import {
  getResearchItemForAdminReview,
  getResearchItemVersionDiff,
  listPeerReviewInvitesForResearchItem,
} from "@/lib/db/queries";
import { getPublicFileUrl } from "@/lib/storage/r2";
import { getTypeLabel, getTypeColor } from "@/lib/research-types";
import { SiteHeader } from "@/components/site-header";
import { AdminReviewActions } from "@/components/admin-review-actions";
import { AdminVersionDiff } from "@/components/admin-version-diff";

interface AdminReviewPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AdminReviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getResearchItemForAdminReview(id);
  if (!item) return { title: "Not Found — Admin Review" };
  return { title: `Review: ${item.title} — Admin` };
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStageLabel(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminReviewPage({
  params,
}: AdminReviewPageProps) {
  await requireRole(["admin"], {
    returnTo: "/admin",
    unauthorizedRedirectTo: "/settings",
  });

  const { id } = await params;
  const [item, versionDiff, peerInvites] = await Promise.all([
    getResearchItemForAdminReview(id),
    getResearchItemVersionDiff(id),
    listPeerReviewInvitesForResearchItem({ researchItemId: id }),
  ]);

  if (!item) notFound();

  const fileUrl = item.pdfFile ? getPublicFileUrl(item.pdfFile.objectKey) : null;
  const coverImageUrl = item.coverImageFile
    ? getPublicFileUrl(item.coverImageFile.objectKey)
    : null;

  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-6 pb-20 md:px-12">
        {/* Back link */}
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to admin
        </Link>

        {/* Status badge + date */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getTypeColor(item.itemType)}`}>
            {getTypeLabel(item.itemType)}
          </span>
          <span className="rounded-full bg-amber-600/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
            {formatStageLabel(item.workflowStage ?? item.status)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Submitted {formatDate(item.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-2 font-sans text-2xl leading-tight tracking-tight text-foreground sm:text-3xl">
          {item.title}
        </h1>

        {/* Submitter info */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="size-3" />
            {item.submittedByName}
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="size-3" />
            {item.submittedByEmail}
          </span>
          {item.departmentName && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3" />
              {item.departmentName}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3" />
            {item.publicationYear}
          </span>
        </div>

        <div className="space-y-6">
          {/* Abstract + Thumbnail two-column layout */}
          <div className="flex flex-col-reverse gap-6 lg:flex-row lg:items-start">
            {/* Abstract — left */}
            <div className="min-w-0 flex-1">
              <DetailSection icon={FileText} label="Abstract">
                <p className="text-sm leading-[1.8] text-foreground/85">{item.abstract}</p>
              </DetailSection>
            </div>

            {/* Thumbnail — right, clickable to open PDF */}
            {coverImageUrl && (
              <a
                href={fileUrl ?? coverImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative shrink-0 self-center overflow-hidden rounded-xl border border-border/60 transition-shadow hover:shadow-lg lg:self-start lg:w-56 xl:w-64"
                title="Click to view PDF"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt={`Cover for ${item.title}`}
                  className="aspect-3/4 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-3 py-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex items-center justify-center gap-1.5 text-xs font-medium text-white">
                    <FileText className="size-3.5" />
                    {item.pdfFile ? "View PDF" : "View Image"}
                  </span>
                </div>
              </a>
            )}
          </div>

          {/* Authors */}
          {item.authors.length > 0 && (
            <DetailSection icon={Users} label="Authors">
              <div className="space-y-2">
                {item.authors.map((author) => (
                  <div key={author.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                    <span className="font-medium">{author.displayName}</span>
                    {author.isCorresponding && (
                      <span className="rounded bg-amber-600/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Corresponding</span>
                    )}
                    {author.email && <span className="text-xs text-muted-foreground">{author.email}</span>}
                    {author.affiliation && <span className="text-xs text-muted-foreground">· {author.affiliation}</span>}
                    {author.orcid && <span className="font-mono text-[10px] text-muted-foreground">ORCID: {author.orcid}</span>}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
          {/* Tags */}
          {item.tags.length > 0 && (
            <DetailSection icon={Tag} label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag.id} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {tag.name}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Additional metadata */}
          {(item.doi || item.externalUrl || item.license || item.supervisorName || item.programName || item.publicationDate) && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Details</h3>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {item.doi && (
                  <div className="flex items-start gap-2">
                    <ScrollText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-[10px] uppercase text-muted-foreground">DOI</p><p className="font-mono text-xs">{item.doi}</p></div>
                  </div>
                )}
                {item.externalUrl && (
                  <div className="flex items-start gap-2">
                    <Globe className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">External URL</p>
                      <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
                        {new URL(item.externalUrl).hostname} <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                )}
                {item.license && (
                  <div className="flex items-start gap-2">
                    <ScrollText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-[10px] uppercase text-muted-foreground">License</p><p className="text-xs">{item.license}</p></div>
                  </div>
                )}
                {item.supervisorName && (
                  <div className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-[10px] uppercase text-muted-foreground">Supervisor</p><p className="text-xs">{item.supervisorName}</p></div>
                  </div>
                )}
                {item.programName && (
                  <div className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-[10px] uppercase text-muted-foreground">Program</p><p className="text-xs">{item.programName}</p></div>
                  </div>
                )}
                {item.publicationDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-[10px] uppercase text-muted-foreground">Publication Date</p><p className="text-xs">{formatDate(item.publicationDate)}</p></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes to admin */}
          {item.notesToAdmin && (
            <div className="rounded-xl border border-amber-600/20 bg-amber-600/5 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Notes from Editor</h3>
              <p className="text-sm leading-relaxed text-foreground/85">{item.notesToAdmin}</p>
            </div>
          )}

          {/* References */}
          {item.references.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="size-3.5" />
                References ({item.references.length})
              </h3>
              <ol className="space-y-2">
                {item.references.map((ref, index) => (
                  <li
                    key={index}
                    className="flex items-baseline gap-2 text-sm leading-relaxed text-foreground/85"
                  >
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      [{index + 1}]
                    </span>
                    <span>
                      {ref.citationText}
                      {ref.url && (
                        <>
                          {" "}
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs text-violet-600 underline decoration-violet-600/30 underline-offset-2 hover:text-violet-700"
                          >
                            <LinkIcon className="size-2.5" />
                            Link
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Change summary (standalone, only shown when no diff available) */}
          {item.changeSummary && !versionDiff && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change Summary (v{item.versionNumber})</h3>
              <p className="text-sm leading-relaxed text-foreground/85">{item.changeSummary}</p>
            </div>
          )}

          {/* Version diff — only on resubmissions */}
          {versionDiff && (
            <AdminVersionDiff
              current={{
                ...versionDiff.current,
                files: versionDiff.current.files.map((f) => ({
                  ...f,
                  publicUrl: getPublicFileUrl(f.objectKey),
                })),
              }}
              previous={{
                ...versionDiff.previous,
                files: versionDiff.previous.files.map((f) => ({
                  ...f,
                  publicUrl: getPublicFileUrl(f.objectKey),
                })),
              }}
            />
          )}

          {/* Peer reviews */}
          {peerInvites.length > 0 && (
            <PeerReviewSummary invites={peerInvites} />
          )}

          {/* Moderation actions */}
          <div className="border-t border-border/60 pt-6">
            <AdminReviewActions
              researchItemId={item.id}
              status={item.status}
              workflowStage={item.workflowStage}
              submitterConfirmationStatus={item.submitterConfirmationStatus}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </h2>
      {children}
    </div>
  );
}

const PEER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-600/10 text-amber-600" },
  accepted: { label: "Accepted", className: "bg-blue-600/10 text-blue-600" },
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
    <div className="rounded-xl border border-border/60 bg-card/50 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <UserPlus className="size-3.5" />
        Peer Reviews ({invites.length})
      </h3>
      <div className="space-y-3">
        {invites.map((invite) => {
          const statusCfg =
            PEER_STATUS_CONFIG[invite.status] ?? PEER_STATUS_CONFIG.pending;
          return (
            <div
              key={invite.id}
              className="rounded-lg border border-border/40 bg-background px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">
                  {invite.inviteeName || invite.inviteeEmail}
                </span>
                {invite.inviteeName && (
                  <span className="text-xs text-muted-foreground">
                    {invite.inviteeEmail}
                  </span>
                )}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.className}`}
                >
                  {statusCfg.label}
                </span>
                {invite.recommendation && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                    <Check className="size-3" />
                    {PEER_REC_LABELS[invite.recommendation] ??
                      invite.recommendation}
                  </span>
                )}
              </div>
              {invite.reviewSubmittedAt && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Reviewed {formatDate(invite.reviewSubmittedAt)}
                </p>
              )}
              {invite.reviewComment && (
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/85 line-clamp-3">
                  {invite.reviewComment}
                </p>
              )}
              {invite.confidentialComment && (
                <div className="mt-2 rounded border border-amber-600/20 bg-amber-600/5 px-2.5 py-1.5">
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
    </div>
  );
}

