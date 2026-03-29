"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BookCheck,
  Building2,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Loader2,
  Lock,
  Mail,
  MessageSquareWarning,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  invitePeerReviewerAction,
  reviewDepartmentResearchSubmissionAction,
} from "@/lib/actions/research";
import { useLocalCache } from "@/hooks/use-local-cache";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DepartmentReviewItem {
  id: string;
  slug: string;
  title: string;
  itemType: string;
  workflowStage: string;
  status: string;
  submittedAt: Date;
  updatedAt: Date;
  submittedByUserId: string;
  submittedByName: string;
  submittedByEmail: string;
  departmentName: string | null;
  journalName: string | null;
  currentVersionId: string | null;
  notesToAdmin: string | null;
}

interface PeerInvite {
  id: string;
  researchItemId: string;
  status: string;
  inviteeEmail: string;
  inviteeName: string | null;
  recommendation: string | null;
  reviewComment: string | null;
  confidentialComment: string | null;
  createdAt: Date;
  reviewSubmittedAt: Date | null;
}

interface EditorDepartmentReviewListProps {
  items: DepartmentReviewItem[];
  peerInvitesMap?: Record<string, PeerInvite[]>;
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

const STAGE_CONFIG: Record<
  string,
  { label: string; className: string; icon: ReactNode }
> = {
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
  editor_revision_requested: {
    label: "Revision requested",
    className: "bg-orange-600/10 text-orange-600",
    icon: <MessageSquareWarning className="size-3" />,
  },
};

const REVIEW_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" | "info" }
> = {
  forwarded: {
    text: "Submission has been forwarded to admin for review.",
    type: "success",
  },
  "changes-requested": {
    text: "Changes have been requested from the submitter.",
    type: "info",
  },
  invalid: {
    text: "Invalid review data. Please try again.",
    type: "error",
  },
  empty: {
    text: "No items available for review.",
    type: "info",
  },
};

const PEER_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" | "info" }
> = {
  invited: {
    text: "Peer reviewer has been invited.",
    type: "success",
  },
  forbidden: {
    text: "You are not authorized to invite a peer reviewer for this item.",
    type: "error",
  },
  invalid: {
    text: "Invalid peer invite data.",
    type: "error",
  },
};

const INVITE_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-600/10 text-amber-600" },
  accepted: { label: "Accepted", className: "bg-blue-600/10 text-blue-600" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
  completed: { label: "Completed", className: "bg-emerald-600/10 text-emerald-600" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  revoked: { label: "Revoked", className: "bg-muted text-muted-foreground" },
};

const RECOMMENDATION_CONFIG: Record<
  string,
  { label: string; className: string; icon: ReactNode }
> = {
  accept: {
    label: "Accept",
    className: "bg-emerald-600/10 text-emerald-600",
    icon: <ThumbsUp className="size-3" />,
  },
  minor_revision: {
    label: "Minor Revision",
    className: "bg-blue-600/10 text-blue-600",
    icon: <FileText className="size-3" />,
  },
  major_revision: {
    label: "Major Revision",
    className: "bg-orange-600/10 text-orange-600",
    icon: <ShieldAlert className="size-3" />,
  },
  reject: {
    label: "Reject",
    className: "bg-red-600/10 text-red-600",
    icon: <ThumbsDown className="size-3" />,
  },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EditorDepartmentReviewList({
  items,
  peerInvitesMap,
}: EditorDepartmentReviewListProps) {
  const { data: cachedItems } = useLocalCache("editor-review-queue:items", items);
  const { data: cachedPeerInvitesMap } = useLocalCache(
    "editor-review-queue:peer-invites",
    peerInvitesMap ?? {},
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewParam = searchParams.get("review");
  const peerParam = searchParams.get("peer");
  const handledReviewParamRef = useRef<string | null>(null);
  const handledPeerParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (!reviewParam) return;
    if (handledReviewParamRef.current === reviewParam) return;

    handledReviewParamRef.current = reviewParam;
    const msg = REVIEW_MESSAGES[reviewParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else if (msg.type === "error") toast.error(msg.text);
    else toast.info(msg.text);
    router.replace("/editor", { scroll: false });
  }, [reviewParam, router]);

  useEffect(() => {
    if (!peerParam) return;
    if (handledPeerParamRef.current === peerParam) return;

    handledPeerParamRef.current = peerParam;
    const msg = PEER_MESSAGES[peerParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else if (msg.type === "error") toast.error(msg.text);
    else toast.info(msg.text);
    router.replace("/editor", { scroll: false });
  }, [peerParam, router]);

  const sorted = [...cachedItems].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          Department review queue
        </h2>
        {cachedItems.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-600/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            <Clock className="size-3" />
            {cachedItems.length} pending
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
              <BookCheck className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">All caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No department submissions awaiting your review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <DepartmentReviewCard
                item={item}
                peerInvites={cachedPeerInvitesMap[item.id]}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentReviewCard({
  item,
  peerInvites,
}: {
  item: DepartmentReviewItem;
  peerInvites?: PeerInvite[];
}) {
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const isBusy = isForwarding || isRequesting || isInviting;

  const stage = STAGE_CONFIG[item.workflowStage] ?? STAGE_CONFIG.submitted;

  async function handleForwardToAdmin() {
    setIsForwarding(true);
    const formData = new FormData();
    formData.set("researchItemId", item.id);
    formData.set("decision", "forward_to_admin");
    try {
      await reviewDepartmentResearchSubmissionAction(formData);
    } catch {
      setIsForwarding(false);
    }
  }

  async function handleRequestChanges(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const comment = formData.get("comment");

    if (typeof comment !== "string" || !comment.trim()) {
      return;
    }

    setIsRequesting(true);
    formData.set("researchItemId", item.id);
    formData.set("decision", "request_changes");
    try {
      await reviewDepartmentResearchSubmissionAction(formData);
    } catch {
      setIsRequesting(false);
    }
  }

  async function handleInvitePeer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsInviting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("researchItemId", item.id);
    try {
      await invitePeerReviewerAction(formData);
    } catch {
      setIsInviting(false);
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
              {item.departmentName && (
                <>
                  <span className="text-border">·</span>
                  <span>{item.departmentName}</span>
                </>
              )}
              {item.journalName && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-primary">{item.journalName}</span>
                </>
              )}
            </CardDescription>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${stage.className}`}
          >
            {stage.icon}
            {stage.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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
          <span className="text-muted-foreground/60">
            {formatDate(item.submittedAt)}
            {item.updatedAt > item.submittedAt &&
              ` · Updated ${formatDate(item.updatedAt)}`}
          </span>
        </div>

        {item.notesToAdmin && (
          <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <p className="mb-0.5 text-xs font-medium text-muted-foreground">
              Notes from submitter
            </p>
            <p className="text-sm text-foreground line-clamp-3">
              {item.notesToAdmin}
            </p>
          </div>
        )}

        {/* Existing peer invites */}
        {peerInvites && peerInvites.length > 0 && (
          <PeerInvitesList invites={peerInvites} />
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={`/submissions/${item.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Eye className="size-3.5" />
            Preview
          </Link>
          <Button
            size="sm"
            onClick={handleForwardToAdmin}
            disabled={isBusy}
          >
            {isForwarding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ArrowUpRight className="size-3.5" />
            )}
            {isForwarding ? "Forwarding..." : "Forward to Admin"}
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
              onClick={() => {
                setShowRequestChanges(false);
              }}
              disabled={isBusy}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInviteForm((prev) => !prev)}
            disabled={isBusy && !showInviteForm}
          >
            {showInviteForm ? (
              <X className="size-3.5" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            {showInviteForm ? "Close" : "Invite Reviewer"}
          </Button>
        </div>

        {showRequestChanges && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleRequestChanges} className="space-y-2 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor={`dept-comment-${item.id}`} className="text-xs">
                  Comment for the submitter{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`dept-comment-${item.id}`}
                  name="comment"
                  placeholder="Describe what needs to be changed..."
                  maxLength={1000}
                  rows={2}
                  disabled={isBusy}
                  required
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
                  <Send className="size-3.5" />
                )}
                {isRequesting ? "Sending..." : "Confirm request"}
              </Button>
            </form>
          </motion.div>
        )}

        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleInvitePeer} className="space-y-2 pt-1">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`peer-email-${item.id}`} className="text-xs">
                    Reviewer email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`peer-email-${item.id}`}
                    name="inviteeEmail"
                    type="email"
                    placeholder="reviewer@example.com"
                    required
                    disabled={isBusy}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`peer-name-${item.id}`} className="text-xs">
                    Reviewer name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id={`peer-name-${item.id}`}
                    name="inviteeName"
                    type="text"
                    placeholder="Dr. Jane Smith"
                    maxLength={200}
                    disabled={isBusy}
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isBusy}
              >
                {isInviting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                {isInviting ? "Sending invite..." : "Send invite"}
              </Button>
            </form>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function PeerInvitesList({ invites }: { invites: PeerInvite[] }) {
  const [expanded, setExpanded] = useState(true);

  const completedCount = invites.filter(
    (i) => i.status === "completed",
  ).length;
  const pendingCount = invites.filter(
    (i) => i.status === "pending" || i.status === "accepted",
  ).length;

  return (
    <div className="rounded-xl border border-border/60 bg-card/50">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <UserPlus className="size-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Peer Reviews
        </span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {invites.length}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {completedCount > 0 && (
            <span className="rounded-md bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              {completedCount} completed
            </span>
          )}
          {pendingCount > 0 && (
            <span className="rounded-md bg-amber-600/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              {pendingCount} awaiting
            </span>
          )}
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="border-t border-border/60 p-4"
        >
          <div className="space-y-3">
            {invites.map((invite) => (
              <PeerInviteCard key={invite.id} invite={invite} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PeerInviteCard({ invite }: { invite: PeerInvite }) {
  const statusCfg =
    INVITE_STATUS_CONFIG[invite.status] ?? INVITE_STATUS_CONFIG.pending;
  const recCfg = invite.recommendation
    ? (RECOMMENDATION_CONFIG[invite.recommendation] ?? null)
    : null;

  const hasReviewContent = invite.reviewComment || invite.confidentialComment;

  return (
    <div className="rounded-xl border border-border/50 bg-background p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {invite.inviteeName || invite.inviteeEmail}
            </p>
            {invite.inviteeName && (
              <p className="text-xs text-muted-foreground">
                {invite.inviteeEmail}
              </p>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusCfg.className}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {recCfg && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${recCfg.className}`}
          >
            {recCfg.icon}
            {recCfg.label}
          </span>
          {invite.reviewSubmittedAt && (
            <span className="text-xs text-muted-foreground">
              Submitted {formatDate(invite.reviewSubmittedAt)}
            </span>
          )}
        </div>
      )}

      {invite.reviewComment && (
        <div className="mt-3 rounded-lg border border-border/40 bg-muted/20 px-3.5 py-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Review feedback
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {invite.reviewComment}
          </p>
        </div>
      )}

      {invite.confidentialComment && (
        <div className="mt-3 rounded-lg border border-amber-600/20 bg-amber-600/5 px-3.5 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            <Lock className="size-2.5" />
            Confidential note for editor
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {invite.confidentialComment}
          </p>
        </div>
      )}

      {!hasReviewContent && !recCfg && invite.reviewSubmittedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          Reviewed {formatDate(invite.reviewSubmittedAt)}
        </p>
      )}
      {!hasReviewContent && !recCfg && !invite.reviewSubmittedAt && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2">
          <Clock className="size-3 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground/70">
            Awaiting review from this reviewer
          </p>
        </div>
      )}
    </div>
  );
}
