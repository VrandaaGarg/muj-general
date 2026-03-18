"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | ModerationEntry["decision"]>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(entries.map((entry) => entry.departmentName).filter((value): value is string => Boolean(value))),
      ).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const filteredEntries = useMemo(
    () =>
      entries
        .filter((entry) => {
          if (decisionFilter !== "all" && entry.decision !== decisionFilter) {
            return false;
          }

          if (departmentFilter !== "all" && entry.departmentName !== departmentFilter) {
            return false;
          }

          if (query.trim()) {
            const haystack = `${entry.researchTitle} ${entry.reviewerName} ${entry.reviewerEmail} ${entry.comment ?? ""}`.toLowerCase();
            if (!haystack.includes(query.trim().toLowerCase())) {
              return false;
            }
          }

          return true;
        })
        .sort((a, b) =>
          sortBy === "newest"
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [departmentFilter, decisionFilter, entries, query, sortBy],
  );

  function exportCsv() {
    const sanitizeCell = (value: string) => {
      const trimmed = value.trimStart();
      if (
        trimmed.startsWith("=") ||
        trimmed.startsWith("+") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("@")
      ) {
        return `'${value}`;
      }

      return value;
    };

    const rows = [
      ["date", "decision", "research_title", "reviewer", "reviewer_email", "department", "comment"],
      ...filteredEntries.map((entry) => [
        new Date(entry.createdAt).toISOString(),
        entry.decision,
        entry.researchTitle,
        entry.reviewerName,
        entry.reviewerEmail,
        entry.departmentName ?? "",
        entry.comment ?? "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const safeValue = sanitizeCell(String(value));
            return `"${safeValue.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `moderation-history-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

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

  const approvedCount = filteredEntries.filter((e) => e.decision === "approved").length;
  const changesCount = filteredEntries.filter(
    (e) => e.decision === "changes_requested",
  ).length;
  const archivedCount = filteredEntries.filter((e) => e.decision === "archived").length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <Card className="border-border/60">
        <CardContent className="grid gap-3  sm:grid-cols-2 lg:grid-cols-5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title/reviewer/comment"
            className="h-8"
          />
          <select
            value={decisionFilter}
            onChange={(event) =>
              setDecisionFilter(
                event.target.value as "all" | "approved" | "changes_requested" | "archived",
              )
            }
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All decisions</option>
            <option value="approved">Approved</option>
            <option value="changes_requested">Changes requested</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All departments</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "newest" | "oldest")}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </CardContent>
      </Card>

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
          All decisions ({filteredEntries.length})
        </h2>
        {filteredEntries.map((entry, idx) => (
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
                  href={`/admin/review/${entry.researchItemId}`}
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
