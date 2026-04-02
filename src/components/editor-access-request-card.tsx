"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  PenTool,
  Send,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { submitEditorAccessRequest } from "@/lib/actions/editor-access";
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

type RequestStatus = "pending" | "approved" | "rejected" | null;

interface EditorAccessRequestCardProps {
  requestStatus: RequestStatus;
  requestMessage: string | null;
  rejectionReason: string | null;
  requestCreatedAt: string | null;
  reviewedAt: string | null;
  emailVerified: boolean;
}

const TOAST_MESSAGES: Record<string, { text: string; type: "success" | "error" | "info" }> = {
  submitted: { text: "Your request has been submitted!", type: "success" },
  "already-pending": { text: "You already have a pending request.", type: "info" },
  "already-elevated": { text: "You already have editor or admin access.", type: "info" },
  "already-approved": { text: "Your request was already approved.", type: "info" },
  "email-not-verified": { text: "Please verify your email first.", type: "error" },
  invalid: { text: "Invalid request. Please try again.", type: "error" },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EditorAccessRequestCard({
  requestStatus,
  requestMessage,
  rejectionReason,
  requestCreatedAt,
  reviewedAt,
  emailVerified,
}: EditorAccessRequestCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestParam = searchParams.get("request");

  useEffect(() => {
    if (!requestParam) return;
    const msg = TOAST_MESSAGES[requestParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else if (msg.type === "error") toast.error(msg.text);
    else toast.info(msg.text);
    router.replace("/settings", { scroll: false });
  }, [requestParam, router]);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await submitEditorAccessRequest(formData);
    } catch {
      setIsSubmitting(false);
    }
  }

  if (requestStatus === "approved") {
    return (
      <Card className="border-emerald-600/20 bg-emerald-600/[0.02]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center   bg-emerald-600/10">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Editor Access Granted
              </CardTitle>
              <CardDescription>
                {reviewedAt
                  ? `Approved on ${formatDate(reviewedAt)}`
                  : "Your request has been approved"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You now have editor privileges. Visit the{" "}
            <a
              href="/editor"
              className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              Editor Panel
            </a>{" "}
            to review and manage submissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (requestStatus === "pending") {
    return (
      <Card className="border-amber-600/20 bg-amber-600/[0.02]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center   bg-amber-600/10">
              <Clock className="size-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Request Pending
              </CardTitle>
              <CardDescription>
                {requestCreatedAt
                  ? `Submitted on ${formatDate(requestCreatedAt)}`
                  : "Waiting for admin review"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your editor access request is being reviewed by an administrator.
            You&apos;ll be notified once a decision is made.
          </p>
          {requestMessage && (
            <div className="mt-3   border border-border/40 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                Your message
              </p>
              <p className="text-sm text-foreground">{requestMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (requestStatus === "rejected") {
    return (
      <Card className="border-destructive/20 bg-destructive/[0.02]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center   bg-destructive/10">
              <XCircle className="size-4 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Request Declined
              </CardTitle>
              <CardDescription>
                {reviewedAt
                  ? `Reviewed on ${formatDate(reviewedAt)}`
                  : "Your request was not approved"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rejectionReason && (
            <div className="  border border-destructive/20 bg-destructive/5 px-3 py-2">
              <p className="text-xs font-medium text-destructive mb-0.5">
                Reason
              </p>
              <p className="text-sm text-foreground">{rejectionReason}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            You can submit a new request with additional context about why you
            need editor access.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Send className="size-3.5" />
            Request again
          </Button>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <EditorAccessForm
                  ref={formRef}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  onCancel={() => setShowForm(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center   bg-primary/10">
            <PenTool className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              Become an Editor
            </CardTitle>
            <CardDescription>
              Submit and manage research on MUJ General
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!emailVerified ? (
          <div className="  border border-amber-600/20 bg-amber-600/5 px-3 py-2">
            <p className="text-xs font-medium text-amber-600 mb-0.5">
              Email verification required
            </p>
            <p className="text-sm text-muted-foreground">
              Please verify your email address before requesting editor access.
              Check your inbox for the verification link.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Editors can submit research papers, manage publications, and
              contribute to the academic repository. Request editor access and an
              admin will review your application.
            </p>
            {!showForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(true)}
              >
                <Send className="size-3.5" />
                Apply for editor access
              </Button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <EditorAccessForm
                    ref={formRef}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                    onCancel={() => setShowForm(false)}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface EditorAccessFormProps {
  isSubmitting: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}

import { forwardRef } from "react";

const EditorAccessForm = forwardRef<HTMLFormElement, EditorAccessFormProps>(
  function EditorAccessForm({ isSubmitting, onSubmit, onCancel }, ref) {
    return (
      <form ref={ref} action={onSubmit} className="space-y-3 pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="editor-access-message" className="text-xs">
            Why do you want editor access?{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="editor-access-message"
            name="message"
            placeholder="I'm a faculty member in the CS department and would like to publish our research group's papers..."
            maxLength={500}
            rows={3}
            disabled={isSubmitting}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Max 500 characters. Help the admin understand your request.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {isSubmitting ? "Submitting…" : "Submit request"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  },
);
