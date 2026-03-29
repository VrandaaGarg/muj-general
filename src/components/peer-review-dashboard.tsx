"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  respondPeerReviewInviteAction,
  submitPeerReviewAction,
} from "@/lib/actions/research";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PeerReviewInvite {
  id: string;
  status: string;
  researchItemId: string;
  researchSlug: string;
  researchTitle: string;
  invitedAt: Date;
  respondedAt: Date | null;
  recommendation: string | null;
  reviewComment: string | null;
  invitedByName: string | null;
  invitedByEmail: string | null;
}

interface PeerReviewDashboardProps {
  invites: PeerReviewInvite[];
}

const PEER_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" | "info" }
> = {
  invited: {
    text: "You have been invited to review a submission.",
    type: "info",
  },
  accepted: {
    text: "You accepted the peer review invitation.",
    type: "success",
  },
  declined: {
    text: "You declined the peer review invitation.",
    type: "info",
  },
  submitted: {
    text: "Your peer review has been submitted.",
    type: "success",
  },
  invalid: {
    text: "Invalid peer review data. Please try again.",
    type: "error",
  },
  forbidden: {
    text: "You are not authorized to perform this action.",
    type: "error",
  },
};

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  accept: { label: "Accept", color: "text-emerald-600" },
  minor_revision: { label: "Minor Revision", color: "text-amber-600" },
  major_revision: { label: "Major Revision", color: "text-orange-600" },
  reject: { label: "Reject", color: "text-destructive" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-600/10 text-amber-600" },
  accepted: { label: "Accepted", className: "bg-blue-600/10 text-blue-600" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
  completed: { label: "Review Submitted", className: "bg-emerald-600/10 text-emerald-600" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  revoked: { label: "Revoked", className: "bg-muted text-muted-foreground" },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PeerReviewDashboard({ invites }: PeerReviewDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const peerParam = searchParams.get("peer");
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!peerParam) return;
    if (handledRef.current === peerParam) return;

    handledRef.current = peerParam;
    const msg = PEER_MESSAGES[peerParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else if (msg.type === "error") toast.error(msg.text);
    else toast.info(msg.text);
    router.replace("/reviews", { scroll: false });
  }, [peerParam, router]);

  const pending = invites.filter((i) => i.status === "pending");
  const accepted = invites.filter((i) => i.status === "accepted");
  const completed = invites.filter((i) => i.status === "completed");
  const other = invites.filter(
    (i) => !["pending", "accepted", "completed"].includes(i.status),
  );

  if (invites.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No peer review invitations</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You&apos;ll see invitations here when an editor asks you to review a
            submission.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending invites */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-muted-foreground">
            <Clock className="size-3.5" />
            Awaiting your response ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((invite, idx) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <PendingInviteCard invite={invite} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Accepted — needs review submission */}
      {accepted.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-muted-foreground">
            <FileText className="size-3.5" />
            Reviews to submit ({accepted.length})
          </h2>
          <div className="space-y-3">
            {accepted.map((invite, idx) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <AcceptedInviteCard invite={invite} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-muted-foreground">
            <CheckCircle2 className="size-3.5" />
            Completed reviews ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((invite, idx) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <CompletedInviteCard invite={invite} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Declined / expired / revoked */}
      {other.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
            Other ({other.length})
          </h2>
          <div className="space-y-3">
            {other.map((invite) => (
              <InviteSummaryCard key={invite.id} invite={invite} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PendingInviteCard({ invite }: { invite: PeerReviewInvite }) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const isBusy = isAccepting || isDeclining;

  async function handleRespond(decision: "accepted" | "declined") {
    if (decision === "accepted") setIsAccepting(true);
    else setIsDeclining(true);

    const formData = new FormData();
    formData.set("inviteId", invite.id);
    formData.set("decision", decision);
    try {
      await respondPeerReviewInviteAction(formData);
    } catch {
      setIsAccepting(false);
      setIsDeclining(false);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">
          {invite.researchTitle}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {invite.invitedByName && (
            <span>Invited by {invite.invitedByName}</span>
          )}
          <span className="text-border">·</span>
          <span>{formatDate(invite.invitedAt)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/research/${invite.researchSlug}`}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
            View submission
          </Link>
          <Button
            size="sm"
            onClick={() => handleRespond("accepted")}
            disabled={isBusy}
          >
            {isAccepting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ThumbsUp className="size-3.5" />
            )}
            {isAccepting ? "Accepting..." : "Accept"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRespond("declined")}
            disabled={isBusy}
          >
            {isDeclining ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ThumbsDown className="size-3.5" />
            )}
            {isDeclining ? "Declining..." : "Decline"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AcceptedInviteCard({ invite }: { invite: PeerReviewInvite }) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("inviteId", invite.id);
    try {
      await submitPeerReviewAction(formData);
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-blue-600/20 bg-blue-600/[0.02]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              {invite.researchTitle}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {invite.invitedByName && (
                <span>Invited by {invite.invitedByName}</span>
              )}
              <span className="text-border">·</span>
              <span>Accepted {invite.respondedAt ? formatDate(invite.respondedAt) : ""}</span>
            </CardDescription>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            <Check className="size-2.5" />
            Accepted
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/research/${invite.researchSlug}`}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
            View submission
          </Link>
          <Button
            size="sm"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? (
              <X className="size-3.5" />
            ) : (
              <Send className="size-3.5" />
            )}
            {showForm ? "Close form" : "Write review"}
          </Button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmitReview}
              className="space-y-3 rounded-lg border border-border/40 bg-background p-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`rec-${invite.id}`} className="text-xs">
                  Recommendation <span className="text-destructive">*</span>
                </Label>
                <select
                  id={`rec-${invite.id}`}
                  name="recommendation"
                  required
                  disabled={isSubmitting}
                  className="h-8 w-full rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <option value="">Select recommendation...</option>
                  <option value="accept">Accept</option>
                  <option value="minor_revision">Minor Revision</option>
                  <option value="major_revision">Major Revision</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`comment-${invite.id}`} className="text-xs">
                  Review comments <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`comment-${invite.id}`}
                  name="reviewComment"
                  placeholder="Provide detailed feedback on the submission..."
                  rows={4}
                  required
                  minLength={10}
                  maxLength={4000}
                  disabled={isSubmitting}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`conf-${invite.id}`} className="text-xs">
                  Confidential notes to editor{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id={`conf-${invite.id}`}
                  name="confidentialComment"
                  placeholder="Private notes visible only to editors/admins..."
                  rows={2}
                  maxLength={4000}
                  disabled={isSubmitting}
                  className="text-sm"
                />
              </div>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {isSubmitting ? "Submitting..." : "Submit review"}
              </Button>
            </form>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function CompletedInviteCard({ invite }: { invite: PeerReviewInvite }) {
  const recMeta = invite.recommendation
    ? RECOMMENDATION_LABELS[invite.recommendation]
    : null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              {invite.researchTitle}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {invite.invitedByName && (
                <span>Invited by {invite.invitedByName}</span>
              )}
              <span className="text-border">·</span>
              <span>{formatDate(invite.invitedAt)}</span>
            </CardDescription>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
            <CheckCircle2 className="size-2.5" />
            Completed
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recMeta && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Your recommendation:
            </span>
            <span className={`text-xs font-semibold ${recMeta.color}`}>
              {recMeta.label}
            </span>
          </div>
        )}
        {invite.reviewComment && (
          <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <p className="mb-0.5 text-xs font-medium text-muted-foreground">
              Your review
            </p>
            <p className="text-sm text-foreground line-clamp-4">
              {invite.reviewComment}
            </p>
          </div>
        )}
        <Link
          href={`/research/${invite.researchSlug}`}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          View submission
        </Link>
      </CardContent>
    </Card>
  );
}

function InviteSummaryCard({ invite }: { invite: PeerReviewInvite }) {
  const statusCfg = STATUS_CONFIG[invite.status] ?? STATUS_CONFIG.pending;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              {invite.researchTitle}
            </CardTitle>
            <CardDescription>
              {formatDate(invite.invitedAt)}
            </CardDescription>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>
        </div>
      </CardHeader>
    </Card>
  );
}
