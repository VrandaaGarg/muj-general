"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Loader2,
  Send,
  Upload,
  X,
} from "lucide-react";

import { submitResearchSubmission } from "@/lib/actions/research";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface EditorSubmissionFormProps {
  departments: Department[];
}

const ITEM_TYPES = [
  { value: "research_paper", label: "Research Paper" },
  { value: "journal_article", label: "Journal Article" },
  { value: "conference_paper", label: "Conference Paper" },
  { value: "thesis", label: "Thesis" },
  { value: "dissertation", label: "Dissertation" },
  { value: "capstone_project", label: "Capstone Project" },
  { value: "technical_report", label: "Technical Report" },
  { value: "patent", label: "Patent" },
  { value: "poster", label: "Poster" },
  { value: "dataset", label: "Dataset" },
  { value: "presentation", label: "Presentation" },
] as const;

const SUBMISSION_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" }
> = {
  submitted: {
    text: "Your submission has been received and is awaiting admin review.",
    type: "success",
  },
  invalid: {
    text: "Some fields are invalid. Please check and try again.",
    type: "error",
  },
  "missing-file": {
    text: "A PDF file is required for submission.",
    type: "error",
  },
  "storage-not-configured": {
    text: "File storage is not configured. Contact your administrator.",
    type: "error",
  },
  failed: {
    text: "Something went wrong while submitting. Please try again.",
    type: "error",
  },
};

export function EditorSubmissionForm({
  departments,
}: EditorSubmissionFormProps) {
  const searchParams = useSearchParams();
  const submissionParam = searchParams.get("submission");
  const toast = submissionParam ? SUBMISSION_MESSAGES[submissionParam] : null;

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await submitResearchSubmission(formData);
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          New submission
        </h2>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            toast.type === "success"
              ? "bg-emerald-600/10 text-emerald-600"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="size-3.5 shrink-0" />
          ) : (
            <AlertCircle className="size-3.5 shrink-0" />
          )}
          {toast.text}
        </motion.div>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-violet-600/10">
              <Send className="size-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Submit research
              </CardTitle>
              <CardDescription>
                Upload a PDF and fill in the metadata below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs">
                Title <span className="text-destructive font-normal">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Machine Learning in Healthcare: A Systematic Review"
                required
                minLength={5}
                maxLength={300}
                disabled={isSubmitting}
              />
            </div>

            {/* Abstract */}
            <div className="space-y-1.5">
              <Label htmlFor="abstract" className="text-xs">
                Abstract{" "}
                <span className="text-destructive font-normal">*</span>
              </Label>
              <Textarea
                id="abstract"
                name="abstract"
                placeholder="Provide a concise summary of the research (minimum 50 characters)…"
                required
                minLength={50}
                maxLength={5000}
                rows={4}
                disabled={isSubmitting}
              />
            </div>

            {/* Type + Year row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="itemType" className="text-xs">
                  Item type{" "}
                  <span className="text-destructive font-normal">*</span>
                </Label>
                <select
                  id="itemType"
                  name="itemType"
                  required
                  disabled={isSubmitting}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <option value="">Select type…</option>
                  {ITEM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="publicationYear" className="text-xs">
                  Publication year{" "}
                  <span className="text-destructive font-normal">*</span>
                </Label>
                <Input
                  id="publicationYear"
                  name="publicationYear"
                  type="number"
                  placeholder={new Date().getFullYear().toString()}
                  required
                  min={1900}
                  max={2100}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="departmentId" className="text-xs">
                Department{" "}
                <span className="text-destructive font-normal">*</span>
              </Label>
              <select
                id="departmentId"
                name="departmentId"
                required
                disabled={isSubmitting}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PDF upload */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                PDF file{" "}
                <span className="text-destructive font-normal">*</span>
              </Label>
              {selectedFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-violet-600/10">
                    <FileUp className="size-4 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleRemoveFile}
                    disabled={isSubmitting}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="pdf"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 py-6 transition-colors hover:border-violet-600/40 hover:bg-violet-600/5"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <Upload className="size-4 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">Click to upload PDF</p>
                     <p className="text-[10px] text-muted-foreground">
                      PDF only, max 10 MB
                     </p>
                   </div>
                 </label>
              )}
              <input
                ref={fileInputRef}
                id="pdf"
                name="pdf"
                type="file"
                accept="application/pdf"
                required
                className="sr-only"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </div>

            {/* Optional fields toggle */}
            <button
              type="button"
              onClick={() => setShowOptional((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showOptional ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              Optional metadata
            </button>

            {showOptional && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="doi" className="text-xs">
                      DOI
                    </Label>
                    <Input
                      id="doi"
                      name="doi"
                      placeholder="10.1000/xyz123"
                      maxLength={255}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="license" className="text-xs">
                      License
                    </Label>
                    <Input
                      id="license"
                      name="license"
                      placeholder="e.g. CC BY 4.0"
                      maxLength={160}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="externalUrl" className="text-xs">
                    External URL
                  </Label>
                  <Input
                    id="externalUrl"
                    name="externalUrl"
                    type="url"
                    placeholder="https://example.com/paper"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="supervisorName" className="text-xs">
                      Supervisor name
                    </Label>
                    <Input
                      id="supervisorName"
                      name="supervisorName"
                      placeholder="Dr. Jane Smith"
                      maxLength={160}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="programName" className="text-xs">
                      Program name
                    </Label>
                    <Input
                      id="programName"
                      name="programName"
                      placeholder="M.Tech Computer Science"
                      maxLength={160}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notesToAdmin" className="text-xs">
                    Notes to admin
                  </Label>
                  <Textarea
                    id="notesToAdmin"
                    name="notesToAdmin"
                    placeholder="Any additional context for the reviewer…"
                    maxLength={1000}
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-violet-600 text-white hover:bg-violet-700"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {isSubmitting ? "Submitting…" : "Submit for review"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
