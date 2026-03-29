import Image from "next/image";
import Link from "next/link";
import { BookCheck, Clock, FileText, MessageSquareWarning } from "lucide-react";

import { getTypeLabel } from "@/lib/research-types";
import { Card, CardContent } from "@/components/ui/card";

interface SubmissionItem {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  status: string;
  workflowStage: string;
  itemType: string;
  publicationYear: number;
  createdAt: Date;
  updatedAt: Date;
  departmentName: string | null;
  journalName: string | null;
  coverImageUrl: string | null;
  latestRevisionRequest: {
    requestedAt: Date;
    requestedByName: string | null;
    requestedByRole: string | null;
    comment: string | null;
    source: "editor" | "admin";
  } | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
    icon: FileText,
  },
  submitted: {
    label: "Submitted",
    className: "bg-primary/10 text-primary",
    icon: Clock,
  },
  editor_review: {
    label: "Editor review",
    className: "bg-primary/10 text-primary",
    icon: Clock,
  },
  peer_review: {
    label: "Peer review",
    className: "bg-primary/10 text-primary",
    icon: Clock,
  },
  editor_forwarded_to_admin: {
    label: "Admin review",
    className: "bg-primary/10 text-primary",
    icon: Clock,
  },
  awaiting_submitter_confirmation: {
    label: "Awaiting your confirmation",
    className: "bg-primary/15 text-primary",
    icon: MessageSquareWarning,
  },
  ready_to_publish: {
    label: "Ready to publish",
    className: "bg-emerald-600/10 text-emerald-600",
    icon: BookCheck,
  },
  changes_requested: {
    label: "Changes requested",
    className: "bg-primary/15 text-primary",
    icon: MessageSquareWarning,
  },
  editor_revision_requested: {
    label: "Revision requested",
    className: "bg-primary/15 text-primary",
    icon: MessageSquareWarning,
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-600/10 text-emerald-600",
    icon: BookCheck,
  },
  published: {
    label: "Published",
    className: "bg-emerald-600/10 text-emerald-600",
    icon: BookCheck,
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground",
    icon: FileText,
  },
  declined_by_submitter: {
    label: "Declined by submitter",
    className: "bg-muted text-muted-foreground",
    icon: FileText,
  },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateAbstract(text: string, maxLength = 180) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function truncateComment(text: string, maxLength = 220) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function getRevisionRequesterLabel(item: SubmissionItem) {
  const request = item.latestRevisionRequest;
  if (!request) return "Reviewer";

  if (request.requestedByRole === "admin") {
    return request.requestedByName ? `Admin ${request.requestedByName}` : "Admin";
  }

  if (request.requestedByRole === "editor") {
    return request.requestedByName ? `Editor ${request.requestedByName}` : "Editor";
  }

  return request.requestedByName ?? "Reviewer";
}

export function MySubmissionsList({ items }: { items: SubmissionItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No submissions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Submit your first manuscript from a journal page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status =
          STATUS_CONFIG[item.workflowStage] ??
          STATUS_CONFIG[item.status] ??
          STATUS_CONFIG.draft;
        const StatusIcon = status.icon;
        const canRevise =
          item.status === "draft" ||
          item.status === "changes_requested" ||
          item.workflowStage === "editor_revision_requested";
        const hasRevisionRequest =
          item.workflowStage === "editor_revision_requested" ||
          item.status === "changes_requested";
        const needsConfirmation =
          item.workflowStage === "awaiting_submitter_confirmation";

        return (
          <Card
            key={item.id}
            className={hasRevisionRequest ? "border-primary/30 bg-primary/5" : "border-border/60"}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {item.coverImageUrl ? (
                  <div className="relative hidden h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-border/50 sm:block">
                    <Image
                      src={item.coverImageUrl}
                      alt={item.title}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="hidden h-28 w-24 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 sm:flex">
                    <FileText className="size-6 text-muted-foreground/40" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {getTypeLabel(item.itemType)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                    >
                      <StatusIcon className="size-3" />
                      {status.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.publicationYear}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>

                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {truncateAbstract(item.abstract)}
                  </p>

                  {hasRevisionRequest && item.latestRevisionRequest && (
                    <div className="mt-3 rounded-xl border border-primary/20 bg-background/90 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                          <MessageSquareWarning className="size-3" />
                          Revision request
                        </span>
                        <span className="text-muted-foreground">
                          from {getRevisionRequesterLabel(item)}
                        </span>
                        <span className="text-muted-foreground">
                          on {formatDate(item.latestRevisionRequest.requestedAt)}
                        </span>
                      </div>
                      {item.latestRevisionRequest.comment && (
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                          {truncateComment(item.latestRevisionRequest.comment)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Updated {formatDate(item.updatedAt)}</span>
                    {item.journalName && <span>{item.journalName}</span>}
                    {item.departmentName && <span>{item.departmentName}</span>}
                    {canRevise && (
                      <Link
                        href={`/editor/${item.slug}/revise`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Update submission
                      </Link>
                    )}
                    {needsConfirmation && (
                      <Link
                        href={`/submissions/${item.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Submit final confirmation
                      </Link>
                    )}
                    {item.status === "published" && (
                      <Link
                        href={`/research/${item.slug}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Open published item
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
