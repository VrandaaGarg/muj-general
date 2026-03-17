"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  FileImage,
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { submitResearchRevision } from "@/lib/actions/research";
import { RESEARCH_TYPE_OPTIONS } from "@/lib/research-types";
import {
  appendUploadMeta,
  presignedUpload,
} from "@/lib/uploads/presigned-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
}

interface AuthorDraft {
  id?: string;
  displayName: string;
  email: string;
  affiliation: string;
  orcid: string;
  isCorresponding: boolean;
}

interface RevisionFile {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
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
  publicationDate: string;
  changeSummary: string | null;
  notesToAdmin: string | null;
  supervisorName: string | null;
  programName: string | null;
  authors: Array<{
    id: string;
    displayName: string;
    email: string | null;
    affiliation: string | null;
    orcid: string | null;
    isCorresponding: boolean;
  }>;
  tagIds: string[];
  pdfFile: RevisionFile | null;
  coverImageFile: RevisionFile | null;
}

interface EditorRevisionFormProps {
  item: RevisionItem;
  departments: Department[];
  tags: TagOption[];
}

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
  "missing-file": {
    text: "A PDF is required for this item. Upload one before resubmitting.",
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

function createEmptyAuthor(isCorresponding = false): AuthorDraft {
  return {
    displayName: "",
    email: "",
    affiliation: "",
    orcid: "",
    isCorresponding,
  };
}

function toAuthorDraft(author: RevisionItem["authors"][number]): AuthorDraft {
  return {
    id: author.id,
    displayName: author.displayName,
    email: author.email ?? "",
    affiliation: author.affiliation ?? "",
    orcid: author.orcid ?? "",
    isCorresponding: author.isCorresponding,
  };
}

function formatFileSize(sizeBytes: number) {
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function EditorRevisionForm({
  item,
  departments,
  tags,
}: EditorRevisionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revisionParam = searchParams.get("revision");

  useEffect(() => {
    if (!revisionParam) return;
    const msg = REVISION_MESSAGES[revisionParam];
    if (!msg) return;
    if (msg.type === "success") {
      toast.success(msg.text);
    } else {
      toast.error(msg.text);
    }
    router.replace(`/editor/${item.slug}/revise`, { scroll: false });
  }, [revisionParam, router, item.slug]);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [authors, setAuthors] = useState<AuthorDraft[]>(
    item.authors.length > 0
      ? item.authors.map(toAuthorDraft)
      : [createEmptyAuthor(true)],
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(item.tagIds);
  const [showAdditional, setShowAdditional] = useState(
    Boolean(
      item.publicationDate ||
        item.changeSummary ||
        item.doi ||
        item.license ||
        item.externalUrl ||
        item.supervisorName ||
        item.programName ||
        item.notesToAdmin,
    ),
  );

  const isResubmitted = revisionParam === "submitted";
  const isDisabled = isSubmitting || isResubmitted;

  function updateAuthor<K extends keyof AuthorDraft>(
    index: number,
    field: K,
    value: AuthorDraft[K],
  ) {
    setAuthors((current) =>
      current.map((author, authorIndex) =>
        authorIndex === index ? { ...author, [field]: value } : author,
      ),
    );
  }

  function addAuthor() {
    setAuthors((current) => [...current, createEmptyAuthor(false)]);
  }

  function removeAuthor(index: number) {
    setAuthors((current) =>
      current.length === 1
        ? current
        : current.filter((_, authorIndex) => authorIndex !== index),
    );
  }

  function moveAuthor(index: number, direction: -1 | 1) {
    setAuthors((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextAuthors = [...current];
      const [movedAuthor] = nextAuthors.splice(index, 1);
      nextAuthors.splice(nextIndex, 0, movedAuthor);
      return nextAuthors;
    });
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((value) => value !== tagId)
        : [...current, tagId],
    );
  }

  function handlePdfChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedPdfFile(event.target.files?.[0] ?? null);
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedCoverFile(event.target.files?.[0] ?? null);
  }

  function removeSelectedPdf() {
    setSelectedPdfFile(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  }

  function removeSelectedCover() {
    setSelectedCoverFile(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  async function handleSubmit(formData: FormData) {
    if (!item.coverImageFile && !selectedCoverFile) {
      toast.error("Cover image / poster is required.");
      return;
    }

    setIsSubmitting(true);
    formData.set("authors", JSON.stringify(authors));

    try {
      if (selectedPdfFile) {
        setUploadPhase("uploading");
        const pdfMeta = await presignedUpload(selectedPdfFile, {
          kind: "main_pdf",
        });
        appendUploadMeta(formData, pdfMeta);
      }

      if (selectedCoverFile) {
        setUploadPhase("uploading");
        const coverMeta = await presignedUpload(selectedCoverFile, {
          kind: "cover_image",
        });
        appendUploadMeta(formData, coverMeta, { prefix: "coverUploaded" });
      }

      setUploadPhase("saving");
      await submitResearchRevision(formData);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : "Upload failed. Please try again.";
      toast.error(message);
      setIsSubmitting(false);
      setUploadPhase("idle");
    }
  }

  return (
    <div className="space-y-4">
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
                Update the metadata, authors, tags, and uploaded assets for the next review cycle.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <input type="hidden" name="slug" value={item.slug} />
            <input type="hidden" name="authors" value={JSON.stringify(authors)} readOnly />
            {selectedTagIds.map((tagId) => (
              <input key={tagId} type="hidden" name="tagIds" value={tagId} readOnly />
            ))}

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
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abstract" className="text-xs">
                Abstract <span className="font-normal text-destructive">*</span>
              </Label>
              <Textarea
                id="abstract"
                name="abstract"
                defaultValue={item.abstract}
                required
                minLength={50}
                maxLength={5000}
                rows={5}
                disabled={isDisabled}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="itemType" className="text-xs">
                  Item type <span className="font-normal text-destructive">*</span>
                </Label>
                <select
                  id="itemType"
                  name="itemType"
                  required
                  defaultValue={item.itemType}
                  disabled={isDisabled}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <option value="">Select type…</option>
                  {RESEARCH_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="publicationYear" className="text-xs">
                  Publication year <span className="font-normal text-destructive">*</span>
                </Label>
                <Input
                  id="publicationYear"
                  name="publicationYear"
                  type="number"
                  defaultValue={item.publicationYear}
                  required
                  min={1900}
                  max={2100}
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="departmentId" className="text-xs">
                  Department <span className="font-normal text-destructive">*</span>
                </Label>
                <select
                  id="departmentId"
                  name="departmentId"
                  required
                  defaultValue={item.departmentId}
                  disabled={isDisabled}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <option value="">Select department…</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="publicationDate" className="text-xs">
                  Publication date
                </Label>
                <Input
                  id="publicationDate"
                  name="publicationDate"
                  type="date"
                  defaultValue={item.publicationDate}
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Authors</h3>
                  <p className="text-xs text-muted-foreground">
                    Keep authors in display order and mark the corresponding author where needed.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAuthor} disabled={isDisabled}>
                  <Plus className="size-3.5" />
                  Add author
                </Button>
              </div>

              <div className="space-y-3">
                {authors.map((author, index) => (
                  <div key={author.id ?? `author-${index}`} className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-foreground">Author {index + 1}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveAuthor(index, -1)}
                          disabled={isDisabled || index === 0}
                        >
                          <ChevronUp className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => moveAuthor(index, 1)}
                          disabled={isDisabled || index === authors.length - 1}
                        >
                          <ChevronDown className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeAuthor(index)}
                          disabled={isDisabled || authors.length === 1}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`author-name-${index}`} className="text-xs">
                          Display name <span className="font-normal text-destructive">*</span>
                        </Label>
                        <Input
                          id={`author-name-${index}`}
                          value={author.displayName}
                          onChange={(event) => updateAuthor(index, "displayName", event.target.value)}
                          placeholder="Dr. Jane Smith"
                          required
                          disabled={isDisabled}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`author-affiliation-${index}`} className="text-xs">
                          Affiliation
                        </Label>
                        <Input
                          id={`author-affiliation-${index}`}
                          value={author.affiliation}
                          onChange={(event) => updateAuthor(index, "affiliation", event.target.value)}
                          placeholder="Manipal University Jaipur"
                          disabled={isDisabled}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`author-email-${index}`} className="text-xs">
                          Email
                        </Label>
                        <Input
                          id={`author-email-${index}`}
                          type="email"
                          value={author.email}
                          onChange={(event) => updateAuthor(index, "email", event.target.value)}
                          placeholder="name@example.com"
                          disabled={isDisabled}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`author-orcid-${index}`} className="text-xs">
                          ORCID
                        </Label>
                        <Input
                          id={`author-orcid-${index}`}
                          value={author.orcid}
                          onChange={(event) => updateAuthor(index, "orcid", event.target.value)}
                          placeholder="0000-0000-0000-0000"
                          disabled={isDisabled}
                        />
                      </div>

                      <label className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={author.isCorresponding}
                          onChange={(event) =>
                            updateAuthor(index, "isCorresponding", event.target.checked)
                          }
                          disabled={isDisabled}
                        />
                        Corresponding author
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Tags</h3>
                <p className="text-xs text-muted-foreground">
                  Update the discovery topics attached to this item.
                </p>
              </div>

              {tags.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                  No tags are available yet. An admin needs to create them first.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);

                    return (
                      <label
                        key={tag.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                          isSelected
                            ? "border-orange-600/40 bg-orange-600/5 text-foreground"
                            : "border-border/60 bg-background text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTag(tag.id)}
                          disabled={isDisabled}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border/60 p-4">
                <div>
                  <Label className="text-xs">
                    Replace main PDF <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Leave empty to keep the current PDF.
                  </p>
                </div>

                {item.pdfFile && !selectedPdfFile && (
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileUp className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">
                        Current: <span className="font-medium text-foreground">{item.pdfFile.originalName}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(item.pdfFile.sizeBytes)}
                      </p>
                    </div>
                  </div>
                )}

                {selectedPdfFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-orange-600/30 bg-orange-600/5 px-3 py-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-600/10">
                      <FileUp className="size-4 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{selectedPdfFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(selectedPdfFile.size)} · will replace current PDF
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={removeSelectedPdf} disabled={isDisabled}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  !isResubmitted && (
                    <label
                      htmlFor="revision-pdf"
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 py-6 text-center transition-colors hover:border-orange-600/40 hover:bg-orange-600/5"
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Upload className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Click to upload a new PDF</p>
                        <p className="text-[10px] text-muted-foreground">PDF only, up to 10 MB.</p>
                      </div>
                    </label>
                  )
                )}

                <input
                  ref={pdfInputRef}
                  id="revision-pdf"
                  name="pdf"
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={handlePdfChange}
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border/60 p-4">
                <div>
                  <Label className="text-xs">
                    Poster / thumbnail image{" "}
                    {item.coverImageFile ? (
                      <span className="font-normal text-muted-foreground">(replace optional)</span>
                    ) : (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.coverImageFile
                      ? "Leave empty to keep the current image."
                      : "A cover image is required. JPG, PNG, or WEBP up to 5 MB."}
                  </p>
                </div>

                {item.coverImageFile && !selectedCoverFile && (
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileImage className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">
                        Current: <span className="font-medium text-foreground">{item.coverImageFile.originalName}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(item.coverImageFile.sizeBytes)}
                      </p>
                    </div>
                  </div>
                )}

                {selectedCoverFile ? (
                  <div className="flex items-center gap-3 rounded-lg border border-orange-600/30 bg-orange-600/5 px-3 py-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-600/10">
                      <FileImage className="size-4 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{selectedCoverFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(selectedCoverFile.size)} · will replace current image
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={removeSelectedCover} disabled={isDisabled}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  !isResubmitted && (
                    <label
                      htmlFor="revision-cover-image"
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 py-6 text-center transition-colors hover:border-orange-600/40 hover:bg-orange-600/5"
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Upload className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Click to upload a new poster / thumbnail</p>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG, or WEBP up to 5 MB.</p>
                      </div>
                    </label>
                  )
                )}

                <input
                  ref={coverInputRef}
                  id="revision-cover-image"
                  name="coverImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleCoverChange}
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="externalUrl" className="text-xs">
                  Reference / external URL
                </Label>
                <Input
                  id="externalUrl"
                  name="externalUrl"
                  type="url"
                  placeholder="https://example.com/paper"
                  defaultValue={item.externalUrl ?? ""}
                  disabled={isDisabled}
                />
                <p className="text-[10px] text-muted-foreground">
                  Use this for a citation page, external repository, or publication landing page.
                </p>
              </div>

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
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="changeSummary" className="text-xs">
                Change summary / version note
              </Label>
              <Textarea
                id="changeSummary"
                name="changeSummary"
                placeholder="Summarize what changed in this revision."
                defaultValue={item.changeSummary ?? ""}
                maxLength={1000}
                rows={3}
                disabled={isDisabled}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdditional((current) => !current)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showAdditional ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              Additional metadata
            </button>

            {showAdditional && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid gap-4 sm:grid-cols-2">
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
                      disabled={isDisabled}
                    />
                  </div>

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
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                      disabled={isDisabled}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notesToAdmin" className="text-xs">
                      Notes to admin
                    </Label>
                    <Textarea
                      id="notesToAdmin"
                      name="notesToAdmin"
                      placeholder="Any additional context for the reviewer."
                      defaultValue={item.notesToAdmin ?? ""}
                      maxLength={1000}
                      rows={3}
                      disabled={isDisabled}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isDisabled}
              className="w-full bg-orange-600 text-white hover:bg-orange-700"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              {uploadPhase === "uploading"
                ? "Uploading files…"
                : uploadPhase === "saving"
                  ? "Saving revision…"
                  : "Resubmit for review"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}