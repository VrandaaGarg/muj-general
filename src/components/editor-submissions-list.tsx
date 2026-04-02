"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  BookCheck,
  Clock,
  FileText,
  MessageSquareWarning,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { manageEditorResearchItemAction } from "@/lib/actions/research";
import { useLocalCache } from "@/hooks/use-local-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubmittedItem {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  status: string;
  workflowStage?: string;
  itemType: string;
  publicationYear: number;
  createdAt: Date;
  updatedAt: Date;
  departmentName: string | null;
  journalName: string | null;
  coverImageUrl: string | null;
}

interface EditorSubmissionsListProps {
  items: SubmittedItem[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
    icon: <Pencil className="size-3" />,
  },
  submitted: {
    label: "Submitted",
    className: "bg-amber-600/10 text-amber-600",
    icon: <Clock className="size-3" />,
  },
  editor_review: {
    label: "Editor review",
    className: "bg-amber-600/10 text-amber-600",
    icon: <Clock className="size-3" />,
  },
  peer_review: {
    label: "Peer review",
    className: "bg-amber-600/10 text-amber-600",
    icon: <Clock className="size-3" />,
  },
  editor_forwarded_to_admin: {
    label: "Admin review",
    className: "bg-amber-600/10 text-amber-600",
    icon: <Clock className="size-3" />,
  },
  awaiting_submitter_confirmation: {
    label: "Awaiting confirmation",
    className: "bg-orange-600/10 text-orange-600",
    icon: <Clock className="size-3" />,
  },
  ready_to_publish: {
    label: "Ready to publish",
    className: "bg-emerald-600/10 text-emerald-600",
    icon: <BookCheck className="size-3" />,
  },
  changes_requested: {
    label: "Changes requested",
    className: "bg-orange-600/10 text-orange-600",
    icon: <MessageSquareWarning className="size-3" />,
  },
  editor_revision_requested: {
    label: "Revision requested",
    className: "bg-orange-600/10 text-orange-600",
    icon: <MessageSquareWarning className="size-3" />,
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-600/10 text-emerald-600",
    icon: <BookCheck className="size-3" />,
  },
  published: {
    label: "Published",
    className: "bg-emerald-600/10 text-emerald-600",
    icon: <BookCheck className="size-3" />,
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground",
    icon: <FileText className="size-3" />,
  },
  declined_by_submitter: {
    label: "Declined by submitter",
    className: "bg-muted text-muted-foreground",
    icon: <FileText className="size-3" />,
  },
};

const TYPE_LABELS: Record<string, string> = {
  research_paper: "Research Paper",
  journal_article: "Journal Article",
  conference_paper: "Conference Paper",
  thesis: "Thesis",
  dissertation: "Dissertation",
  capstone_project: "Capstone Project",
  technical_report: "Technical Report",
  patent: "Patent",
  poster: "Poster",
  dataset: "Dataset",
  presentation: "Presentation",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateAbstract(text: string, maxLength = 160) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

function getCardHref(item: SubmittedItem) {
  if (item.status === "published") return `/research/${item.slug}`;
  return `/editor/${item.slug}/revise`;
}

export function EditorSubmissionsList({ items }: EditorSubmissionsListProps) {
  const { data: cachedItems } = useLocalCache("editor-submissions:list", items);
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemParam = searchParams.get("item");
  const [activeActionItemId, setActiveActionItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!itemParam) return;

    const itemMessages: Record<string, { text: string; type: "success" | "error" }> = {
      withdrawn: {
        text: "Submission withdrawn successfully.",
        type: "success",
      },
      "draft-deleted": {
        text: "Draft deleted successfully.",
        type: "success",
      },
      invalid: {
        text: "That action is not allowed for this item.",
        type: "error",
      },
      missing: {
        text: "Research item not found.",
        type: "error",
      },
    };

    const message = itemMessages[itemParam];
    if (!message) return;

    if (message.type === "success") toast.success(message.text);
    else toast.error(message.text);

    router.replace("/editor", { scroll: false });
  }, [itemParam, router]);

  async function runItemAction(
    itemId: string,
    action: "delete_draft" | "withdraw",
    reason?: string,
  ) {
    setActiveActionItemId(itemId);
    const formData = new FormData();
    formData.set("researchItemId", itemId);
    formData.set("action", action);
    if (reason) {
      formData.set("reason", reason);
    }

    try {
      await manageEditorResearchItemAction(formData);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      toast.error("Action failed. Please try again.");
      setActiveActionItemId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          Your submissions
        </h2>
        {cachedItems.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {cachedItems.length} item{cachedItems.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {cachedItems.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center   bg-muted">
              <Send className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No submissions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use the form above to submit your first research item.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cachedItems.map((item, idx) => {
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
            const workflowStatus = item.workflowStage
              ? STATUS_CONFIG[item.workflowStage] ?? status
              : status;
            const needsRevision =
              item.status === "changes_requested" ||
              item.workflowStage === "editor_revision_requested";
            const isDraft = item.status === "draft";
            const canWithdraw =
              item.workflowStage === "submitted" ||
              item.workflowStage === "editor_revision_requested" ||
              item.status === "submitted" ||
              item.status === "changes_requested";
            const isBusy = activeActionItemId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
              >
                <Link href={getCardHref(item)} className="block group">
                  <Card
                    className={`border-border/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.01] ${
                      needsRevision
                        ? "border-orange-600/20 bg-orange-600/[0.02]"
                        : ""
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="flex gap-0">
                        {/* Cover image */}
                        {item.coverImageUrl ? (
                          <div className="relative hidden ml-4 w-36 shrink-0   overflow-hidden sm:block md:w-44">
                            <Image
                              src={item.coverImageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="176px"
                            />
                          </div>
                        ) : (
                          <div className="relative hidden w-36 shrink-0 items-center justify-center overflow-hidden bg-muted/40 sm:flex md:w-44">
                            <FileText className="size-8 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-5">
                          <div>
                            {/* Top row: type + status */}
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-primary">
                                {TYPE_LABELS[item.itemType] ?? item.itemType}
                              </span>
                              <span className="text-border">·</span>
                              <span className="text-xs text-muted-foreground">
                                {item.publicationYear}
                              </span>
                              {item.departmentName && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.departmentName}
                                  </span>
                                </>
                              )}
                              <span
                                className={`ml-auto flex shrink-0 items-center gap-1    px-2 py-0.5 text-[10px] font-medium ${workflowStatus.className}`}
                              >
                                {workflowStatus.icon}
                                {workflowStatus.label}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary group-hover:underline transition-colors line-clamp-2">
                              {item.title}
                            </h3>

                            {/* Abstract */}
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                              {truncateAbstract(item.abstract)}
                            </p>
                          </div>

                          {/* Bottom row: dates + actions */}
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.createdAt)}
                              {item.updatedAt > item.createdAt &&
                                ` · Updated ${formatDate(item.updatedAt)}`}
                            </p>

                            <div
                              className="flex shrink-0 items-center gap-2"
                              onClick={(e) => e.preventDefault()}
                            >
                              {needsRevision && (
                                <Link
                                  href={`/editor/${item.slug}/revise`}
                                  className="inline-flex items-center gap-1     bg-orange-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
                                >
                                  <RefreshCw className="size-3" />
                                  Revise
                                </Link>
                              )}
                              {isDraft && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (
                                      !window.confirm(
                                        "Delete this draft permanently? This cannot be undone.",
                                      )
                                    ) {
                                      return;
                                    }
                                    void runItemAction(item.id, "delete_draft");
                                  }}
                                  disabled={isBusy}
                                  className="h-6     border-border/60 px-2 py-1 text-[10px] font-medium"
                                >
                                  <Trash2 className="size-3" />
                                  Delete
                                </Button>
                              )}
                              {canWithdraw && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (
                                      !window.confirm(
                                        "Withdraw this submission from review? It will move to archived status.",
                                      )
                                    ) {
                                      return;
                                    }
                                    void runItemAction(
                                      item.id,
                                      "withdraw",
                                      "Withdrawn by editor from workspace",
                                    );
                                  }}
                                  disabled={isBusy}
                                  className="h-6     border-border/60 px-2 py-1 text-[10px] font-medium"
                                >
                                  <Undo2 className="size-3" />
                                  Withdraw
                                </Button>
                              )}
                              {item.journalName && (
                                <span className="   bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  {item.journalName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
