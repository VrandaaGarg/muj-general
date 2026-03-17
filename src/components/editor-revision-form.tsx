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
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { submitResearchRevision } from "@/lib/actions/research";
import {
  appendUploadMeta,
  presignedUpload,
} from "@/lib/uploads/presigned-upload";
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

interface RevisionItem {
  slug: string;
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  departmentId: string;
  license: string | null;
  externalUrl: string | null;
  doi: string | null;
  notesToAdmin: string | null;
  supervisorName: string | null;
  programName: string | null;
  fileOriginalName: string | null;
  fileSizeBytes: number | null;
}

interface EditorRevisionFormProps {
  item: RevisionItem;
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

const REVISION_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" }
> = {
  submitted: {
    text: "Your revision has been resubmitted for review. You'll be notified when it's reviewed.",
    type: "success",
  },
  invalid: {
    text: "Some fields are invalid. Please check and try again.",
    type: "error",
  },
  "storage-not-configured": {
    text: "File storage is not configured. Contact your administrator.",
    type: "error",
  },
  "not-found": {
    text: "This research item was not found or you don't have permission to revise it.",
    type: "error",
  },
  failed: {
    text: "Something went wrong while resubmitting. Please try again.",
    type: "error",
  },
};

export function EditorRevisionForm({
  item,
  departments,
}: EditorRevisionFormProps) {
  const searchParams = useSearchParams();
  const revisionParam = searchParams.get("revision");
  const toast = revisionParam ? REVISION_MESSAGES[revisionParam] : null;

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "uploading" | "saving"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showOptional, setShowOptional] = useState(
    Boolean(
      item.doi ||
        item.license ||
        item.externalUrl ||
        item.supervisorName ||
        item.programName,
    ),
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError(null);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setUploadError(null);

    try {
      // Upload replacement PDF to R2 via presigned URL if a new file was picked
      if (selectedFile) {
        setUploadPhase("uploading");
        const meta = await presignedUpload(selectedFile);
        appendUploadMeta(formData, meta);
      }

      setUploadPhase("saving");
      await submitResearchRevision(formData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(message);
      setIsSubmitting(false);
      setUploadPhase("idle");
    }
  }

  const isResubmitted = revisionParam === "submitted";

  return (
    <div className="space-y-4">
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

      {uploadError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          {uploadError}
        </motion.div>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-orange-600/10">
              <RefreshCw className="size-4 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Revise &amp; resubmit
              </CardTitle>
              <CardDescription>
                Update your submission and optionally upload a new PDF.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleSubmit} className="space-y-5">
            <input type="hidden" name="slug" value={item.slug} />

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs">
                Title <span className="font-normal text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                defaultValue={item.title}
                required
                minLength={5}
                maxLength={300}
                disabled={isSubmitting || isResubmitted}
              />
            </div>

            {/* Abstract */}
            <div className="space-y-1.5">
              <Label htmlFor="abstract" className="text-xs">
                Abstract{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>
              <Textarea
                id="abstract"
                name="abstract"
                defaultValue={item.abstract}
                required
                minLength={50}
                maxLength={5000}
                rows={4}
                disabled={isSubmitting || isResubmitted}
              />
            </div>

            {/* Type + Year */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="itemType" className="text-xs">
                  Item type{" "}
                  <span className="font-normal text-destructive">*</span>
                </Label>
                <select
                  id="itemType"
                  name="itemType"
                  required
                  defaultValue={item.itemType}
                  disabled={isSubmitting || isResubmitted}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <option value="">Select type...</option>
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
                  <span className="font-normal text-destructive">*</span>
                </Label>
                <Input
                  id="publicationYear"
                  name="publicationYear"
                  type="number"
                  defaultValue={item.publicationYear}
                  required
                  min={1900}
                  max={2100}
                  disabled={isSubmitting || isResubmitted}
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="departmentId" className="text-xs">
                Department{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>
              <select
                id="departmentId"
                name="departmentId"
                required
                defaultValue={item.departmentId}
                disabled={isSubmitting || isResubmitted}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PDF upload (optional replacement) */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Replacement PDF{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>

              {/* Existing file indicator */}
              {item.fileOriginalName && !selectedFile && (
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileUp className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground">
                      Current:{" "}
                      <span className="font-medium text-foreground">
                        {item.fileOriginalName}
                      </span>
                    </p>
                    {item.fileSizeBytes && (
                      <p className="text-[10px] text-muted-foreground">
                        {(item.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-orange-600/30 bg-orange-600/5 px-3 py-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-600/10">
                    <FileUp className="size-4 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      &middot; will replace current PDF
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleRemoveFile}
                    disabled={isSubmitting || isResubmitted}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                !isResubmitted && (
                  <label
                    htmlFor="revision-pdf"
                    className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 py-4 transition-colors hover:border-orange-600/40 hover:bg-orange-600/5"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <Upload className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">
                        Click to upload a new PDF
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Leave empty to keep the current file
                      </p>
                    </div>
                  </label>
                )
              )}
              <input
                ref={fileInputRef}
                id="revision-pdf"
                name="pdf"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isSubmitting || isResubmitted}
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
                      defaultValue={item.doi ?? ""}
                      maxLength={255}
                      disabled={isSubmitting || isResubmitted}
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
                      defaultValue={item.license ?? ""}
                      maxLength={160}
                      disabled={isSubmitting || isResubmitted}
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
                    defaultValue={item.externalUrl ?? ""}
                    disabled={isSubmitting || isResubmitted}
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
                      defaultValue={item.supervisorName ?? ""}
                      maxLength={160}
                      disabled={isSubmitting || isResubmitted}
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
                      defaultValue={item.programName ?? ""}
                      maxLength={160}
                      disabled={isSubmitting || isResubmitted}
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
                    placeholder="Describe what you changed in this revision..."
                    defaultValue={item.notesToAdmin ?? ""}
                    maxLength={1000}
                    rows={2}
                    disabled={isSubmitting || isResubmitted}
                  />
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting || isResubmitted}
              className="w-full bg-orange-600 text-white hover:bg-orange-700"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {uploadPhase === "uploading"
                ? "Uploading PDF..."
                : uploadPhase === "saving"
                  ? "Saving revision..."
                  : "Resubmit for review"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
