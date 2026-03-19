"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createJournalAction,
  createJournalEditorialBoardAction,
  createJournalIssueAction,
  createJournalVolumeAction,
  deleteJournalEditorialBoardAction,
  updateJournalAction,
  updateJournalEditorialBoardAction,
} from "@/lib/actions/admin";
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
  const [editing, setEditing] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(journal.name);
  const [editSlug, setEditSlug] = useState(journal.slug);
  const [editSlugTouched, setEditSlugTouched] = useState(false);

  function handleEditNameChange(nextName: string) {
    setEditName(nextName);
    if (!editSlugTouched) {
      setEditSlug(slugifyJournalName(nextName));
    }
  }

  async function handleUpdate(formData: FormData) {
    setIsSaving(true);
    try {
      await appendUploadedJournalCoverKey(formData);
      await updateJournalAction(formData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update journal. Please try again.";
      toast.error(message);
      setIsSaving(false);
    }
  }

  async function handleCreateVolume(formData: FormData) {
    setIsSaving(true);
    try {
      await createJournalVolumeAction(formData);
    } catch {
      setIsSaving(false);
    }
  }

  async function handleCreateIssue(formData: FormData) {
    setIsSaving(true);
    try {
      await createJournalIssueAction(formData);
    } catch {
      setIsSaving(false);
    }
  }

  async function handleCreateBoardMember(formData: FormData) {
    setIsSaving(true);
    try {
      await createJournalEditorialBoardAction(formData);
    } catch {
      setIsSaving(false);
    }
  }

  async function handleUpdateBoardMember(formData: FormData) {
    setIsSaving(true);
    try {
      await updateJournalEditorialBoardAction(formData);
    } catch {
      setIsSaving(false);
    }
  }

  async function handleDeleteBoardMember(formData: FormData) {
    setIsSaving(true);
    try {
      await deleteJournalEditorialBoardAction(formData);
    } catch {
      setIsSaving(false);
    }
  }

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
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${journal.status === "active" ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-600/10 text-amber-700"}`}>
                  {journal.status}
                </span>
              </div>
              <CardDescription className="mt-1 font-mono text-[11px]">/{journal.slug}</CardDescription>
              {journal.description && (
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">{journal.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
                <Pencil className="size-3.5" />
                {editing ? "Close" : "Edit"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowStructure((v) => !v)}>
                {showStructure ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                Structure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat icon={Layers3} label="Volumes" value={journal.volumeCount} />
            <Stat icon={ScrollText} label="Issues" value={journal.issueCount} />
            <Stat icon={BookOpen} label="Items" value={journal.itemCount} />
          </div>

          {editing && (
            <form action={handleUpdate} className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <input type="hidden" name="journalId" value={journal.id} />
              <div className="space-y-4 rounded-xl border border-border/60 bg-background/60 p-4">
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
                    value={editName}
                    required
                    disabled={isSaving}
                    onChange={(event) => handleEditNameChange(event.target.value)}
                  />
                  <Field
                    label="Slug"
                    name="slug"
                    value={editSlug}
                    required
                    disabled={isSaving}
                    onChange={(event) => {
                      setEditSlugTouched(true);
                      setEditSlug(event.target.value);
                    }}
                  />
                  <Field label="ISSN" name="issn" defaultValue={journal.issn ?? ""} disabled={isSaving} placeholder="1234-5678" />
                  <Field label="E-ISSN" name="eissn" defaultValue={journal.eissn ?? ""} disabled={isSaving} placeholder="8765-4321" />
                  <div className="space-y-1.5">
                    <Label htmlFor={`status-${journal.id}`} className="text-xs">Status</Label>
                    <select id={`status-${journal.id}`} name="status" defaultValue={journal.status} disabled={isSaving} className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <Field label="Description" name="description" defaultValue={journal.description ?? ""} textarea disabled={isSaving} />
                <CoverImageUploadField
                  idBase={journal.id}
                  defaultKey={journal.coverImageKey ?? ""}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 bg-background/60 p-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-primary">Aim & Scope</h3>
                  <p className="text-sm text-muted-foreground">
                    Define journal scope, topics, and accepted content formats.
                  </p>
                </div>
                <Field label="Aim and Scope" name="aimAndScope" defaultValue={journal.aimAndScope ?? ""} textarea rows={4} disabled={isSaving} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Topics" name="topics" defaultValue={journal.topics ?? ""} textarea rows={4} disabled={isSaving} />
                  <Field label="Content Types" name="contentTypes" defaultValue={journal.contentTypes ?? ""} textarea rows={4} disabled={isSaving} />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 bg-background/60 p-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-primary">Policies</h3>
                  <p className="text-sm text-muted-foreground">
                    Public policies for ethics, disclosures, rights, and contact.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <StructuredSectionsEditor label="Ethics Policy" name="ethicsPolicy" initialValue={journal.ethicsPolicy ?? undefined} disabled={isSaving} />
                  <StructuredSectionsEditor label="Disclosures Policy" name="disclosuresPolicy" initialValue={journal.disclosuresPolicy ?? undefined} disabled={isSaving} />
                  <StructuredSectionsEditor label="Rights & Permissions" name="rightsPermissions" initialValue={journal.rightsPermissions ?? undefined} disabled={isSaving} />
                  <StructuredSectionsEditor label="Contact Information" name="contactInfo" initialValue={journal.contactInfo ?? undefined} disabled={isSaving} />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 bg-background/60 p-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-primary">For Authors</h3>
                  <p className="text-sm text-muted-foreground">
                    Author-facing workflow, checklist, guidelines, and fees.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <StructuredSectionsEditor label="Submission Checklist" name="submissionChecklist" initialValue={journal.submissionChecklist ?? undefined} disabled={isSaving} />
                  <StructuredSectionsEditor label="Submission Guidelines" name="submissionGuidelines" initialValue={journal.submissionGuidelines ?? undefined} disabled={isSaving} />
                  <StructuredSectionsEditor label="How to Publish" name="howToPublish" initialValue={journal.howToPublish ?? undefined} disabled={isSaving} />
                  <StructuredSectionsEditor label="Fees & Funding" name="feesAndFunding" initialValue={journal.feesAndFunding ?? undefined} disabled={isSaving} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isSaving} className="bg-primary text-white hover:bg-primary/90">
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Save journal
                </Button>
              </div>
            </form>
          )}

          {showStructure && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3 rounded-xl border border-border/60 p-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Volumes</h3>
                    <p className="text-xs text-muted-foreground">Create and review volume structure for this journal.</p>
                  </div>
                  <form action={handleCreateVolume} className="grid gap-3 sm:grid-cols-3">
                    <input type="hidden" name="journalId" value={journal.id} />
                    <Field label="Volume" name="volumeNumber" type="number" required disabled={isSaving} />
                    <Field label="Year" name="year" type="number" required disabled={isSaving} />
                    <Field label="Title" name="title" disabled={isSaving} />
                    <div className="sm:col-span-3">
                      <Button type="submit" variant="outline" disabled={isSaving}>
                        <Plus className="size-3.5" />
                        Add volume
                      </Button>
                    </div>
                  </form>
                  <div className="space-y-2">
                    {journal.volumes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No volumes yet.</p>
                    ) : (
                      journal.volumes.map((volume) => (
                        <div key={volume.id} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                          <div className="font-medium">Vol. {volume.volumeNumber} {volume.title ? `- ${volume.title}` : ""}</div>
                          <div className="text-muted-foreground">{volume.year}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 p-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Issues</h3>
                    <p className="text-xs text-muted-foreground">Attach issues to existing volumes.</p>
                  </div>
                  <form action={handleCreateIssue} className="grid gap-3">
                    <input type="hidden" name="journalId" value={journal.id} />
                    <div className="space-y-1.5">
                      <Label htmlFor={`volume-${journal.id}`} className="text-xs">Volume</Label>
                      <select id={`volume-${journal.id}`} name="volumeId" required disabled={isSaving} className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                        <option value="">Select volume...</option>
                        {journal.volumes.map((volume) => (
                          <option key={volume.id} value={volume.id}>
                            Vol. {volume.volumeNumber} ({volume.year})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Issue number" name="issueNumber" type="number" required disabled={isSaving} />
                      <Field label="Published at" name="publishedAt" type="date" disabled={isSaving} />
                    </div>
                    <Field label="Issue title" name="title" disabled={isSaving} />
                    <Button type="submit" variant="outline" disabled={isSaving}>
                      <Plus className="size-3.5" />
                      Add issue
                    </Button>
                  </form>
                  <div className="space-y-2">
                    {journal.issues.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No issues yet.</p>
                    ) : (
                      journal.issues.map((issue) => (
                        <div key={issue.id} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                          <div className="font-medium">Issue {issue.issueNumber} {issue.title ? `- ${issue.title}` : ""}</div>
                          <div className="text-muted-foreground">
                            Volume {journal.volumes.find((volume) => volume.id === issue.volumeId)?.volumeNumber ?? "-"}
                            {issue.publishedAt ? ` · ${new Date(issue.publishedAt).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <EditorialBoardSection
                journal={journal}
                isSaving={isSaving}
                onCreateMember={handleCreateBoardMember}
                onUpdateMember={handleUpdateBoardMember}
                onDeleteMember={handleDeleteBoardMember}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

type BoardMember = JournalOverview["editorialBoard"][number];

function EditorialBoardSection({
  journal,
  isSaving,
  onCreateMember,
  onUpdateMember,
  onDeleteMember,
}: {
  journal: JournalOverview;
  isSaving: boolean;
  onCreateMember: (formData: FormData) => Promise<void>;
  onUpdateMember: (formData: FormData) => Promise<void>;
  onDeleteMember: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <div>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Editorial Board</h3>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {journal.editorialBoard.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Manage board members, roles, and display order.</p>
      </div>

      <form action={onCreateMember} className="grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="journalId" value={journal.id} />
        <Field label="Name" name="personName" required disabled={isSaving} placeholder="Full name" />
        <Field label="Role" name="role" required disabled={isSaving} placeholder="e.g. Editor-in-Chief" />
        <Field label="Affiliation" name="affiliation" disabled={isSaving} placeholder="Institution" />
        <Field label="Email" name="email" type="email" disabled={isSaving} placeholder="email@example.com" />
        <Field label="ORCID" name="orcid" disabled={isSaving} placeholder="0000-0000-0000-0000" />
        <Field label="Display order" name="displayOrder" type="number" required disabled={isSaving} defaultValue="0" />
        <div className="sm:col-span-3">
          <Button type="submit" variant="outline" disabled={isSaving}>
            <Plus className="size-3.5" />
            Add member
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {journal.editorialBoard.length === 0 ? (
          <p className="text-xs text-muted-foreground">No board members yet.</p>
        ) : (
          journal.editorialBoard.map((member) => (
            <BoardMemberRow
              key={member.id}
              member={member}
              isSaving={isSaving}
              onUpdate={onUpdateMember}
              onDelete={onDeleteMember}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BoardMemberRow({
  member,
  isSaving,
  onUpdate,
  onDelete,
}: {
  member: BoardMember;
  isSaving: boolean;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isEditing) {
    return (
      <form
        action={onUpdate}
        className="space-y-3 rounded-lg border border-primary/20 bg-muted/20 p-3"
      >
        <input type="hidden" name="boardMemberId" value={member.id} />
        <input type="hidden" name="journalId" value={member.journalId} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name" name="personName" defaultValue={member.personName} required disabled={isSaving} />
          <Field label="Role" name="role" defaultValue={member.role} required disabled={isSaving} />
          <Field label="Affiliation" name="affiliation" defaultValue={member.affiliation ?? ""} disabled={isSaving} />
          <Field label="Email" name="email" type="email" defaultValue={member.email ?? ""} disabled={isSaving} />
          <Field label="ORCID" name="orcid" defaultValue={member.orcid ?? ""} disabled={isSaving} />
          <Field label="Display order" name="displayOrder" type="number" defaultValue={String(member.displayOrder)} required disabled={isSaving} />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSaving} className="bg-primary text-white hover:bg-primary/90">
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
            <X className="size-3.5" />
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{member.personName}</span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {member.role}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-muted-foreground">
          {member.affiliation && <span>{member.affiliation}</span>}
          {member.email && <span>{member.email}</span>}
          {member.orcid && <span className="font-mono">{member.orcid}</span>}
          <span>Order: {member.displayOrder}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[10px] font-medium text-destructive">Remove?</span>
            <form action={onDelete}>
              <input type="hidden" name="boardMemberId" value={member.id} />
              <Button type="submit" variant="destructive" size="sm" className="h-6 px-2 text-[10px]" disabled={isSaving}>
                {isSaving ? <Loader2 className="size-3 animate-spin" /> : "Yes"}
              </Button>
            </form>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setConfirmingDelete(false)} disabled={isSaving}>
              No
            </Button>
          </div>
        ) : (
          <>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setIsEditing(true)} disabled={isSaving}>
              <Pencil className="size-3" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setConfirmingDelete(true)} disabled={isSaving}>
              <Trash2 className="size-3" />
            </Button>
          </>
        )}
      </div>
    </div>
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
