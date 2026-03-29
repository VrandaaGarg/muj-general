"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { reviewResearchSubmissionAction } from "@/lib/actions/research";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AdminReviewActionsProps {
  researchItemId: string;
  status: string;
  workflowStage?: string;
  submitterConfirmationStatus?: string;
}

export function AdminReviewActions({
  researchItemId,
  status,
  workflowStage,
  submitterConfirmationStatus,
}: AdminReviewActionsProps) {
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [showConfirmationRequest, setShowConfirmationRequest] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRequestingConfirmation, setIsRequestingConfirmation] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const isBusy = isPublishing || isRequesting || isRequestingConfirmation || isArchiving;
  const isPublished = status === "published";
  const canPublish =
    workflowStage === "ready_to_publish" &&
    submitterConfirmationStatus === "confirmed";

  async function handlePublish() {
    setIsPublishing(true);
    const formData = new FormData();
    formData.set("researchItemId", researchItemId);
    formData.set("decision", "publish");
    try {
      await reviewResearchSubmissionAction(formData);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      toast.error("Failed to publish. Please try again.");
      setIsPublishing(false);
    }
  }

  async function handleRequestChanges(formData: FormData) {
    setIsRequesting(true);
    formData.set("researchItemId", researchItemId);
    formData.set("decision", "request_changes");
    try {
      await reviewResearchSubmissionAction(formData);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      toast.error("Failed to request changes. Please try again.");
      setIsRequesting(false);
    }
  }

  async function handleArchive(formData: FormData) {
    setIsArchiving(true);
    formData.set("researchItemId", researchItemId);
    formData.set("decision", "archive");
    try {
      await reviewResearchSubmissionAction(formData);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      toast.error("Failed to archive item. Please try again.");
      setIsArchiving(false);
    }
  }

  async function handleRequestConfirmation(formData: FormData) {
    setIsRequestingConfirmation(true);
    formData.set("researchItemId", researchItemId);
    formData.set("decision", "request_submitter_confirmation");
    try {
      await reviewResearchSubmissionAction(formData);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      toast.error("Failed to request confirmation. Please try again.");
      setIsRequestingConfirmation(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Moderation Actions
      </h3>

      {!isPublished ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isBusy || !canPublish}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isPublishing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {isPublishing ? "Publishing…" : "Approve & Publish"}
            </Button>

            {!showConfirmationRequest ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowConfirmationRequest(true);
                  setShowRequestChanges(false);
                }}
                disabled={isBusy}
              >
                <ClipboardCheck className="size-3.5" />
                Request Submitter Confirmation
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmationRequest(false)}
                disabled={isBusy}
              >
                Cancel
              </Button>
            )}

            {!showRequestChanges ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRequestChanges(true);
                  setShowConfirmationRequest(false);
                }}
                disabled={isBusy}
              >
                <MessageSquareWarning className="size-3.5" />
                Request Changes
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
          {!canPublish && (
            <p className="text-xs text-muted-foreground">
              Publish is enabled after submitter confirmation is received.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {!showArchive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchive(true)}
              disabled={isBusy}
            >
              <Archive className="size-3.5" />
              Archive / Unpublish
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchive(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {showConfirmationRequest && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <form action={handleRequestConfirmation} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-confirmation-comment" className="text-xs">
                Note for the submitter (optional)
              </Label>
              <Textarea
                id="admin-confirmation-comment"
                name="comment"
                placeholder="Add context about what the submitter should review before confirming…"
                maxLength={1000}
                rows={3}
                disabled={isBusy}
                className="text-sm"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={isBusy}>
              {isRequestingConfirmation ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ClipboardCheck className="size-3.5" />
              )}
              {isRequestingConfirmation ? "Sending…" : "Send Confirmation Request"}
            </Button>
          </form>
        </motion.div>
      )}

      {showRequestChanges && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <form action={handleRequestChanges} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-review-comment" className="text-xs">
                Comment for the editor
              </Label>
              <Textarea
                id="admin-review-comment"
                name="comment"
                placeholder="Describe what needs to be changed…"
                maxLength={1000}
                rows={3}
                disabled={isBusy}
                className="text-sm"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={isBusy}>
              {isRequesting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MessageSquareWarning className="size-3.5" />
              )}
              {isRequesting ? "Sending…" : "Confirm Request"}
            </Button>
          </form>
        </motion.div>
      )}

      {showArchive && isPublished && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <form action={handleArchive} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-archive-comment" className="text-xs">
                Reason for archive
              </Label>
              <Textarea
                id="admin-archive-comment"
                name="comment"
                placeholder="Explain why this item is being unpublished…"
                maxLength={1000}
                rows={3}
                disabled={isBusy}
                required
                className="text-sm"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={isBusy}>
              {isArchiving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Archive className="size-3.5" />
              )}
              {isArchiving ? "Archiving…" : "Confirm Archive"}
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
