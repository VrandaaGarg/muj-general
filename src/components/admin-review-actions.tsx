"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
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
}

export function AdminReviewActions({ researchItemId }: AdminReviewActionsProps) {
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const isBusy = isPublishing || isRequesting;

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

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Moderation Actions
      </h3>

      <div className="flex items-center gap-2">
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
          {isPublishing ? "Publishing…" : "Approve & Publish"}
        </Button>

        {!showRequestChanges ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRequestChanges(true)}
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
    </div>
  );
}

