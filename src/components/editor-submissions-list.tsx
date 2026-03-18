"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookCheck,
  Clock,
  Eye,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubmittedItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  itemType: string;
  publicationYear: number;
  createdAt: Date;
  updatedAt: Date;
  departmentName: string | null;
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
  changes_requested: {
    label: "Changes requested",
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

export function EditorSubmissionsList({ items }: EditorSubmissionsListProps) {
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
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
              <Send className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No submissions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use the form above to submit your first research item.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
            const needsRevision = item.status === "changes_requested";
            const isPublished = item.status === "published";
            const isDraft = item.status === "draft";
            const canWithdraw =
              item.status === "submitted" || item.status === "changes_requested";
            const isBusy = activeActionItemId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
              >
                <Card
                  className={`border-border/60 transition-colors ${
                    needsRevision
                      ? "border-orange-600/20 bg-orange-600/[0.02]"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-sm font-semibold tracking-tight">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>
                            {TYPE_LABELS[item.itemType] ?? item.itemType}
                          </span>
                          <span className="text-border">&middot;</span>
                          <span>{item.publicationYear}</span>
                          {item.departmentName && (
                            <>
                              <span className="text-border">&middot;</span>
                              <span>{item.departmentName}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] text-muted-foreground">
                        Submitted {formatDate(item.createdAt)}
                        {item.updatedAt > item.createdAt &&
                          ` · Updated ${formatDate(item.updatedAt)}`}
                      </p>

                      {/* Action links */}
                      <div className="flex shrink-0 items-center gap-2">
                        {needsRevision && (
                          <Link
                            href={`/editor/${item.slug}/revise`}
                            className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
                          >
                            <RefreshCw className="size-3" />
                            Revise
                            <ArrowRight className="size-2.5" />
                          </Link>
                        )}
                        {isDraft && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
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
                            className="h-6 rounded-md border-border/60 px-2 py-1 text-[10px] font-medium"
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
                            onClick={() => {
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
                            className="h-6 rounded-md border-border/60 px-2 py-1 text-[10px] font-medium"
                          >
                            <Undo2 className="size-3" />
                            Withdraw
                          </Button>
                        )}
                        {isPublished && (
                          <Link
                            href={`/research/${item.slug}`}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Eye className="size-3" />
                            View
                          </Link>
                        )}
                        {!needsRevision && !isPublished && (
                          <Link
                            href={`/editor/${item.slug}/revise`}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Eye className="size-3" />
                            {isDraft ? "Edit draft" : "Details"}
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
