"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Building2,
  Mail,
  User,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { reviewEditorAccessRequestAction } from "@/lib/actions/editor-access";
import { useLocalCache } from "@/hooks/use-local-cache";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PendingRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: Date;
  requestedByName: string;
  requestedByEmail: string;
  requestedByDepartmentName: string | null;
}

interface AdminPendingRequestsProps {
  requests: PendingRequest[];
  limit?: number;
  showAllHref?: string;
}

const TOAST_MESSAGES: Record<string, { text: string; type: "success" | "error" | "info" }> = {
  approved: { text: "Request approved — user promoted to editor.", type: "success" },
  rejected: { text: "Request rejected.", type: "info" },
  invalid: { text: "Invalid review data. Please try again.", type: "error" },
  "missing-reason": { text: "Please provide a reason when rejecting.", type: "error" },
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

export function AdminPendingRequests({
  requests,
  limit,
  showAllHref = "/admin/editor-requests",
}: AdminPendingRequestsProps) {
  const { data: cachedRequests } = useLocalCache(
    "admin-pending-requests:list",
    requests,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewParam = searchParams.get("review");

  useEffect(() => {
    if (!reviewParam) return;
    const msg = TOAST_MESSAGES[reviewParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else if (msg.type === "error") toast.error(msg.text);
    else toast.info(msg.text);
    router.replace("/admin", { scroll: false });
  }, [reviewParam, router]);

  const displayRequests = limit ? cachedRequests.slice(0, limit) : cachedRequests;
  const hasMore = limit ? cachedRequests.length > limit : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          Editor access requests
        </h2>
        {cachedRequests.length > 0 && (
          <span className="flex items-center gap-1.5    bg-amber-600/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
            <Clock className="size-3" />
            {cachedRequests.length} pending
          </span>
        )}
      </div>

      {displayRequests.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center   bg-muted">
              <CheckCircle2 className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">All caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No pending editor access requests to review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayRequests.map((request, idx) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <RequestReviewCard request={request} />
            </motion.div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="pt-1">
          <Link
            href={showAllHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Show all {cachedRequests.length} requests
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function RequestReviewCard({ request }: { request: PendingRequest }) {
  const [showReject, setShowReject] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const isBusy = isRejecting;

  async function handleReject(formData: FormData) {
    setIsRejecting(true);
    try {
      await reviewEditorAccessRequestAction(formData);
    } catch {
      setIsRejecting(false);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center   bg-amber-600/10">
              <User className="size-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold tracking-tight truncate">
                {request.requestedByName}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 truncate">
                <Mail className="size-3 shrink-0" />
                <span className="truncate">{request.requestedByEmail}</span>
              </CardDescription>
            </div>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDate(request.createdAt)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {request.requestedByDepartmentName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3" />
            {request.requestedByDepartmentName}
          </div>
        )}

        {request.message && (
          <div className="  border border-border/40 bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">
              Message
            </p>
            <p className="text-sm text-foreground">{request.message}</p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <form action={reviewEditorAccessRequestAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <input type="hidden" name="decision" value="approved" />
            <Button
              size="sm"
              type="submit"
              disabled={isBusy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="size-3.5" />
              Approve
            </Button>
          </form>
          {!showReject ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowReject(true)}
              disabled={isBusy}
            >
              <XCircle className="size-3.5" />
              Reject
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReject(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
          )}
        </div>

        {showReject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <form action={handleReject} className="space-y-2 pt-1">
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="decision" value="rejected" />
              <div className="space-y-1.5">
                <Label htmlFor={`rejection-${request.id}`} className="text-xs">
                  Reason for rejection{" "}
                  <span className="text-destructive font-normal">*</span>
                </Label>
                <Textarea
                  id={`rejection-${request.id}`}
                  name="rejectionReason"
                  placeholder="Please provide a reason..."
                  maxLength={500}
                  rows={2}
                  required
                  disabled={isBusy}
                  className="text-sm"
                />
              </div>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isBusy}
              >
                {isRejecting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {isRejecting ? "Rejecting..." : "Confirm rejection"}
              </Button>
            </form>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
