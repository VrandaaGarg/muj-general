"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  ScrollText,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createJournalAction } from "@/lib/actions/admin";
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

type StructuredSection = { heading: string; content: string };

const STRUCTURED_SECTION_EXAMPLES: Record<
  string,
  { heading: string; content: string }
> = {
  ethicsPolicy: {
    heading: "Research integrity",
    content:
      "All submissions must follow COPE ethics standards and include conflict-of-interest declarations.",
  },
  disclosuresPolicy: {
    heading: "Conflict disclosures",
    content:
      "Authors, editors, and reviewers must disclose financial or personal conflicts related to the manuscript.",
  },
  rightsPermissions: {
    heading: "Copyright and reuse",
    content:
      "Articles are published under CC BY 4.0 unless otherwise specified. Permission is required for third-party copyrighted material.",
  },
  contactInfo: {
    heading: "Editorial office",
    content:
      "Email: journal@muj.edu.in | Support hours: Mon-Fri, 10:00 AM - 5:00 PM IST.",
  },
  submissionChecklist: {
    heading: "Before you submit",
    content:
      "Ensure manuscript formatting, abstract, keywords, references, and ethical declarations are complete.",
  },
  submissionGuidelines: {
    heading: "Manuscript format",
    content:
      "Submit in DOCX or LaTeX format, include structured abstract, and follow journal citation style.",
  },
  howToPublish: {
    heading: "Publishing workflow",
    content:
      "Submit manuscript -> editorial screening -> peer review -> revisions -> acceptance -> publication.",
  },
  feesAndFunding: {
    heading: "Article processing charges",
    content:
      "No APC for student submissions. Funded projects may include publication support as per grant terms.",
  },
};

function slugifyJournalName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type JournalOverview = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageKey: string | null;
  issn: string | null;
  eissn: string | null;
  aimAndScope: string | null;
  topics: string | null;
  contentTypes: string | null;
  ethicsPolicy: StructuredSection[] | null;
  disclosuresPolicy: StructuredSection[] | null;
  rightsPermissions: StructuredSection[] | null;
  contactInfo: StructuredSection[] | null;
  submissionChecklist: StructuredSection[] | null;
  submissionGuidelines: StructuredSection[] | null;
  howToPublish: StructuredSection[] | null;
  feesAndFunding: StructuredSection[] | null;
  editorialBoardCanReviewSubmissions: boolean;
  status: "active" | "archived";
  createdAt: Date;
  volumeCount: number;
  issueCount: number;
  itemCount: number;
  volumes: Array<{
    id: string;
    journalId: string;
    volumeNumber: number;
    title: string | null;
    year: number;
  }>;
  issues: Array<{
    id: string;
    journalId: string;
    volumeId: string;
    issueNumber: number;
    title: string | null;
    publishedAt: Date | null;
  }>;
  editorialBoard: Array<{
    id: string;
    journalId: string;
    role: string;
    personName: string;
    affiliation: string | null;
    email: string | null;
    orcid: string | null;
    displayOrder: number;
  }>;
};

const JOURNAL_MESSAGES: Record<string, { text: string; type: "success" | "error" }> = {
  created: { text: "Journal created successfully.", type: "success" },
  updated: { text: "Journal updated successfully.", type: "success" },
  "volume-created": { text: "Volume created successfully.", type: "success" },
  "issue-created": { text: "Issue created successfully.", type: "success" },
  invalid: { text: "Invalid journal data. Please review the form fields.", type: "error" },
  "invalid-volume": { text: "Invalid volume data. Please check the values.", type: "error" },
  "invalid-issue": { text: "Invalid issue selection. Ensure the issue belongs to the selected journal volume.", type: "error" },
  "board-created": { text: "Board member added successfully.", type: "success" },
  "board-updated": { text: "Board member updated successfully.", type: "success" },
  "board-deleted": { text: "Board member removed successfully.", type: "success" },
  "invalid-board": { text: "Invalid board member data. Please review the form fields.", type: "error" },
};

type JournalCoverPresignResponse = {
  uploadUrl: string;
  objectKey: string;
};

async function uploadJournalCoverToR2(file: File) {
  const presignRes = await fetch("/api/uploads/journals/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  if (!presignRes.ok) {
    const body = (await presignRes.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      body?.error ?? `Failed to prepare cover upload (${presignRes.status})`,
    );
  }

  const presign = (await presignRes.json()) as JournalCoverPresignResponse;

  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(
      `Cover upload failed (${uploadRes.status}). Please try again.`,
    );
  }

  return presign.objectKey;
}

async function appendUploadedJournalCoverKey(formData: FormData) {
  const coverFile = formData.get("coverImageFile");
  if (!(coverFile instanceof File) || coverFile.size === 0) {
    return;
  }

  const objectKey = await uploadJournalCoverToR2(coverFile);
  formData.set("coverImageKey", objectKey);
}

export function AdminJournalsList({ journals }: { journals: JournalOverview[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opParam = searchParams.get("op");
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!opParam || handledRef.current === opParam) return;
    handledRef.current = opParam;
    const message = JOURNAL_MESSAGES[opParam];
    if (!message) return;
    if (message.type === "success") toast.success(message.text);
    else toast.error(message.text);
    router.replace("/admin/journals", { scroll: false });
  }, [opParam, router]);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  function handleCreateNameChange(nextName: string) {
    setCreateName(nextName);
    if (!createSlugTouched) {
      setCreateSlug(slugifyJournalName(nextName));
    }
  }

  async function handleCreate(formData: FormData) {
    setIsCreating(true);
    try {
      await appendUploadedJournalCoverKey(formData);
      await createJournalAction(formData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not create journal. Please try again.";
      toast.error(message);
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 py-4">
        <CardHeader>
          {/* <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Library className="size-4 text-primary" />
          </div> */}
          <CardTitle className="text-2xl font-semibold text-primary tracking-tight">Create Journal</CardTitle>
          <CardDescription>Start a new journal and configure its public profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="grid gap-4">
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-primary">Overview</h3>
                <p className="text-sm text-muted-foreground">
                  Core journal identity and metadata shown on the journal page.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Journal name"
                  name="name"
                  required
                  value={createName}
                  onChange={(event) => handleCreateNameChange(event.target.value)}
                />
                <Field
                  label="Slug"
                  name="slug"
                  required
                  value={createSlug}
                  onChange={(event) => {
                    setCreateSlugTouched(true);
                    setCreateSlug(event.target.value);
                  }}
                />
                <Field label="ISSN" name="issn" placeholder="1234-5678" />
                <Field label="E-ISSN" name="eissn" placeholder="8765-4321" />
              </div>
              <Field label="Description" name="description" textarea />
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  name="editorialBoardCanReviewSubmissions"
                  defaultChecked
                  className="size-4 rounded border-input"
                />
                Editorial board can review submissions
              </label>
              <CoverImageUploadField idBase="create" disabled={isCreating} />
            </div>

            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-primary">Aim & Scope</h3>
                <p className="text-sm text-muted-foreground">
                  Define journal scope, topics, and accepted content formats.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Aim and Scope" name="aimAndScope" textarea rows={4} className="sm:col-span-2" />
                <Field label="Topics" name="topics" textarea rows={4} />
                <Field label="Content Types" name="contentTypes" textarea rows={4} />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-primary">Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Public policies for ethics, disclosures, rights, and contact.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <StructuredSectionsEditor label="Ethics Policy" name="ethicsPolicy" />
                <StructuredSectionsEditor label="Disclosures Policy" name="disclosuresPolicy" />
                <StructuredSectionsEditor label="Rights & Permissions" name="rightsPermissions" />
                <StructuredSectionsEditor label="Contact Information" name="contactInfo" />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-primary">For Authors</h3>
                <p className="text-sm text-muted-foreground">
                  Author-facing workflow, checklist, guidelines, and fees.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <StructuredSectionsEditor label="Submission Checklist" name="submissionChecklist" />
                <StructuredSectionsEditor label="Submission Guidelines" name="submissionGuidelines" />
                <StructuredSectionsEditor label="How to Publish" name="howToPublish" />
                <StructuredSectionsEditor label="Fees & Funding" name="feesAndFunding" />
              </div>
            </div>
            <Button type="submit" disabled={isCreating} className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90">
              {isCreating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Create journal
            </Button>
          </form>
        </CardContent>
      </Card>

      {journals.map((journal, index) => (
        <JournalCard key={journal.id} journal={journal} index={index} />
      ))}
    </div>
  );
}

function JournalCard({ journal, index }: { journal: JournalOverview; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
    >
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold tracking-tight">{journal.name}</CardTitle>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${journal.status === "active" ? "bg-emerald-600/10 text-emerald-700" : "bg-primary/10 text-primary"}`}>
                  {journal.status}
                </span>
              </div>
              <CardDescription className="mt-1 font-mono text-[11px]">/{journal.slug}</CardDescription>
              {journal.description && (
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">{journal.description}</p>
              )}
            </div>
            <Link href={`/admin/journals/${journal.slug}/edit`}>
              <Button type="button" variant="outline" size="sm">
                <Pencil className="size-3.5" />
                Edit
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat icon={Layers3} label="Volumes" value={journal.volumeCount} />
            <Stat icon={ScrollText} label="Issues" value={journal.issueCount} />
            <Stat icon={BookOpen} label="Items" value={journal.itemCount} />
          </div>

        </CardContent>
      </Card>
    </motion.div>
  );
}

function StructuredSectionsEditor({
  label,
  name,
  initialValue,
  disabled,
}: {
  label: string;
  name: string;
  initialValue?: StructuredSection[];
  disabled?: boolean;
}) {
  const example =
    STRUCTURED_SECTION_EXAMPLES[name] ??
    STRUCTURED_SECTION_EXAMPLES.submissionGuidelines;

  const [entries, setEntries] = useState<StructuredSection[]>(
    initialValue && initialValue.length > 0
      ? initialValue
      : [{ heading: "", content: "" }],
  );

  function addEntry() {
    setEntries((prev) => [...prev, { heading: "", content: "" }]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateEntry(
    index: number,
    field: keyof StructuredSection,
    value: string,
  ) {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
  }

  const serialized = entries.length > 0 ? JSON.stringify(entries) : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          disabled={disabled}
          className="h-6 text-xs"
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </div>
      <input type="hidden" name={name} value={serialized} />
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="relative rounded-lg border border-border/50 bg-muted/20 p-3 pr-8"
          >
            <button
              type="button"
              onClick={() => removeEntry(index)}
              disabled={disabled || entries.length === 1}
              className="absolute right-2 top-2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <X className="size-3.5" />
            </button>
            <div className="space-y-2">
              <Input
                placeholder={`e.g. ${example.heading}`}
                value={entry.heading}
                onChange={(e) => updateEntry(index, "heading", e.target.value)}
                disabled={disabled}
                className="h-7 overflow-x-auto text-xs"
              />
              <Textarea
                placeholder={example.content}
                value={entry.content}
                onChange={(e) => updateEntry(index, "content", e.target.value)}
                disabled={disabled}
                rows={2}
                className="max-h-28 overflow-y-auto text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-3">
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({
  label,
  name,
  textarea = false,
  rows = 3,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  name: string;
  textarea?: boolean;
  rows?: number;
}) {
  const inputClassName = ["overflow-x-auto", className]
    .filter(Boolean)
    .join(" ");
  const textareaClassName = ["max-h-44 overflow-y-auto", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      {textarea ? (
        <Textarea
          id={name}
          name={name}
          rows={rows}
          {...(props as ComponentProps<typeof Textarea>)}
          className={textareaClassName}
        />
      ) : (
        <Input id={name} name={name} {...props} className={inputClassName} />
      )}
    </div>
  );
}

function CoverImageUploadField({
  idBase,
  defaultKey,
  disabled,
}: {
  idBase: string;
  defaultKey?: string;
  disabled?: boolean;
}) {
  const fileInputId = `coverImageFile-${idBase}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fileInputId} className="text-xs">
        Cover image
      </Label>
      <input type="hidden" name="coverImageKey" defaultValue={defaultKey ?? ""} />
      <Input
        id={fileInputId}
        name="coverImageFile"
        type="file"
        className="cursor-pointer"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
      />
      <p className="text-[11px] text-muted-foreground">
        Upload JPG, PNG, or WebP (max 5 MB)
        {/* <span className="font-mono"> journal-covers/</span>. */}
      </p>
      {defaultKey && (
        <p className="text-[11px] text-muted-foreground">
          Current key: <span className="font-mono">{defaultKey}</span>
        </p>
      )}
    </div>
  );
}
