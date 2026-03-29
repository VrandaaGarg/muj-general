"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileImage,
  FileText,
  FileUp,
  Loader2,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { submitResearchSubmission } from "@/lib/actions/research";
import {
  appendUploadMeta,
  presignedUpload,
} from "@/lib/uploads/presigned-upload";
import { cn } from "@/lib/utils";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  archivedAt: Date | null;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
  archivedAt: Date | null;
}

interface JournalInfo {
  id: string;
  name: string;
  slug: string;
}

interface JournalIssueOption {
  id: string;
  journalId: string;
  volumeId: string;
  issueNumber: number;
  issueTitle: string | null;
  publishedAt: Date | null;
  volumeNumber: number;
  volumeYear: number;
}

interface AuthorSuggestion {
  id: string;
  displayName: string;
  email: string | null;
}

interface AuthorDraft {
  id?: string;
  displayName: string;
  email: string;
  affiliation: string;
  orcid: string;
  isCorresponding: boolean;
}

interface ReferenceDraft {
  citationText: string;
  url: string;
}

interface JournalSubmissionStepFormProps {
  departments: Department[];
  tags: TagOption[];
  journal?: JournalInfo;
  journals?: JournalInfo[];
  journalIssues: JournalIssueOption[];
  basePath: string;
  itemTypeOptions?: ReadonlyArray<{ value: string; label: string }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const JOURNAL_ELIGIBLE_TYPES = [
  { value: "research_paper", label: "Research Paper" },
  { value: "journal_article", label: "Journal Article" },
  { value: "conference_paper", label: "Conference Paper" },
] as const;

const STEPS = [
  { key: "files", label: "Files", icon: FileUp },
  { key: "details", label: "Details", icon: FileText },
  { key: "authors", label: "Authors", icon: Users },
  { key: "declarations", label: "Declarations", icon: AlertCircle },
  { key: "review", label: "Review", icon: Send },
] as const;

const SUBMISSION_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" }
> = {
  "draft-saved": {
    text: "Draft saved. You can continue editing it anytime from your submissions list.",
    type: "success",
  },
  submitted: {
    text: "Your submission has been received and is awaiting review.",
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
  "missing-cover": {
    text: "A cover image / poster is required for submission.",
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function createEmptyAuthor(isCorresponding = false): AuthorDraft {
  return {
    displayName: "",
    email: "",
    affiliation: "",
    orcid: "",
    isCorresponding,
  };
}

function createEmptyReference(): ReferenceDraft {
  return {
    citationText: "",
    url: "",
  };
}

function formatFileSize(sizeBytes: number) {
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function isValidAuthorEmail(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({
  currentStep,
  onStepClick,
  completedSteps,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: Set<number>;
}) {
  return (
    <nav className="mb-8" aria-label="Submission steps">
      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const isPast = index < currentStep;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : isCompleted || isPast
                      ? "text-foreground hover:bg-muted/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted || isPast
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted || isPast ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </div>
                <span className="hidden lg:inline">{step.label}</span>
              </button>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px flex-1 transition-colors",
                    index < currentStep ? "bg-primary/30" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="flex sm:hidden items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isPast = index < currentStep;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStepClick(index)}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors",
                  isActive
                    ? "bg-primary"
                    : isPast
                      ? "bg-primary/40"
                      : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : isPast
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function JournalSubmissionStepForm({
  departments,
  tags,
  journal,
  journals,
  journalIssues,
  basePath,
  itemTypeOptions,
}: JournalSubmissionStepFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionParam = searchParams.get("submission");
  const handledSubmissionParamRef = useRef<string | null>(null);

  /* ---- Toast on redirect param ---- */
  useEffect(() => {
    if (!submissionParam) return;
    if (handledSubmissionParamRef.current === submissionParam) return;
    handledSubmissionParamRef.current = submissionParam;
    const msg = SUBMISSION_MESSAGES[submissionParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else toast.error(msg.text);
    router.replace(basePath, { scroll: false });
  }, [submissionParam, router, basePath]);

  /* ---- Refs ---- */
  const formRef = useRef<HTMLFormElement>(null);

  /* ---- Kickoff state ---- */
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState("");
  const [selectedJournalId, setSelectedJournalId] = useState(journal?.id ?? "");

  /* ---- Step state ---- */
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  /* ---- Form field state ---- */
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [publicationYear, setPublicationYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedJournalIssueId, setSelectedJournalIssueId] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);

  /* Authors */
  const [authors, setAuthors] = useState<AuthorDraft[]>([
    createEmptyAuthor(true),
  ]);
  const [authorMatches, setAuthorMatches] = useState<
    Record<number, AuthorSuggestion[]>
  >({});
  const [pendingAuthorConfirm, setPendingAuthorConfirm] = useState<{
    index: number;
    suggestion: AuthorSuggestion;
  } | null>(null);

  /* Declarations */
  const [license, setLicense] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [doi, setDoi] = useState("");
  const [pageRange, setPageRange] = useState("");
  const [articleNumber, setArticleNumber] = useState("");
  const [notesToAdmin, setNotesToAdmin] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [programName, setProgramName] = useState("");
  const [references, setReferences] = useState<ReferenceDraft[]>([
    createEmptyReference(),
  ]);

  /* Submit state */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "uploading" | "saving"
  >("idle");
  const [activeIntent, setActiveIntent] = useState<"submit" | "save_draft">(
    "submit",
  );

  const isJournalLocked = Boolean(journal);
  const availableJournals = journal ? [journal] : journals ?? [];
  const availableItemTypes = itemTypeOptions ?? JOURNAL_ELIGIBLE_TYPES;
  const selectedJournal =
    availableJournals.find((entry) => entry.id === selectedJournalId) ?? null;
  const filteredJournalIssues = selectedJournalId
    ? journalIssues.filter((issue) => issue.journalId === selectedJournalId)
    : [];

  /* ---- Author search ---- */
  const authorSearchTimeoutsRef = useRef<
    Record<number, ReturnType<typeof setTimeout>>
  >({});
  const authorSearchRequestSeqRef = useRef<Record<number, number>>({});

  useEffect(
    () => () => {
      for (const timeout of Object.values(authorSearchTimeoutsRef.current)) {
        clearTimeout(timeout);
      }
    },
    [],
  );

  function clearAuthorSearches() {
    for (const timeout of Object.values(authorSearchTimeoutsRef.current)) {
      clearTimeout(timeout);
    }
    authorSearchTimeoutsRef.current = {};
    authorSearchRequestSeqRef.current = {};
    setAuthorMatches({});
  }

  function queueAuthorSearch(index: number, nextAuthors: AuthorDraft[]) {
    const currentAuthor = nextAuthors[index];
    if (!currentAuthor) return;

    const query = normalizeSearch(
      `${currentAuthor.displayName} ${currentAuthor.email}`,
    );
    if (query.length < 2) {
      setAuthorMatches((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    const selectedIds = new Set(
      nextAuthors
        .map((a) => a.id)
        .filter((v): v is string => Boolean(v)),
    );
    if (currentAuthor.id) selectedIds.delete(currentAuthor.id);

    const existing = authorSearchTimeoutsRef.current[index];
    if (existing) clearTimeout(existing);

    authorSearchTimeoutsRef.current[index] = setTimeout(async () => {
      const seq = (authorSearchRequestSeqRef.current[index] ?? 0) + 1;
      authorSearchRequestSeqRef.current[index] = seq;

      try {
        const res = await fetch(
          `/api/authors/search?query=${encodeURIComponent(query)}&limit=5`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const payload = (await res.json()) as { results: AuthorSuggestion[] };
        if (authorSearchRequestSeqRef.current[index] !== seq) return;
        setAuthorMatches((prev) => ({
          ...prev,
          [index]: payload.results.filter((s) => !selectedIds.has(s.id)),
        }));
      } catch {
        setAuthorMatches((prev) => ({ ...prev, [index]: [] }));
      }
    }, 250);
  }

  /* ---- Author helpers ---- */
  function updateAuthor<K extends keyof AuthorDraft>(
    index: number,
    field: K,
    value: AuthorDraft[K],
  ) {
    setAuthors((prev) => {
      const next = prev.map((a, i) =>
        i === index
          ? {
              ...a,
              [field]: value,
              ...(field !== "isCorresponding" ? { id: undefined } : {}),
            }
          : a,
      );
      if (field === "displayName" || field === "email") {
        queueAuthorSearch(index, next);
      }
      return next;
    });
  }

  function applyAuthorSuggestion(index: number, suggestion: AuthorSuggestion) {
    setPendingAuthorConfirm({ index, suggestion });
  }

  function confirmAuthorSuggestion() {
    if (!pendingAuthorConfirm) return;
    const { index, suggestion } = pendingAuthorConfirm;
    setAuthors((prev) =>
      prev.map((a, i) =>
        i === index
          ? {
              ...a,
              id: suggestion.id,
              displayName: suggestion.displayName,
              email: suggestion.email ?? "",
            }
          : a,
      ),
    );
    setAuthorMatches((prev) => ({ ...prev, [index]: [] }));
    setPendingAuthorConfirm(null);
  }

  function addAuthor() {
    clearAuthorSearches();
    setAuthors((prev) => [...prev, createEmptyAuthor(false)]);
  }

  function removeAuthor(index: number) {
    clearAuthorSearches();
    setAuthors((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function moveAuthor(index: number, direction: -1 | 1) {
    clearAuthorSearches();
    setAuthors((prev) => {
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(next, 0, moved);
      return copy;
    });
  }

  /* ---- Tags ---- */
  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((v) => v !== tagId) : [...prev, tagId],
    );
  }

  function addReference() {
    setReferences((prev) => [...prev, createEmptyReference()]);
  }

  function removeReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  }

  function updateReference<K extends keyof ReferenceDraft>(
    index: number,
    field: K,
    value: ReferenceDraft[K],
  ) {
    setReferences((prev) =>
      prev.map((ref, i) => (i === index ? { ...ref, [field]: value } : ref)),
    );
  }



  function getNormalizedAuthors() {
    return authors
      .map((author) => ({
        ...author,
        displayName: author.displayName.trim(),
        email: author.email.trim(),
        affiliation: author.affiliation.trim(),
        orcid: author.orcid.trim(),
      }))
      .filter(
        (author) =>
          author.displayName.length > 0 ||
          author.email.length > 0 ||
          author.affiliation.length > 0 ||
          author.orcid.length > 0,
      );
  }

  /* ---- Step validation ---- */
  function canProceedFromStep(step: number): boolean {
    const normalizedAuthors = getNormalizedAuthors();

    switch (step) {
      case 0:
        return selectedPdfFile !== null && selectedCoverFile !== null;
      case 1:
        return (
          title.trim().length >= 5 &&
          abstract.trim().length >= 50 &&
          publicationYear.trim().length > 0 &&
          selectedDepartmentId.length > 0
        );
      case 2:
        return (
          normalizedAuthors.length > 0 &&
          normalizedAuthors.every(
            (author) =>
              author.displayName.length >= 2 && isValidAuthorEmail(author.email),
          )
        );
      case 3:
        return true; // All optional
      default:
        return true;
    }
  }

  function getStepValidationMessage(step: number): string | null {
    const normalizedAuthors = getNormalizedAuthors();

    switch (step) {
      case 0:
        if (!selectedPdfFile) return "Main PDF is required before continuing.";
        if (!selectedCoverFile)
          return "Cover image is required before continuing.";
        return null;
      case 1:
        if (title.trim().length < 5) return "Title must be at least 5 characters.";
        if (abstract.trim().length < 50)
          return "Abstract must be at least 50 characters.";
        if (!publicationYear.trim()) return "Publication year is required.";
        if (!selectedDepartmentId) return "Department is required.";
        return null;
      case 2:
        if (normalizedAuthors.length === 0)
          return "Add at least one author before continuing.";
        if (normalizedAuthors.some((author) => author.displayName.length < 2))
          return "At least one author with a valid name is required.";
        if (normalizedAuthors.some((author) => !isValidAuthorEmail(author.email))) {
          return "Use a valid author email address, or leave it empty.";
        }
        return null;
      default:
        return null;
    }
  }

  function goToStep(target: number) {
    if (target < 0 || target >= STEPS.length) return;

    if (target > currentStep) {
      const msg = getStepValidationMessage(currentStep);
      if (msg) {
        toast.error(msg);
        return;
      }
    }

    setCurrentStep(target);
    setVisitedSteps((prev) => new Set([...prev, target]));
  }

  /* ---- Submit ---- */
  async function handleSubmit(formData: FormData) {
    const workflowIntent =
      formData.get("workflowIntent") === "save_draft" ? "save_draft" : "submit";
    setActiveIntent(workflowIntent);

    if (workflowIntent === "submit" && !selectedCoverFile) {
      toast.error("Cover image / poster is required.");
      return;
    }

    setIsSubmitting(true);

    const normalizedAuthors = getNormalizedAuthors();
    if (normalizedAuthors.length === 0) {
      toast.error("Add at least one author before submitting.");
      setIsSubmitting(false);
      return;
    }

    if (normalizedAuthors.some((author) => author.displayName.length < 2)) {
      toast.error("Each author must have a name with at least 2 characters.");
      setIsSubmitting(false);
      return;
    }

    if (normalizedAuthors.some((author) => !isValidAuthorEmail(author.email))) {
      toast.error("One or more author emails are invalid.");
      setIsSubmitting(false);
      return;
    }

    formData.set("returnTo", basePath);
    formData.set("itemType", selectedItemType);
    formData.set("title", title);
    formData.set("abstract", abstract);
    formData.set("publicationYear", publicationYear);
    formData.set("departmentId", selectedDepartmentId);
    if (selectedJournalId) {
      formData.set("journalId", selectedJournalId);
    }
    if (selectedJournalIssueId) {
      formData.set("journalIssueId", selectedJournalIssueId);
    }
    if (publicationDate) formData.set("publicationDate", publicationDate);
    formData.set("authors", JSON.stringify(normalizedAuthors));
    formData.set(
      "references",
      JSON.stringify(
        references
          .filter((ref) => ref.citationText.trim().length > 0)
          .map((ref) => ({
            citationText: ref.citationText.trim(),
            url: ref.url.trim(),
          })),
      ),
    );
    for (const tagId of selectedTagIds) {
      formData.append("tagIds", tagId);
    }
    if (license.trim()) formData.set("license", license);
    if (externalUrl.trim()) formData.set("externalUrl", externalUrl);
    if (doi.trim()) formData.set("doi", doi);
    if (pageRange.trim()) formData.set("pageRange", pageRange);
    if (articleNumber.trim()) formData.set("articleNumber", articleNumber);
    if (notesToAdmin.trim()) formData.set("notesToAdmin", notesToAdmin);
    if (changeSummary.trim()) formData.set("changeSummary", changeSummary);
    if (supervisorName.trim()) formData.set("supervisorName", supervisorName);
    if (programName.trim()) formData.set("programName", programName);

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
      await submitResearchSubmission(formData);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        String((error as { digest: unknown }).digest).startsWith(
          "NEXT_REDIRECT",
        )
      ) {
        throw error;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.";
      toast.error(message);
      setIsSubmitting(false);
      setUploadPhase("idle");
    }
  }

  /* ---- Kickoff click ---- */
  function handleStartSubmission() {
    if (!selectedItemType) {
      toast.error("Please select an article type.");
      return;
    }
    setHasStarted(true);
  }

  /* ---- Computed ---- */
  const completedSteps = new Set<number>();
  if (canProceedFromStep(0) && visitedSteps.has(0)) completedSteps.add(0);
  if (canProceedFromStep(1) && visitedSteps.has(1)) completedSteps.add(1);
  if (canProceedFromStep(2) && visitedSteps.has(2)) completedSteps.add(2);
  if (visitedSteps.has(3)) completedSteps.add(3);

  const itemTypeLabel =
    availableItemTypes.find((t) => t.value === selectedItemType)?.label ??
    selectedItemType;

  /* ================================================================== */
  /*  KICKOFF PANEL                                                     */
  /* ================================================================== */

  if (!hasStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-lg"
      >
        <div className="rounded-xl border border-border/60 bg-card p-6 ring-1 ring-foreground/5 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Send className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                New manuscript
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedJournal?.name ?? "General Submission"}
              </p>
            </div>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            Select the type of article you&apos;d like to submit, then follow
            the guided steps to upload files, enter metadata, and review before
            submitting.
          </p>

          <div className="space-y-1.5 mb-6">
              <Label className="text-sm">
                Article type{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>
              <AnimatedSelect
                value={selectedItemType}
                onChange={setSelectedItemType}
                placeholder="Select article type..."
                options={availableItemTypes.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
              />
          </div>

          <Button
            onClick={handleStartSubmission}
            className="w-full"
            disabled={!selectedItemType}
          >
            <ArrowRight className="size-3.5" />
            Start submission
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ================================================================== */
  /*  STEP FORM                                                         */
  /* ================================================================== */

  return (
    <div>
      <StepIndicator
        currentStep={currentStep}
        onStepClick={goToStep}
        completedSteps={completedSteps}
      />

      <form ref={formRef} action={handleSubmit}>
        {/* Hidden fields for the server action */}
        <input type="hidden" name="returnTo" value={basePath} readOnly />
        <input
          type="hidden"
          name="workflowIntent"
          value={activeIntent}
          readOnly
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {/* ---- STEP 0: FILES ---- */}
            {currentStep === 0 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    Upload files
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload your manuscript PDF and a cover image / poster.
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <FileDropzone
                    id="pdf"
                    name="pdf"
                    accept="application/pdf"
                    maxSizeBytes={10 * 1024 * 1024}
                    file={selectedPdfFile}
                    fileIcon={<FileUp className="size-4 text-primary" />}
                    headerLabel={<Label className="text-sm">Main PDF <span className="font-normal text-destructive">*</span></Label>}
                    description="PDF only, up to 10 MB."
                    label="Click or drag to upload PDF"
                    sublabel="The main full-text document for review."
                    disabled={isSubmitting}
                    onFileChange={setSelectedPdfFile}
                    onRemove={() => setSelectedPdfFile(null)}
                  />

                  <FileDropzone
                    id="cover-image"
                    name="coverImage"
                    accept="image/jpeg,image/png,image/webp"
                    maxSizeBytes={5 * 1024 * 1024}
                    file={selectedCoverFile}
                    fileIcon={<FileImage className="size-4 text-primary" />}
                    headerLabel={<Label className="text-sm">Poster / thumbnail <span className="font-normal text-destructive">*</span></Label>}
                    description="JPG, PNG, or WEBP up to 5 MB."
                    label="Click or drag to upload cover image"
                    sublabel="Shown as the cover on the detail page."
                    disabled={isSubmitting}
                    onFileChange={setSelectedCoverFile}
                    onRemove={() => setSelectedCoverFile(null)}
                  />
                </div>
              </div>
            )}

            {/* ---- STEP 1: DETAILS ---- */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    Manuscript details
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Title, abstract, and classification metadata.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="step-title" className="text-sm">
                    Title{" "}
                    <span className="font-normal text-destructive">*</span>
                  </Label>
                  <Input
                    id="step-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Machine Learning in Healthcare: A Systematic Review"
                    disabled={isSubmitting}
                    maxLength={300}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {title.trim().length}/300
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="step-abstract" className="text-sm">
                    Abstract{" "}
                    <span className="font-normal text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="step-abstract"
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    placeholder="Provide a concise summary of the research (minimum 50 characters)."
                    disabled={isSubmitting}
                    maxLength={5000}
                    rows={5}
                    className="max-h-48 overflow-y-auto"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {abstract.trim().length}/5000
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Publication year{" "}
                      <span className="font-normal text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={publicationYear}
                      onChange={(e) => setPublicationYear(e.target.value)}
                      placeholder={new Date().getFullYear().toString()}
                      disabled={isSubmitting}
                      min={1900}
                      max={2100}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Department{" "}
                      <span className="font-normal text-destructive">*</span>
                    </Label>
                    <AnimatedSelect
                      value={selectedDepartmentId}
                      onChange={setSelectedDepartmentId}
                      disabled={isSubmitting}
                      placeholder="Select department..."
                      options={departments.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Journal</Label>
                    {isJournalLocked ? (
                      <Input value={selectedJournal?.name ?? "No journal selected"} disabled />
                    ) : (
                      <AnimatedSelect
                        value={selectedJournalId}
                        onChange={(value) => {
                          setSelectedJournalId(value);
                          setSelectedJournalIssueId("");
                        }}
                        disabled={isSubmitting}
                        placeholder="No journal selected"
                        options={availableJournals.map((entry) => ({
                          value: entry.id,
                          label: entry.name,
                        }))}
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Issue</Label>
                    <AnimatedSelect
                      value={selectedJournalIssueId}
                      onChange={setSelectedJournalIssueId}
                      disabled={isSubmitting || !selectedJournalId}
                      placeholder="Online first / no issue yet"
                      options={filteredJournalIssues.map((issue) => ({
                        value: issue.id,
                        label: `Vol. ${issue.volumeNumber} (${issue.volumeYear}) – Issue ${issue.issueNumber}${issue.issueTitle ? ` – ${issue.issueTitle}` : ""}`,
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Publication date</Label>
                  <Input
                    type="date"
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-3 rounded-xl border border-border/60 p-4">
                  <div>
                    <h4 className="text-sm font-semibold tracking-tight">
                      Tags
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Select the topics that best describe this manuscript.
                    </p>
                  </div>

                  {tags.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                      No tags are available yet.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {tags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <label
                            key={tag.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                              isSelected
                                ? "border-primary/40 bg-primary/5 text-foreground"
                                : "border-border/60 bg-background text-muted-foreground",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTag(tag.id)}
                              disabled={isSubmitting}
                            />
                            <span className="font-medium">{tag.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- STEP 2: AUTHORS ---- */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      Authors
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add authors in display order. At least one is required.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAuthor}
                    disabled={isSubmitting}
                  >
                    <Plus className="size-3.5" />
                    Add author
                  </Button>
                </div>

                <div className="space-y-3">
                  {authors.map((author, index) => (
                    <div
                      key={`author-${index}`}
                      className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-foreground">
                          Author {index + 1}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => moveAuthor(index, -1)}
                            disabled={isSubmitting || index === 0}
                          >
                            <ChevronUp className="size-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => moveAuthor(index, 1)}
                            disabled={
                              isSubmitting || index === authors.length - 1
                            }
                          >
                            <ChevronDown className="size-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeAuthor(index)}
                            disabled={isSubmitting || authors.length === 1}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label
                            htmlFor={`author-name-${index}`}
                            className="text-sm"
                          >
                            Display name{" "}
                            <span className="font-normal text-destructive">
                              *
                            </span>
                          </Label>
                          <Input
                            id={`author-name-${index}`}
                            value={author.displayName}
                            onChange={(e) =>
                              updateAuthor(
                                index,
                                "displayName",
                                e.target.value,
                              )
                            }
                            placeholder="Dr. Jane Smith"
                            disabled={isSubmitting}
                          />
                          {author.id && (
                            <p className="text-[10px] text-emerald-600">
                              Linked existing author
                            </p>
                          )}
                          {authorMatches[index] &&
                            authorMatches[index].length > 0 && (
                              <div className="mt-1.5 rounded-md border border-border/60 bg-background p-1.5">
                                <p className="mb-1 text-[10px] text-muted-foreground">
                                  Matching existing authors
                                </p>
                                <div className="space-y-1">
                                  {authorMatches[index].map((suggestion) => (
                                    <button
                                      key={suggestion.id}
                                      type="button"
                                      onClick={() =>
                                        applyAuthorSuggestion(
                                          index,
                                          suggestion,
                                        )
                                      }
                                      disabled={isSubmitting}
                                      className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-muted"
                                    >
                                      <span className="font-medium">
                                        {suggestion.displayName}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {suggestion.email ?? "No email"}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`author-affiliation-${index}`}
                            className="text-sm"
                          >
                            Affiliation
                          </Label>
                          <Input
                            id={`author-affiliation-${index}`}
                            value={author.affiliation}
                            onChange={(e) =>
                              updateAuthor(
                                index,
                                "affiliation",
                                e.target.value,
                              )
                            }
                            placeholder="Manipal University Jaipur"
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`author-email-${index}`}
                            className="text-sm"
                          >
                            Email
                          </Label>
                          <Input
                            id={`author-email-${index}`}
                            type="email"
                            value={author.email}
                            onChange={(e) =>
                              updateAuthor(index, "email", e.target.value)
                            }
                            placeholder="name@example.com"
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`author-orcid-${index}`}
                            className="text-sm"
                          >
                            ORCID
                          </Label>
                          <Input
                            id={`author-orcid-${index}`}
                            value={author.orcid}
                            onChange={(e) =>
                              updateAuthor(index, "orcid", e.target.value)
                            }
                            placeholder="0000-0000-0000-0000"
                            disabled={isSubmitting}
                          />
                        </div>

                        <label className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-xs font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={author.isCorresponding}
                            onChange={(e) =>
                              updateAuthor(
                                index,
                                "isCorresponding",
                                e.target.checked,
                              )
                            }
                            disabled={isSubmitting}
                          />
                          Corresponding author
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- STEP 3: DECLARATIONS ---- */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    Declarations &amp; additional info
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All fields on this step are optional.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">License</Label>
                    <Input
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      placeholder="e.g. CC BY 4.0"
                      maxLength={160}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">External URL</Label>
                    <Input
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      type="url"
                      placeholder="https://example.com/paper"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">DOI</Label>
                    <Input
                      value={doi}
                      onChange={(e) => setDoi(e.target.value)}
                      placeholder="10.1000/xyz123"
                      maxLength={255}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Page range</Label>
                    <Input
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="e.g. 12-28"
                      maxLength={30}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Article number</Label>
                    <Input
                      value={articleNumber}
                      onChange={(e) => setArticleNumber(e.target.value)}
                      placeholder="e2026-0004"
                      maxLength={30}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Supervisor name</Label>
                    <Input
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      placeholder="Dr. Jane Smith"
                      maxLength={160}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Program name</Label>
                  <Input
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="M.Tech Computer Science"
                    maxLength={160}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Change summary / version note</Label>
                  <Textarea
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Summarize what this version contains or what makes it important."
                    maxLength={1000}
                    rows={3}
                    disabled={isSubmitting}
                    className="max-h-36 overflow-y-auto"
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold tracking-tight">
                        References
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Optional bibliography/citation entries.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReference}
                      disabled={isSubmitting}
                    >
                      <Plus className="size-3.5" />
                      Add reference
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {references.map((ref, index) => (
                      <div
                        key={`reference-${index}`}
                        className="rounded-lg border border-border/50 bg-muted/20 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            Reference {index + 1}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => removeReference(index)}
                            disabled={isSubmitting || references.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Textarea
                            value={ref.citationText}
                            onChange={(e) =>
                              updateReference(index, "citationText", e.target.value)
                            }
                            placeholder="Citation text"
                            rows={2}
                            maxLength={2000}
                            disabled={isSubmitting}
                            className="max-h-32 overflow-y-auto"
                          />
                          <Input
                            value={ref.url}
                            onChange={(e) =>
                              updateReference(index, "url", e.target.value)
                            }
                            type="url"
                            placeholder="https://... (optional)"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Notes to admin / editor</Label>
                  <Textarea
                    value={notesToAdmin}
                    onChange={(e) => setNotesToAdmin(e.target.value)}
                    placeholder="Any additional context for the reviewer."
                    maxLength={1000}
                    rows={3}
                    disabled={isSubmitting}
                    className="max-h-36 overflow-y-auto"
                  />
                </div>
              </div>
            )}

            {/* ---- STEP 4: REVIEW ---- */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    Review your submission
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Verify the information below, then submit or save as draft.
                  </p>
                </div>

                {/* Files summary */}
                <div className="rounded-xl border border-border/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold tracking-tight">
                      Files
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => goToStep(0)}
                      className="text-xs text-primary"
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
                      <FileUp className="size-3.5 text-muted-foreground" />
                      <span className="truncate text-xs">
                        {selectedPdfFile
                          ? `${selectedPdfFile.name} (${formatFileSize(selectedPdfFile.size)})`
                          : "No PDF selected"}
                      </span>
                      {!selectedPdfFile && (
                        <AlertCircle className="size-3 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
                      <FileImage className="size-3.5 text-muted-foreground" />
                      <span className="truncate text-xs">
                        {selectedCoverFile
                          ? `${selectedCoverFile.name} (${formatFileSize(selectedCoverFile.size)})`
                          : "No cover image selected"}
                      </span>
                      {!selectedCoverFile && (
                        <AlertCircle className="size-3 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Details summary */}
                <div className="rounded-xl border border-border/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold tracking-tight">
                      Details
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => goToStep(1)}
                      className="text-xs text-primary"
                    >
                      Edit
                    </Button>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Title</dt>
                      <dd className="mt-0.5 font-medium text-foreground line-clamp-2">
                        {title || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {itemTypeLabel}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Year</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {publicationYear || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Department</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {departments.find(
                          (d) => d.id === selectedDepartmentId,
                        )?.name ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Journal</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {selectedJournal?.name ?? "No journal selected"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Issue</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {journalIssues.find(
                          (i) => i.id === selectedJournalIssueId,
                        )
                          ? `Vol. ${journalIssues.find((i) => i.id === selectedJournalIssueId)!.volumeNumber} – Issue ${journalIssues.find((i) => i.id === selectedJournalIssueId)!.issueNumber}`
                          : "Online first"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Abstract</dt>
                      <dd className="mt-0.5 font-medium text-foreground line-clamp-3 leading-relaxed">
                        {abstract || "—"}
                      </dd>
                    </div>
                    {selectedTagIds.length > 0 && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Tags</dt>
                        <dd className="mt-1 flex flex-wrap gap-1.5">
                          {selectedTagIds.map((tagId) => {
                            const tag = tags.find((t) => t.id === tagId);
                            return tag ? (
                              <span
                                key={tagId}
                                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary"
                              >
                                {tag.name}
                              </span>
                            ) : null;
                          })}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Authors summary */}
                <div className="rounded-xl border border-border/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold tracking-tight">
                      Authors ({authors.length})
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => goToStep(2)}
                      className="text-xs text-primary"
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {authors.map((author, index) => (
                      <div
                        key={`review-author-${index}`}
                        className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-foreground">
                          {author.displayName || "(no name)"}
                        </span>
                        {author.email && (
                          <span className="text-muted-foreground">
                            {author.email}
                          </span>
                        )}
                        {author.isCorresponding && (
                          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Corresponding
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Declarations summary */}
                {(license || externalUrl || doi || pageRange || articleNumber || notesToAdmin || changeSummary || supervisorName || programName || references.some((ref) => ref.citationText.trim().length > 0)) && (
                  <div className="rounded-xl border border-border/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold tracking-tight">
                        Declarations
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => goToStep(3)}
                        className="text-xs text-primary"
                      >
                        Edit
                      </Button>
                    </div>
                    <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                      {license && (
                        <div>
                          <dt className="text-muted-foreground">License</dt>
                          <dd className="mt-0.5 font-medium">{license}</dd>
                        </div>
                      )}
                      {doi && (
                        <div>
                          <dt className="text-muted-foreground">DOI</dt>
                          <dd className="mt-0.5 font-medium">{doi}</dd>
                        </div>
                      )}
                      {externalUrl && (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">
                            External URL
                          </dt>
                          <dd className="mt-0.5 truncate font-medium">
                            {externalUrl}
                          </dd>
                        </div>
                      )}
                      {pageRange && (
                        <div>
                          <dt className="text-muted-foreground">Page range</dt>
                          <dd className="mt-0.5 font-medium">{pageRange}</dd>
                        </div>
                      )}
                      {articleNumber && (
                        <div>
                          <dt className="text-muted-foreground">
                            Article number
                          </dt>
                          <dd className="mt-0.5 font-medium">
                            {articleNumber}
                          </dd>
                        </div>
                      )}
                      {supervisorName && (
                        <div>
                          <dt className="text-muted-foreground">Supervisor</dt>
                          <dd className="mt-0.5 font-medium">
                            {supervisorName}
                          </dd>
                        </div>
                      )}
                      {programName && (
                        <div>
                          <dt className="text-muted-foreground">Program</dt>
                          <dd className="mt-0.5 font-medium">{programName}</dd>
                        </div>
                      )}
                      {references.some((ref) => ref.citationText.trim().length > 0) && (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">References</dt>
                          <dd className="mt-1 space-y-1">
                            {references
                              .filter((ref) => ref.citationText.trim().length > 0)
                              .slice(0, 3)
                              .map((ref, index) => (
                                <p key={`review-ref-${index}`} className="text-xs">
                                  {ref.citationText}
                                </p>
                              ))}
                            {references.filter((ref) => ref.citationText.trim().length > 0)
                              .length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +
                                {references.filter(
                                  (ref) => ref.citationText.trim().length > 0,
                                ).length - 3} more
                              </p>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Submit buttons */}
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <Button
                    type="submit"
                    name="workflowIntent"
                    value="save_draft"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => setActiveIntent("save_draft")}
                    className="w-full"
                  >
                    {isSubmitting && activeIntent === "save_draft" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileUp className="size-3.5" />
                    )}
                    {uploadPhase === "uploading" && activeIntent === "save_draft"
                      ? "Uploading files..."
                      : uploadPhase === "saving" &&
                          activeIntent === "save_draft"
                        ? "Saving draft..."
                        : "Save draft"}
                  </Button>

                  <Button
                    type="submit"
                    name="workflowIntent"
                    value="submit"
                    disabled={isSubmitting}
                    onClick={() => setActiveIntent("submit")}
                    className="w-full"
                  >
                    {isSubmitting && activeIntent === "submit" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {uploadPhase === "uploading" && activeIntent === "submit"
                      ? "Uploading files..."
                      : uploadPhase === "saving" && activeIntent === "submit"
                        ? "Saving submission..."
                        : "Submit for review"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ---- Navigation ---- */}
        {currentStep < 4 && (
          <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-5">
            <Button
              type="button"
              variant="ghost"
              disabled={currentStep === 0 || isSubmitting}
              onClick={() => goToStep(currentStep - 1)}
              className="gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Step {currentStep + 1} of {STEPS.length}
              </span>
            </div>

            <Button
              type="button"
              disabled={!canProceedFromStep(currentStep) || isSubmitting}
              onClick={() => goToStep(currentStep + 1)}
              className="gap-1.5"
            >
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}

        {currentStep === 4 && (
          <div className="mt-6 flex items-center justify-start">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => goToStep(3)}
              className="gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={pendingAuthorConfirm !== null}
        title="Link existing author?"
        description={
          pendingAuthorConfirm
            ? `Use "${pendingAuthorConfirm.suggestion.displayName}" for Author ${pendingAuthorConfirm.index + 1}? This will overwrite the current name and email fields.`
            : ""
        }
        confirmLabel="Use this author"
        cancelLabel="Cancel"
        onConfirm={confirmAuthorSuggestion}
        onCancel={() => setPendingAuthorConfirm(null)}
      />
    </div>
  );
}
