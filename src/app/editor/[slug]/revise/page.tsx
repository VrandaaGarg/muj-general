import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  GitBranch,
  MessageSquareWarning,
  RefreshCw,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import {
  getOwnedResearchItemForRevision,
  listDepartments,
  listTags,
} from "@/lib/db/queries";
import { getTypeLabel } from "@/lib/research-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { EditorRevisionForm } from "@/components/editor-revision-form";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted", className: "bg-amber-600/10 text-amber-600" },
  changes_requested: {
    label: "Changes Requested",
    className: "bg-orange-600/10 text-orange-600",
  },
  approved: { label: "Approved", className: "bg-emerald-600/10 text-emerald-600" },
  published: { label: "Published", className: "bg-emerald-600/10 text-emerald-600" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

const DECISION_LABELS: Record<string, { label: string; className: string }> = {
  approved: {
    label: "Approved",
    className: "text-emerald-600",
  },
  changes_requested: {
    label: "Changes Requested",
    className: "text-orange-600",
  },
  archived: {
    label: "Archived",
    className: "text-muted-foreground",
  },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateInputValue(date: Date | null) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

interface RevisePageProps {
  params: Promise<{ slug: string }>;
}

export default async function RevisePage({ params }: RevisePageProps) {
  const { slug } = await params;

  const session = await requireRole(["editor", "admin"], {
    returnTo: `/editor/${slug}/revise`,
  });
  const { appUser } = session;

  const [item, departments, tags] = await Promise.all([
    getOwnedResearchItemForRevision({ slug, userId: appUser.id }),
    listDepartments(),
    listTags(),
  ]);

  if (!item) {
    notFound();
  }

  const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
  const latestDecision = item.decisions[0] ?? null;
  const canRevise = item.status === "changes_requested";

  return (
    <div className="relative min-h-screen bg-background">
      {/* Dot pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      />

      <SiteHeader accentColor="violet" role={appUser.role} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-24 md:px-12 md:pt-16">
        {/* Back link */}
        <Link
          href="/editor"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to editor
        </Link>

        {/* Title section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-600/10">
              <RefreshCw className="size-4 text-orange-600" />
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <h1 className="font-serif text-2xl tracking-tight md:text-3xl">
            {item.title}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span>{getTypeLabel(item.itemType)}</span>
            <span className="text-border">&middot;</span>
            <span>{item.publicationYear}</span>
            {item.departmentName && (
              <>
                <span className="text-border">&middot;</span>
                <span>{item.departmentName}</span>
              </>
            )}
          </p>
        </div>

        {/* Latest moderation feedback */}
        {latestDecision && (
          <Card className="mb-6 border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-orange-600/10">
                  <MessageSquareWarning className="size-4 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight">
                    Latest reviewer feedback
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <span
                      className={`font-medium ${DECISION_LABELS[latestDecision.decision]?.className ?? ""}`}
                    >
                      {DECISION_LABELS[latestDecision.decision]?.label ??
                        latestDecision.decision}
                    </span>
                    <span className="text-border">&middot;</span>
                    {formatDateTime(latestDecision.createdAt)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {latestDecision.comment && (
              <CardContent className="pt-0">
                <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {latestDecision.comment}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Version history + file info row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Version history */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                  <GitBranch className="size-3.5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xs font-semibold tracking-tight">
                  Version history
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {item.versions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No versions recorded.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {item.versions.map((version, idx) => (
                    <div
                      key={version.id}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs ${
                        idx === 0
                          ? "bg-muted/40 font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3 shrink-0" />v
                        {version.versionNumber}
                        {idx === 0 && (
                          <span className="rounded bg-violet-600/10 px-1.5 py-px text-[10px] font-medium text-violet-600">
                            current
                          </span>
                        )}
                      </span>
                      <span className="text-[10px]">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* File info */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                  <FileText className="size-3.5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xs font-semibold tracking-tight">
                  Current assets
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {item.pdfFile || item.coverImageFile ? (
                <div className="space-y-3">
                  {item.pdfFile && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        PDF
                      </p>
                      <p className="truncate text-xs font-medium">
                        {item.pdfFile.originalName}
                      </p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="size-3" />
                        {(item.pdfFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                  {item.coverImageFile && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Poster / thumbnail
                      </p>
                      <p className="truncate text-xs font-medium">
                        {item.coverImageFile.originalName}
                      </p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="size-3" />
                        {(item.coverImageFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No files attached to this version.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Moderation history (if more than 1 decision) */}
        {item.decisions.length > 1 && (
          <Card className="mb-8 border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold tracking-tight text-muted-foreground">
                Full review history
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {item.decisions.map((decision) => {
                  const config = DECISION_LABELS[decision.decision];
                  return (
                    <div
                      key={decision.id}
                      className="rounded-lg border border-border/40 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-medium ${config?.className ?? ""}`}
                        >
                          {config?.label ?? decision.decision}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(decision.createdAt)}
                        </span>
                      </div>
                      {decision.comment && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {decision.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revision form or status message */}
        {canRevise ? (
          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
            }
          >
            <EditorRevisionForm
              item={{
                slug: item.slug,
                title: item.title,
                abstract: item.abstract,
                itemType: item.itemType,
                publicationYear: item.publicationYear,
                departmentId: item.departmentId,
                license: item.license,
                externalUrl: item.externalUrl,
                doi: item.doi,
                publicationDate: toDateInputValue(item.publicationDate),
                changeSummary: item.changeSummary,
                notesToAdmin: item.notesToAdmin,
                supervisorName: item.supervisorName,
                programName: item.programName,
                authors: item.authors,
                tagIds: item.tagIds,
                references: item.references.map((r) => ({
                  citationText: r.citationText,
                  url: r.url ?? "",
                })),
                pdfFile: item.pdfFile,
                coverImageFile: item.coverImageFile,
              }}
              departments={departments}
              tags={tags}
            />
          </Suspense>
        ) : (
          <Card className="border-border/60">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {item.status === "submitted" ? (
                  <>
                    This item is currently{" "}
                    <span className="font-medium text-amber-600">
                      awaiting review
                    </span>
                    . You can revise it once the reviewer responds.
                  </>
                ) : item.status === "published" ? (
                  <>
                    This item has been{" "}
                    <span className="font-medium text-emerald-600">
                      published
                    </span>
                    . No further revisions are needed.
                  </>
                ) : (
                  <>
                    This item&apos;s current status is{" "}
                    <span className="font-medium">{statusConfig.label}</span>.
                    Revisions are only available when changes are requested.
                  </>
                )}
              </p>
              <Link
                href="/editor"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 transition-colors hover:text-violet-700"
              >
                <ArrowLeft className="size-3" />
                Return to editor
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
