"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  PenLine,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { submitPublicationConfirmationAction } from "@/lib/actions/research";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ConfirmationDecision =
  | "confirmed"
  | "revision_requested"
  | "declined_by_submitter";

interface SubmitterConfirmationFormProps {
  researchItemId: string;
}

const DECISION_META: Record<
  ConfirmationDecision,
  {
    label: string;
    loadingLabel: string;
    description: string;
    icon: typeof CheckCircle2;
    className: string;
  }
> = {
  confirmed: {
    label: "Confirm Publication",
    loadingLabel: "Confirming…",
    description:
      "I have reviewed the submission and approve it for publication.",
    icon: CheckCircle2,
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  revision_requested: {
    label: "Request Revisions",
    loadingLabel: "Submitting…",
    description:
      "I would like changes to be made before this is published.",
    icon: PenLine,
    className: "",
  },
  declined_by_submitter: {
    label: "Decline Publication",
    loadingLabel: "Declining…",
    description:
      "I do not wish for this work to be published at this time.",
    icon: XCircle,
    className:
      "border-destructive/30 text-destructive hover:bg-destructive/10",
  },
};

export function SubmitterConfirmationForm({
  researchItemId,
}: SubmitterConfirmationFormProps) {
  const [selectedDecision, setSelectedDecision] =
    useState<ConfirmationDecision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!selectedDecision) return;

    setIsSubmitting(true);
    formData.set("researchItemId", researchItemId);
    formData.set("decision", selectedDecision);

    try {
      await submitPublicationConfirmationAction(formData);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your Decision
      </h3>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          Object.entries(DECISION_META) as [
            ConfirmationDecision,
            (typeof DECISION_META)[ConfirmationDecision],
          ][]
        ).map(([key, meta]) => {
          const Icon = meta.icon;
          const isActive = selectedDecision === key;

          return (
            <button
              key={key}
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                setSelectedDecision(isActive ? null : key)
              }
              className={`rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/60 hover:border-border hover:bg-muted/30"
              } ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon
                  className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-sm font-medium ${isActive ? "text-foreground" : "text-foreground/80"}`}
                >
                  {meta.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>

      {selectedDecision && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="confirmation-note" className="text-xs">
                Note (optional)
              </Label>
              <Textarea
                id="confirmation-note"
                name="note"
                placeholder={
                  selectedDecision === "confirmed"
                    ? "Any additional comments…"
                    : selectedDecision === "revision_requested"
                      ? "Describe what changes you'd like…"
                      : "Reason for declining…"
                }
                maxLength={1000}
                rows={3}
                disabled={isSubmitting}
                className="text-sm"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              variant={
                selectedDecision === "declined_by_submitter"
                  ? "outline"
                  : selectedDecision === "revision_requested"
                    ? "outline"
                    : "default"
              }
              disabled={isSubmitting}
              className={DECISION_META[selectedDecision].className}
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                (() => {
                  const Icon = DECISION_META[selectedDecision].icon;
                  return <Icon className="size-3.5" />;
                })()
              )}
              {isSubmitting
                ? DECISION_META[selectedDecision].loadingLabel
                : DECISION_META[selectedDecision].label}
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
