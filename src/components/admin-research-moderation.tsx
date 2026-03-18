"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookCheck,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Mail,
  MessageSquareWarning,
  User,
} from "lucide-react";

import { toast } from "sonner";

import { reviewResearchSubmissionAction } from "@/lib/actions/research";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PendingResearchItem {
  id: string;
  slug: string;
  title: string;
  itemType: string;
  publicationYear: number;
  createdAt: Date;
  updatedAt: Date;
  submittedByName: string;
  submittedByEmail: string;
  departmentName: string | null;
  notesToAdmin: string | null;
  currentVersionId: string | null;
}

interface AdminResearchModerationProps {
  items: PendingResearchItem[];
}

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

const MODERATION_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" | "info" }
> = {
  published: {
    text: "Research item has been published successfully.",
    type: "success",
  },
  "changes-requested": {
    text: "Changes have been requested from the editor.",
    type: "info",
  },
  archived: {
    text: "Research item has been archived.",
    type: "success",
  },
  invalid: {
    text: "Invalid moderation data. Please try again.",
    type: "error",
  },
  empty: {
    text: "No pending items to moderate.",
    type: "info",
  },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminResearchModeration({
  items,
}: AdminResearchModerationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moderationParam = searchParams.get("moderation");
  const handledModerationParamRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    if (!moderationParam) return;
    if (handledModerationParamRef.current === moderationParam) return;

    handledModerationParamRef.current = moderationParam;
    const msg = MODERATION_MESSAGES[moderationParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else if (msg.type === "error") toast.error(msg.text);
    else toast.info(msg.text);
    router.replace("/admin", { scroll: false });
  }, [moderationParam, router]);

  const departmentOptions = Array.from(
    new Set(items.map((item) => item.departmentName).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b));

  const typeOptions = Array.from(new Set(items.map((item) => item.itemType))).sort((a, b) =>
    a.localeCompare(b),
  );

  const yearOptions = Array.from(new Set(items.map((item) => item.publicationYear)))
    .sort((a, b) => b - a)
    .map((year) => String(year));

  const filteredItems = items
    .filter((item) => {
      if (departmentFilter !== "all" && item.departmentName !== departmentFilter) {
        return false;
      }

      if (typeFilter !== "all" && item.itemType !== typeFilter) {
        return false;
      }

      if (yearFilter !== "all" && String(item.publicationYear) !== yearFilter) {
        return false;
      }

      if (query.trim()) {
        const haystack = `${item.title} ${item.submittedByName} ${item.submittedByEmail}`.toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) =>
      sortBy === "newest"
        ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="grid gap-3  sm:grid-cols-2 lg:grid-cols-5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or submitter"
            className="h-8"
          />
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
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All types</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {TYPE_LABELS[option] ?? option}
              </option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All years</option>
            {yearOptions.map((option) => (
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
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          Research submissions
        </h2>
        {filteredItems.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-600/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            <Clock className="size-3" />
            {filteredItems.length} pending
          </span>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
              <BookCheck className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">All caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No research submissions awaiting review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <ModerationReviewCard item={item} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModerationReviewCard({ item }: { item: PendingResearchItem }) {
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const isBusy = isPublishing || isRequesting;

  async function handlePublish() {
    setIsPublishing(true);
    const formData = new FormData();
    formData.set("researchItemId", item.id);
    formData.set("decision", "publish");
    try {
      await reviewResearchSubmissionAction(formData);
    } catch {
      setIsPublishing(false);
    }
  }

  async function handleRequestChanges(formData: FormData) {
    setIsRequesting(true);
    formData.set("researchItemId", item.id);
    formData.set("decision", "request_changes");
    try {
      await reviewResearchSubmissionAction(formData);
    } catch {
      setIsRequesting(false);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold tracking-tight">
              {item.title}
            </CardTitle>
            <CardDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{TYPE_LABELS[item.itemType] ?? item.itemType}</span>
              <span className="text-border">·</span>
              <span>{item.publicationYear}</span>
            </CardDescription>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDate(item.createdAt)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Submitter info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
        </div>

        {/* Notes to admin */}
        {item.notesToAdmin && (
          <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <p className="mb-0.5 text-xs font-medium text-muted-foreground">
              Notes from editor
            </p>
            <p className="text-sm text-foreground">{item.notesToAdmin}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/admin/review/${item.id}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Eye className="size-3.5" />
            View Details
          </Link>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isBusy}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isPublishing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            {isPublishing ? "Publishing…" : "Publish"}
          </Button>
          {!showRequestChanges ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRequestChanges(true)}
              disabled={isBusy}
            >
              <MessageSquareWarning className="size-3.5" />
              Request changes
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRequestChanges(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Request changes form */}
        {showRequestChanges && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <form action={handleRequestChanges} className="space-y-2 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor={`comment-${item.id}`} className="text-xs">
                  Comment for the editor
                </Label>
                <Textarea
                  id={`comment-${item.id}`}
                  name="comment"
                  placeholder="Describe what needs to be changed…"
                  maxLength={1000}
                  rows={2}
                  disabled={isBusy}
                  className="text-sm"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isBusy}
              >
                {isRequesting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MessageSquareWarning className="size-3.5" />
                )}
                {isRequesting ? "Sending…" : "Confirm request"}
              </Button>
            </form>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
