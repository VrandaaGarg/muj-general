"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { submitResearchRevision } from "@/lib/actions/research";
import { RESEARCH_TYPE_OPTIONS } from "@/lib/research-types";
import {
  appendUploadMeta,
  presignedUpload,
} from "@/lib/uploads/presigned-upload";
import { cn } from "@/lib/utils";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

interface JournalOption {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
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

interface RevisionFile {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

interface RevisionItem {
  slug: string;
  status: string;
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  departmentId: string;
  journalId: string | null;
  journalIssueId: string | null;
  license: string | null;
  externalUrl: string | null;
  doi: string | null;
  pageRange: string | null;
  articleNumber: string | null;
  publicationDate: string;
  changeSummary: string | null;
  notesToAdmin: string | null;
  supervisorName: string | null;
  programName: string | null;
  latestRevisionRequest: {
    requestedAt: Date;
    requestedByName: string | null;
    requestedByRole: string | null;
    comment: string | null;
    source: "editor" | "admin";
  } | null;
  authors: Array<{
    id: string;
    displayName: string;
    email: string | null;
    affiliation: string | null;
    orcid: string | null;
    isCorresponding: boolean;
  }>;
  tagIds: string[];
  references: Array<{ citationText: string; url: string }>;
  pdfFile: RevisionFile | null;
  coverImageFile: RevisionFile | null;
}

interface ReferenceDraft {
  citationText: string;
  url: string;
}

interface EditorRevisionFormProps {
  item: RevisionItem;
  departments: Department[];
  tags: TagOption[];
  journals: JournalOption[];
  journalIssues: JournalIssueOption[];
}

const JOURNAL_ELIGIBLE_TYPES = new Set([
  "research_paper",
  "journal_article",
  "conference_paper",
]);

const REVISION_STEPS = [
  { key: "files", label: "Files", icon: FileUp },
  { key: "details", label: "Details", icon: FileText },
  { key: "authors", label: "Authors", icon: Users },
  { key: "declarations", label: "Declarations", icon: AlertCircle },
  { key: "review", label: "Review", icon: RefreshCw },
] as const;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function isValidAuthorEmail(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const REVISION_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" }
> = {
  "draft-saved": {
    text: "Draft saved successfully.",
    type: "success",
  },
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
  "missing-cover": {
    text: "A cover image is required for this item. Upload one before resubmitting.",
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

type RevisionDraftState = {
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: string;
  departmentId: string;
  publicationDate: string;
  selectedTagIds: string[];
  authors: AuthorDraft[];
  references: ReferenceDraft[];
  externalUrl: string;
  doi: string;
  changeSummary: string;
  showAdditional: boolean;
  license: string;
  supervisorName: string;
  programName: string;
  notesToAdmin: string;
  journalId: string;
  journalIssueId: string;
  pageRange: string;
  articleNumber: string;
};

function parseRevisionDraftState(value: string): RevisionDraftState | null {
  try {
    const parsed = JSON.parse(value) as Partial<RevisionDraftState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      abstract: typeof parsed.abstract === "string" ? parsed.abstract : "",
      itemType: typeof parsed.itemType === "string" ? parsed.itemType : "",
      publicationYear:
        typeof parsed.publicationYear === "string" ? parsed.publicationYear : "",
      departmentId:
        typeof parsed.departmentId === "string" ? parsed.departmentId : "",
      publicationDate:
        typeof parsed.publicationDate === "string" ? parsed.publicationDate : "",
      selectedTagIds: Array.isArray(parsed.selectedTagIds)
        ? parsed.selectedTagIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      authors: Array.isArray(parsed.authors)
        ? parsed.authors
            .filter((author) => author && typeof author === "object")
            .map((author) => ({
              id: typeof author.id === "string" ? author.id : undefined,
              displayName:
                typeof author.displayName === "string" ? author.displayName : "",
              email: typeof author.email === "string" ? author.email : "",
              affiliation:
                typeof author.affiliation === "string" ? author.affiliation : "",
              orcid: typeof author.orcid === "string" ? author.orcid : "",
              isCorresponding: Boolean(author.isCorresponding),
            }))
        : [createEmptyAuthor(true)],
      references: Array.isArray(parsed.references)
        ? parsed.references
            .filter((reference) => reference && typeof reference === "object")
            .map((reference) => ({
              citationText:
                typeof reference.citationText === "string"
                  ? reference.citationText
                  : "",
              url: typeof reference.url === "string" ? reference.url : "",
            }))
        : [{ citationText: "", url: "" }],
      externalUrl:
        typeof parsed.externalUrl === "string" ? parsed.externalUrl : "",
      doi: typeof parsed.doi === "string" ? parsed.doi : "",
      changeSummary:
        typeof parsed.changeSummary === "string" ? parsed.changeSummary : "",
      showAdditional: Boolean(parsed.showAdditional),
      license: typeof parsed.license === "string" ? parsed.license : "",
      supervisorName:
        typeof parsed.supervisorName === "string" ? parsed.supervisorName : "",
      programName:
        typeof parsed.programName === "string" ? parsed.programName : "",
      notesToAdmin:
        typeof parsed.notesToAdmin === "string" ? parsed.notesToAdmin : "",
      journalId: typeof parsed.journalId === "string" ? parsed.journalId : "",
      journalIssueId:
        typeof parsed.journalIssueId === "string" ? parsed.journalIssueId : "",
      pageRange: typeof parsed.pageRange === "string" ? parsed.pageRange : "",
      articleNumber:
        typeof parsed.articleNumber === "string" ? parsed.articleNumber : "",
    };
  } catch {
    return null;
  }
}

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
    <nav aria-label="Revision steps">
      <div className="hidden sm:flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
        {REVISION_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === index;
          const isPast = index < currentStep;
          const isCompleted = completedSteps.has(index);

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : isPast || isCompleted
                      ? "text-foreground hover:bg-background"
                      : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[10px]",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isPast || isCompleted
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isPast || isCompleted ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </span>
                <span className="hidden md:inline">{step.label}</span>
              </button>
              {index < REVISION_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px flex-1",
                    index < currentStep ? "bg-primary/30" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/20 p-2 sm:hidden">
        {REVISION_STEPS.map((step, index) => (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepClick(index)}
            className="flex-1"
            aria-label={`Go to ${step.label}`}
          >
            <div
              className={cn(
                "h-1.5 rounded-full",
                index === currentStep
                  ? "bg-primary"
                  : index < currentStep
                    ? "bg-primary/40"
                    : "bg-muted",
              )}
            />
          </button>
        ))}
      </div>
    </nav>
  );
}

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

export function EditorRevisionForm({
  item,
  departments,
  tags,
  journals,
  journalIssues,
}: EditorRevisionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revisionParam = searchParams.get("revision");
  const handledRevisionParamRef = useRef<string | null>(null);

  const revisionDraftStorageKey = `editor-revision-draft:${item.slug}`;
  const storedDraft = useMemo(() => {
    if (typeof window === "undefined") return null;
    const rawDraft = window.localStorage.getItem(revisionDraftStorageKey);
    return rawDraft ? parseRevisionDraftState(rawDraft) : null;
  }, [revisionDraftStorageKey]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "saving">("idle");
  const [activeIntent, setActiveIntent] = useState<"submit" | "save_draft">("submit");
  const [selectedItemType, setSelectedItemType] = useState(
    storedDraft?.itemType ?? item.itemType,
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    storedDraft?.departmentId ?? item.departmentId,
  );
  const [selectedJournalId, setSelectedJournalId] = useState(
    storedDraft?.journalId ?? item.journalId ?? "",
  );
  const [selectedJournalIssueId, setSelectedJournalIssueId] = useState(
    storedDraft?.journalIssueId ?? item.journalIssueId ?? "",
  );
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [authors, setAuthors] = useState<AuthorDraft[]>(
    storedDraft?.authors.length
      ? storedDraft.authors
      : item.authors.length > 0
      ? item.authors.map(toAuthorDraft)
      : [createEmptyAuthor(true)],
  );
  const [authorMatches, setAuthorMatches] = useState<
    Record<number, AuthorSuggestion[]>
  >({});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    storedDraft?.selectedTagIds ?? item.tagIds,
  );
  const [references, setReferences] = useState<ReferenceDraft[]>(
    storedDraft?.references.length
      ? storedDraft.references
      : item.references.length > 0
        ? item.references
        : [{ citationText: "", url: "" }],
  );
  const [title, setTitle] = useState(storedDraft?.title ?? item.title);
  const [abstract, setAbstract] = useState(storedDraft?.abstract ?? item.abstract);
  const [publicationYear, setPublicationYear] = useState(
    storedDraft?.publicationYear ?? String(item.publicationYear),
  );
  const [publicationDate, setPublicationDate] = useState(
    storedDraft?.publicationDate ?? item.publicationDate,
  );
  const [externalUrl, setExternalUrl] = useState(
    storedDraft?.externalUrl ?? item.externalUrl ?? "",
  );
  const [doi, setDoi] = useState(storedDraft?.doi ?? item.doi ?? "");
  const [changeSummary, setChangeSummary] = useState(
    storedDraft?.changeSummary ?? item.changeSummary ?? "",
  );
  const [showAdditional, setShowAdditional] = useState(
    storedDraft?.showAdditional ??
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
  const [license, setLicense] = useState(storedDraft?.license ?? item.license ?? "");
  const [supervisorName, setSupervisorName] = useState(
    storedDraft?.supervisorName ?? item.supervisorName ?? "",
  );
  const [programName, setProgramName] = useState(
    storedDraft?.programName ?? item.programName ?? "",
  );
  const [notesToAdmin, setNotesToAdmin] = useState(
    storedDraft?.notesToAdmin ?? item.notesToAdmin ?? "",
  );
  const [pageRange, setPageRange] = useState(
    storedDraft?.pageRange ?? item.pageRange ?? "",
  );
  const [articleNumber, setArticleNumber] = useState(
    storedDraft?.articleNumber ?? item.articleNumber ?? "",
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [pendingAuthorConfirm, setPendingAuthorConfirm] = useState<{
    index: number;
    suggestion: AuthorSuggestion;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timeout = window.setTimeout(() => {
      const draft: RevisionDraftState = {
        title,
        abstract,
        itemType: selectedItemType,
        publicationYear,
        departmentId: selectedDepartmentId,
        publicationDate,
        selectedTagIds,
        authors,
        references,
        externalUrl,
        doi,
        changeSummary,
        showAdditional,
        license,
        supervisorName,
        programName,
        notesToAdmin,
        journalId: selectedJournalId,
        journalIssueId: selectedJournalIssueId,
        pageRange,
        articleNumber,
      };

      window.localStorage.setItem(revisionDraftStorageKey, JSON.stringify(draft));
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    revisionDraftStorageKey,
    title,
    abstract,
    selectedItemType,
    publicationYear,
    selectedDepartmentId,
    publicationDate,
    selectedTagIds,
    authors,
    references,
    externalUrl,
    doi,
    changeSummary,
    showAdditional,
    license,
    supervisorName,
    programName,
    notesToAdmin,
    selectedJournalId,
    selectedJournalIssueId,
    pageRange,
    articleNumber,
  ]);

  useEffect(() => {
    if (!revisionParam) return;
    if (handledRevisionParamRef.current === revisionParam) return;

    handledRevisionParamRef.current = revisionParam;
    const msg = REVISION_MESSAGES[revisionParam];
    if (!msg) return;
    if (msg.type === "success") {
      toast.success(msg.text);
    } else {
      toast.error(msg.text);
    }
    if (revisionParam === "submitted") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(revisionDraftStorageKey);
      }
    }
    router.replace(`/editor/${item.slug}/revise`, { scroll: false });
  }, [revisionParam, router, item.slug, revisionDraftStorageKey]);

  const isResubmitted = revisionParam === "submitted";
  const isDisabled = isSubmitting || isResubmitted;
  const isDraftItem = item.status === "draft";
  const eligibleForJournal = JOURNAL_ELIGIBLE_TYPES.has(selectedItemType);
  const filteredJournalIssues = journalIssues.filter(
    (issue) => issue.journalId === selectedJournalId,
  );
  const authorSearchTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
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
    if (!currentAuthor) {
      return;
    }

    const query = normalizeSearch(`${currentAuthor.displayName} ${currentAuthor.email}`);
    if (query.length < 2) {
      setAuthorMatches((current) => ({ ...current, [index]: [] }));
      return;
    }

    const selectedIds = new Set(
      nextAuthors
        .map((author) => author.id)
        .filter((value): value is string => Boolean(value)),
    );
    if (currentAuthor.id) {
      selectedIds.delete(currentAuthor.id);
    }

    const existingTimeout = authorSearchTimeoutsRef.current[index];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    authorSearchTimeoutsRef.current[index] = setTimeout(async () => {
      const requestSeq = (authorSearchRequestSeqRef.current[index] ?? 0) + 1;
      authorSearchRequestSeqRef.current[index] = requestSeq;

      try {
        const response = await fetch(
          `/api/authors/search?query=${encodeURIComponent(query)}&limit=5`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          results: AuthorSuggestion[];
        };

        if (authorSearchRequestSeqRef.current[index] !== requestSeq) {
          return;
        }

        setAuthorMatches((current) => ({
          ...current,
          [index]: payload.results.filter((suggestion) => !selectedIds.has(suggestion.id)),
        }));
      } catch {
        setAuthorMatches((current) => ({ ...current, [index]: [] }));
      }
    }, 250);
  }

  function addReference() {
    setReferences((current) => [...current, { citationText: "", url: "" }]);
  }

  function removeReference(index: number) {
    setReferences((current) => current.filter((_, i) => i !== index));
  }

  function updateReference<K extends keyof ReferenceDraft>(
    index: number,
    field: K,
    value: ReferenceDraft[K],
  ) {
    setReferences((current) =>
      current.map((ref, i) => (i === index ? { ...ref, [field]: value } : ref)),
    );
  }

  function updateAuthor<K extends keyof AuthorDraft>(
    index: number,
    field: K,
    value: AuthorDraft[K],
  ) {
    setAuthors((current) => {
      const nextAuthors = current.map((author, authorIndex) =>
        authorIndex === index
          ? {
              ...author,
              [field]: value,
              ...(field !== "isCorresponding" ? { id: undefined } : {}),
            }
          : author,
      );

      if (field === "displayName" || field === "email") {
        queueAuthorSearch(index, nextAuthors);
      }

      return nextAuthors;
    });
  }

  function applyAuthorSuggestion(index: number, suggestion: AuthorSuggestion) {
    setPendingAuthorConfirm({ index, suggestion });
  }

  function confirmAuthorSuggestion() {
    if (!pendingAuthorConfirm) return;
    const { index, suggestion } = pendingAuthorConfirm;

    setAuthors((current) =>
      current.map((author, authorIndex) =>
        authorIndex === index
          ? {
              ...author,
              id: suggestion.id,
              displayName: suggestion.displayName,
              email: suggestion.email ?? "",
            }
          : author,
      ),
    );
    setAuthorMatches((current) => ({ ...current, [index]: [] }));
    setPendingAuthorConfirm(null);
  }

  function cancelAuthorSuggestion() {
    setPendingAuthorConfirm(null);
  }

  function addAuthor() {
    clearAuthorSearches();
    setAuthors((current) => [...current, createEmptyAuthor(false)]);
  }

  function removeAuthor(index: number) {
    clearAuthorSearches();
    setAuthors((current) =>
      current.length === 1
        ? current
        : current.filter((_, authorIndex) => authorIndex !== index),
    );
  }

  function moveAuthor(index: number, direction: -1 | 1) {
    clearAuthorSearches();
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

  function canProceedFromStep(step: number) {
    const normalizedAuthors = getNormalizedAuthors();

    switch (step) {
      case 0:
        return item.pdfFile !== null || selectedPdfFile !== null;
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
      default:
        return true;
    }
  }

  function getStepValidationMessage(step: number) {
    const normalizedAuthors = getNormalizedAuthors();

    switch (step) {
      case 0:
        if (!item.pdfFile && !selectedPdfFile) {
          return "A PDF is required before continuing.";
        }
        if (!item.coverImageFile && !selectedCoverFile) {
          return "A cover image is required before continuing.";
        }
        return null;
      case 1:
        if (title.trim().length < 5) return "Title must be at least 5 characters.";
        if (abstract.trim().length < 50) {
          return "Abstract must be at least 50 characters.";
        }
        if (!publicationYear.trim()) return "Publication year is required.";
        if (!selectedDepartmentId) return "Department is required.";
        return null;
      case 2:
        if (normalizedAuthors.length === 0) {
          return "Add at least one author before continuing.";
        }
        if (normalizedAuthors.some((author) => author.displayName.length < 2)) {
          return "Each author must have a name with at least 2 characters.";
        }
        if (normalizedAuthors.some((author) => !isValidAuthorEmail(author.email))) {
          return "Use a valid author email address, or leave it empty.";
        }
        return null;
      default:
        return null;
    }
  }

  function goToStep(target: number) {
    if (target < 0 || target >= REVISION_STEPS.length) return;

    if (target > currentStep) {
      const message = getStepValidationMessage(currentStep);
      if (message) {
        toast.error(message);
        return;
      }
    }

    setCurrentStep(target);
    setVisitedSteps((prev) => new Set([...prev, target]));
  }

  async function handleSubmit(formData: FormData) {
    const workflowIntent =
      formData.get("workflowIntent") === "save_draft" ? "save_draft" : "submit";
    setActiveIntent(workflowIntent);

    if (
      workflowIntent === "submit" &&
      !item.coverImageFile &&
      !selectedCoverFile
    ) {
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

    formData.set("authors", JSON.stringify(normalizedAuthors));
    formData.set(
      "references",
      JSON.stringify(references.filter((r) => r.citationText.trim())),
    );

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

  const completedSteps = new Set<number>();
  if (canProceedFromStep(0) && visitedSteps.has(0)) completedSteps.add(0);
  if (canProceedFromStep(1) && visitedSteps.has(1)) completedSteps.add(1);
  if (canProceedFromStep(2) && visitedSteps.has(2)) completedSteps.add(2);
  if (visitedSteps.has(3)) completedSteps.add(3);

  const normalizedAuthors = getNormalizedAuthors();
  const selectedJournalName =
    journals.find((journal) => journal.id === selectedJournalId)?.name ?? null;

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <RefreshCw className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Revise with guided steps
              </CardTitle>
              <CardDescription>
                Review the request, update your files and metadata, then resubmit for the next review cycle.
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

            {item.latestRevisionRequest && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">
                    <AlertCircle className="size-3.5" />
                    Revision requested
                  </span>
                  <span className="text-muted-foreground">
                    {item.latestRevisionRequest.requestedByRole === "admin" ? "Admin" : "Editor"}
                    {item.latestRevisionRequest.requestedByName ? ` - ${item.latestRevisionRequest.requestedByName}` : ""}
                  </span>
                </div>
                {item.latestRevisionRequest.comment && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {item.latestRevisionRequest.comment}
                  </p>
                )}
              </div>
            )}

            <StepIndicator
              currentStep={currentStep}
              onStepClick={goToStep}
              completedSteps={completedSteps}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">Files</h3>
                      <p className="text-sm text-muted-foreground">
                        Replace your manuscript assets only where needed. Existing files remain unless you upload a new version.
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FileDropzone
                        id="revision-pdf"
                        name="pdf"
                        accept="application/pdf"
                        maxSizeBytes={10 * 1024 * 1024}
                        file={selectedPdfFile}
                        existingFile={item.pdfFile ? { originalName: item.pdfFile.originalName, sizeBytes: item.pdfFile.sizeBytes } : null}
                        fileIcon={<FileUp className="size-4 text-primary" />}
                        headerLabel={<Label className="text-sm">Main PDF</Label>}
                        description="Leave empty to keep the current PDF."
                        label="Click or drag to upload a new PDF"
                        sublabel="PDF only, up to 10 MB."
                        disabled={isDisabled}
                        onFileChange={setSelectedPdfFile}
                        onRemove={() => setSelectedPdfFile(null)}
                      />

                      <FileDropzone
                        id="revision-cover-image"
                        name="coverImage"
                        accept="image/jpeg,image/png,image/webp"
                        maxSizeBytes={5 * 1024 * 1024}
                        file={selectedCoverFile}
                        existingFile={item.coverImageFile ? { originalName: item.coverImageFile.originalName, sizeBytes: item.coverImageFile.sizeBytes } : null}
                        fileIcon={<FileImage className="size-4 text-primary" />}
                        headerLabel={<Label className="text-sm">Poster / thumbnail image {item.coverImageFile ? <span className="font-normal text-muted-foreground">(replace optional)</span> : <span className="text-destructive">*</span>}</Label>}
                        description={item.coverImageFile ? "Leave empty to keep the current image." : "A cover image is required. JPG, PNG, or WEBP up to 5 MB."}
                        label="Click or drag to upload a new poster / thumbnail"
                        sublabel="JPG, PNG, or WEBP up to 5 MB."
                        disabled={isDisabled}
                        onFileChange={setSelectedCoverFile}
                        onRemove={() => setSelectedCoverFile(null)}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">Details</h3>
                      <p className="text-sm text-muted-foreground">Update the manuscript details that will be reviewed with this revision.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="title" className="text-sm">Title <span className="font-normal text-destructive">*</span></Label>
                      <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={5} maxLength={300} disabled={isDisabled} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="abstract" className="text-sm">Abstract <span className="font-normal text-destructive">*</span></Label>
                      <Textarea id="abstract" name="abstract" value={abstract} onChange={(event) => setAbstract(event.target.value)} required minLength={50} maxLength={5000} rows={6} disabled={isDisabled} className="max-h-48 overflow-y-auto" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="itemType" className="text-sm">Item type <span className="font-normal text-destructive">*</span></Label>
                        <AnimatedSelect id="itemType" name="itemType" required value={selectedItemType} onChange={(nextType) => { setSelectedItemType(nextType); if (!JOURNAL_ELIGIBLE_TYPES.has(nextType)) { setSelectedJournalId(""); setSelectedJournalIssueId(""); setPageRange(""); setArticleNumber(""); } }} disabled={isDisabled} placeholder="Select type..." options={RESEARCH_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="publicationYear" className="text-sm">Publication year <span className="font-normal text-destructive">*</span></Label>
                        <Input id="publicationYear" name="publicationYear" type="number" value={publicationYear} onChange={(event) => setPublicationYear(event.target.value)} required min={1900} max={2100} disabled={isDisabled} />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="departmentId" className="text-sm">Department <span className="font-normal text-destructive">*</span></Label>
                        <AnimatedSelect id="departmentId" name="departmentId" required value={selectedDepartmentId} onChange={setSelectedDepartmentId} disabled={isDisabled} placeholder="Select department..." options={departments.map((department) => ({ value: department.id, label: `${department.name}${department.archivedAt ? " (Archived)" : ""}` }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="publicationDate" className="text-sm">Publication date</Label>
                        <Input id="publicationDate" name="publicationDate" type="date" value={publicationDate} onChange={(event) => setPublicationDate(event.target.value)} disabled={isDisabled} />
                      </div>
                    </div>
                    <div className="space-y-3 rounded-xl border border-border/60 p-4">
                      <div>
                        <h3 className="text-sm font-semibold tracking-tight">Tags</h3>
                        <p className="text-xs text-muted-foreground">Update the discovery topics attached to this item.</p>
                      </div>
                      {tags.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">No tags are available yet. An admin needs to create them first.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {tags.map((tag) => {
                            const isSelected = selectedTagIds.includes(tag.id);
                            return (
                              <label key={tag.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors", isSelected ? "border-primary/40 bg-primary/5 text-foreground" : "border-border/60 bg-background text-muted-foreground")}>
                                <input type="checkbox" checked={isSelected} onChange={() => toggleTag(tag.id)} disabled={isDisabled} />
                                <span className="font-medium">{tag.name}{tag.archivedAt ? " (Archived)" : ""}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {eligibleForJournal && (
                      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                        <div>
                          <h3 className="text-sm font-semibold tracking-tight">Journal assignment</h3>
                          <p className="text-xs text-muted-foreground">Keep this item standalone, assign it online-first, or place it into a specific issue.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="journalId" className="text-sm">Journal</Label>
                            <AnimatedSelect id="journalId" name="journalId" value={selectedJournalId} onChange={(val) => { setSelectedJournalId(val); setSelectedJournalIssueId(""); if (!val) { setPageRange(""); setArticleNumber(""); } }} disabled={isDisabled} placeholder="Standalone / no journal" options={[{ value: "", label: "None / standalone" }, ...journals.map((journal) => ({ value: journal.id, label: journal.name }))]} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="journalIssueId" className="text-sm">Issue</Label>
                            <AnimatedSelect id="journalIssueId" name="journalIssueId" value={selectedJournalIssueId} onChange={setSelectedJournalIssueId} disabled={isDisabled || !selectedJournalId} placeholder="Online first / no issue yet" options={filteredJournalIssues.map((issue) => ({ value: issue.id, label: `Vol. ${issue.volumeNumber} (${issue.volumeYear}) - Issue ${issue.issueNumber}${issue.issueTitle ? ` - ${issue.issueTitle}` : ""}` }))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4 rounded-xl border border-border/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">Authors</h3>
                        <p className="text-sm text-muted-foreground">Keep authors in display order and mark the corresponding author where needed.</p>
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
                              <Button type="button" variant="ghost" size="icon-xs" onClick={() => moveAuthor(index, -1)} disabled={isDisabled || index === 0}><ChevronUp className="size-3" /></Button>
                              <Button type="button" variant="ghost" size="icon-xs" onClick={() => moveAuthor(index, 1)} disabled={isDisabled || index === authors.length - 1}><ChevronDown className="size-3" /></Button>
                              <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeAuthor(index)} disabled={isDisabled || authors.length === 1}><X className="size-3" /></Button>
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                              <Label htmlFor={`author-name-${index}`} className="text-sm">Display name <span className="font-normal text-destructive">*</span></Label>
                              <Input id={`author-name-${index}`} value={author.displayName} onChange={(event) => updateAuthor(index, "displayName", event.target.value)} placeholder="Dr. Jane Smith" required disabled={isDisabled} />
                              {author.id && <p className="text-[10px] text-emerald-600">Linked existing author</p>}
                              {authorMatches[index] && authorMatches[index].length > 0 && (
                                <div className="mt-1.5 rounded-md border border-border/60 bg-background p-1.5">
                                  <p className="mb-1 text-[10px] text-muted-foreground">Matching existing authors</p>
                                  <div className="space-y-1">
                                    {authorMatches[index].map((suggestion) => (
                                      <button key={suggestion.id} type="button" onClick={() => applyAuthorSuggestion(index, suggestion)} disabled={isDisabled} className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-muted">
                                        <span className="font-medium">{suggestion.displayName}</span>
                                        <span className="text-muted-foreground">{suggestion.email ?? "No email"}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5"><Label htmlFor={`author-affiliation-${index}`} className="text-sm">Affiliation</Label><Input id={`author-affiliation-${index}`} value={author.affiliation} onChange={(event) => updateAuthor(index, "affiliation", event.target.value)} placeholder="Manipal University Jaipur" disabled={isDisabled} /></div>
                            <div className="space-y-1.5"><Label htmlFor={`author-email-${index}`} className="text-sm">Email</Label><Input id={`author-email-${index}`} type="email" value={author.email} onChange={(event) => updateAuthor(index, "email", event.target.value)} placeholder="name@example.com" disabled={isDisabled} /></div>
                            <div className="space-y-1.5"><Label htmlFor={`author-orcid-${index}`} className="text-sm">ORCID</Label><Input id={`author-orcid-${index}`} value={author.orcid} onChange={(event) => updateAuthor(index, "orcid", event.target.value)} placeholder="0000-0000-0000-0000" disabled={isDisabled} /></div>
                            <label className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-xs font-medium text-foreground"><input type="checkbox" checked={author.isCorresponding} onChange={(event) => updateAuthor(index, "isCorresponding", event.target.checked)} disabled={isDisabled} />Corresponding author</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">Declarations</h3>
                      <p className="text-sm text-muted-foreground">Summarize changes, update references, and include any reviewer-facing context.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label htmlFor="externalUrl" className="text-sm">Reference / external URL</Label><Input id="externalUrl" name="externalUrl" type="url" placeholder="https://example.com/paper" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} disabled={isDisabled} /></div>
                      <div className="space-y-1.5"><Label htmlFor="doi" className="text-sm">DOI</Label><Input id="doi" name="doi" placeholder="10.1000/xyz123" value={doi} onChange={(event) => setDoi(event.target.value)} maxLength={255} disabled={isDisabled} /></div>
                    </div>
                    <div className="space-y-1.5"><Label htmlFor="changeSummary" className="text-sm">Change summary / version note</Label><Textarea id="changeSummary" name="changeSummary" placeholder="Summarize what changed in this revision." value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} maxLength={1000} rows={4} disabled={isDisabled} className="max-h-40 overflow-y-auto" /></div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between"><Label className="text-sm">References</Label><Button type="button" variant="outline" size="sm" onClick={addReference} disabled={isDisabled} className="h-7 gap-1 text-xs"><Plus className="size-3" />Add reference</Button></div>
                      {references.map((ref, index) => (
                        <div key={index} className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
                          <span className="mt-1.5 text-xs font-medium text-muted-foreground">[{index + 1}]</span>
                          <div className="flex-1 space-y-2">
                            <Input value={ref.citationText} onChange={(e) => updateReference(index, "citationText", e.target.value)} placeholder="Author(s), Title, Journal/Conference, Year" disabled={isDisabled} className="text-xs" />
                            <Input value={ref.url} onChange={(e) => updateReference(index, "url", e.target.value)} placeholder="URL or DOI link (optional)" disabled={isDisabled} className="text-xs" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeReference(index)} disabled={isDisabled} className="mt-0.5 size-7 shrink-0 text-muted-foreground hover:text-destructive"><X className="size-3.5" /></Button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setShowAdditional((current) => !current)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">{showAdditional ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}Additional metadata</button>
                    {showAdditional && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.2 }} className="space-y-4 overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label htmlFor="license" className="text-sm">License</Label><Input id="license" name="license" placeholder="e.g. CC BY 4.0" value={license} onChange={(event) => setLicense(event.target.value)} maxLength={160} disabled={isDisabled} /></div>
                          <div className="space-y-1.5"><Label htmlFor="supervisorName" className="text-sm">Supervisor name</Label><Input id="supervisorName" name="supervisorName" placeholder="Dr. Jane Smith" value={supervisorName} onChange={(event) => setSupervisorName(event.target.value)} maxLength={160} disabled={isDisabled} /></div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label htmlFor="programName" className="text-sm">Program name</Label><Input id="programName" name="programName" placeholder="M.Tech Computer Science" value={programName} onChange={(event) => setProgramName(event.target.value)} maxLength={160} disabled={isDisabled} /></div>
                          <div className="space-y-1.5"><Label htmlFor="notesToAdmin" className="text-sm">Notes to admin</Label><Textarea id="notesToAdmin" name="notesToAdmin" placeholder="Any additional context for the reviewer." value={notesToAdmin} onChange={(event) => setNotesToAdmin(event.target.value)} maxLength={1000} rows={3} disabled={isDisabled} className="max-h-36 overflow-y-auto" /></div>
                        </div>
                        {eligibleForJournal && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label htmlFor="pageRange" className="text-sm">Page range</Label><Input id="pageRange" name="pageRange" value={pageRange} onChange={(event) => setPageRange(event.target.value)} placeholder="e.g. 12-28" maxLength={30} disabled={isDisabled || !selectedJournalId} /></div>
                            <div className="space-y-1.5"><Label htmlFor="articleNumber" className="text-sm">Article number</Label><Input id="articleNumber" name="articleNumber" value={articleNumber} onChange={(event) => setArticleNumber(event.target.value)} placeholder="e2026-0004" maxLength={30} disabled={isDisabled || !selectedJournalId} /></div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">Review</h3>
                      <p className="text-sm text-muted-foreground">Confirm the updated submission package before saving or resubmitting.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                        <p className="font-medium text-foreground">Core details</p>
                        <div className="mt-3 space-y-2 text-muted-foreground">
                          <p><span className="font-medium text-foreground">Title:</span> {title || "-"}</p>
                          <p><span className="font-medium text-foreground">Type:</span> {RESEARCH_TYPE_OPTIONS.find((option) => option.value === selectedItemType)?.label ?? "-"}</p>
                          <p><span className="font-medium text-foreground">Year:</span> {publicationYear || "-"}</p>
                          <p><span className="font-medium text-foreground">Department:</span> {departments.find((department) => department.id === selectedDepartmentId)?.name ?? "-"}</p>
                          <p><span className="font-medium text-foreground">Journal:</span> {selectedJournalName ?? "Standalone"}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                        <p className="font-medium text-foreground">Revision package</p>
                        <div className="mt-3 space-y-2 text-muted-foreground">
                          <p><span className="font-medium text-foreground">Authors:</span> {normalizedAuthors.length}</p>
                          <p><span className="font-medium text-foreground">Tags:</span> {selectedTagIds.length}</p>
                          <p><span className="font-medium text-foreground">References:</span> {references.filter((reference) => reference.citationText.trim().length > 0).length}</p>
                          <p><span className="font-medium text-foreground">PDF:</span> {selectedPdfFile ? `${selectedPdfFile.name} (new)` : item.pdfFile?.originalName ?? "Missing"}</p>
                          <p><span className="font-medium text-foreground">Cover:</span> {selectedCoverFile ? `${selectedCoverFile.name} (new)` : item.coverImageFile?.originalName ?? "Missing"}</p>
                        </div>
                      </div>
                    </div>
                    {changeSummary && (
                      <div className="rounded-xl border border-border/60 bg-background p-4">
                        <p className="text-sm font-medium text-foreground">Change summary</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{changeSummary}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between border-t border-border/40 pt-5">
              <Button type="button" variant="ghost" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0 || isDisabled}>
                <ArrowLeft className="size-3.5" />
                Back
              </Button>

              {currentStep < REVISION_STEPS.length - 1 ? (
                <Button type="button" onClick={() => goToStep(currentStep + 1)} disabled={isDisabled}>
                  Next
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <div className={isDraftItem ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
                  {isDraftItem && (
                    <Button type="submit" name="workflowIntent" value="save_draft" variant="outline" disabled={isDisabled} onClick={() => setActiveIntent("save_draft")}>
                      {isSubmitting && activeIntent === "save_draft" ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
                      {uploadPhase === "uploading" && activeIntent === "save_draft" ? "Uploading files..." : uploadPhase === "saving" && activeIntent === "save_draft" ? "Saving draft..." : "Save draft"}
                    </Button>
                  )}
                  <Button type="submit" name="workflowIntent" value="submit" disabled={isDisabled} onClick={() => setActiveIntent("submit")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {isSubmitting && activeIntent === "submit" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    {uploadPhase === "uploading" && activeIntent === "submit" ? "Uploading files..." : uploadPhase === "saving" && activeIntent === "submit" ? "Saving revision..." : isDraftItem ? "Submit for review" : "Resubmit for review"}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

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
        onCancel={cancelAuthorSuggestion}
      />
    </div>
  );
}
