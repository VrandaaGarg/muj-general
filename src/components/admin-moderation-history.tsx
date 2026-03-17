"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  RotateCcw,
  XCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ModerationEntry {
  id: string;
  decision: "approved" | "changes_requested" | "archived";
  comment: string | null;
  createdAt: Date;
  researchItemId: string;
  researchTitle: string;
  researchSlug: string;
  reviewerName: string;
  reviewerEmail: string;
  departmentName: string | null;
}

interface AdminModerationHistoryProps {
  entries: ModerationEntry[];
}

const DECISION_CONFIG: Record<
  ModerationEntry["decision"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-emerald-600/10 text-emerald-600",
  },
  changes_requested: {
    label: "Changes Requested",
    icon: RotateCcw,
    className: "bg-amber-600/10 text-amber-600",
  },
  archived: {
    label: "Archived",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined,
  });
}

export function AdminModerationHistory({
  entries,
}: AdminModerationHistoryProps) {
  if (entries.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
            <Clock className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No moderation history</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Decisions will appear here once research items are reviewed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const approvedCount = entries.filter((e) => e.decision === "approved").length;
  const changesCount = entries.filter(
    (e) => e.decision === "changes_requested",
  ).length;
  const archivedCount = entries.filter((e) => e.decision === "archived").length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight text-emerald-600">
            {approvedCount}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground">
            Approved
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight text-amber-600">
            {changesCount}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground">
            Changes requested
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight text-destructive">
            {archivedCount}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground">
            Archived
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          All decisions ({entries.length})
        </h2>
        {entries.map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.3 }}
          >
            <HistoryCard entry={entry} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ entry }: { entry: ModerationEntry }) {
  const config = DECISION_CONFIG[entry.decision];
  const DecisionIcon = config.icon;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${config.className}`}
            >
              <DecisionIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold tracking-tight">
                <Link
                  href={`/research/${entry.researchSlug}`}
                  className="transition-colors hover:text-rose-600"
                >
                  {entry.researchTitle}
                </Link>
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-1.5 text-[10px]">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px font-medium ${config.className}`}
                >
                  {config.label}
                </span>
                <span className="text-border">|</span>
                <span>{entry.reviewerName}</span>
                {entry.departmentName && (
                  <>
                    <span className="text-border">|</span>
                    <span>{entry.departmentName}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>

          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
            {formatRelativeDate(entry.createdAt)}
          </span>
        </div>
      </CardHeader>

      {entry.comment && (
        <CardContent>
          <div className="flex gap-2 rounded-md bg-muted/40 px-3 py-2">
            <MessageSquare className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {entry.comment}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
