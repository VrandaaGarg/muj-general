"use client";

import { motion } from "framer-motion";
import {
  BookCheck,
  Clock,
  FileText,
  MessageSquareWarning,
  Pencil,
  Send,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
              >
                <Card className="border-border/60">
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
                          <span className="text-border">·</span>
                          <span>{item.publicationYear}</span>
                          {item.departmentName && (
                            <>
                              <span className="text-border">·</span>
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
                    <p className="text-[10px] text-muted-foreground">
                      Submitted {formatDate(item.createdAt)}
                      {item.updatedAt > item.createdAt &&
                        ` · Updated ${formatDate(item.updatedAt)}`}
                    </p>
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
