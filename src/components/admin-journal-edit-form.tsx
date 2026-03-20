"use client";

import { type ComponentProps, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  updateJournalAction,
  createJournalVolumeAction,
  createJournalIssueAction,
  createJournalEditorialBoardAction,
  updateJournalEditorialBoardAction,
  deleteJournalEditorialBoardAction,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StructuredSection = { heading: string; content: string };

type JournalEditData = {
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

const STRUCTURED_SECTION_EXAMPLES: Record<string, { heading: string; content: string }> = {
  ethicsPolicy: { heading: "Research integrity", content: "All submissions must follow COPE ethics standards and include conflict-of-interest declarations." },
  disclosuresPolicy: { heading: "Conflict disclosures", content: "Authors, editors, and reviewers must disclose financial or personal conflicts related to the manuscript." },
  rightsPermissions: { heading: "Copyright and reuse", content: "Articles are published under CC BY 4.0 unless otherwise specified. Permission is required for third-party copyrighted material." },
  contactInfo: { heading: "Editorial office", content: "Email: journal@muj.edu.in | Support hours: Mon-Fri, 10:00 AM - 5:00 PM IST." },
  submissionChecklist: { heading: "Before you submit", content: "Ensure manuscript formatting, abstract, keywords, references, and ethical declarations are complete." },
  submissionGuidelines: { heading: "Manuscript format", content: "Submit in DOCX or LaTeX format, include structured abstract, and follow journal citation style." },
  howToPublish: { heading: "Publishing workflow", content: "Submit manuscript -> editorial screening -> peer review -> revisions -> acceptance -> publication." },
  feesAndFunding: { heading: "Article processing charges", content: "No APC for student submissions. Funded projects may include publication support as per grant terms." },
};

function slugifyJournalName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type JournalCoverPresignResponse = {
  uploadUrl: string;
  objectKey: string;
};

async function uploadJournalCoverToR2(file: File) {
  const presignRes = await fetch("/api/uploads/journals/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
  });
  if (!presignRes.ok) {
    const body = (await presignRes.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to prepare cover upload (${presignRes.status})`);
  }
  const presign = (await presignRes.json()) as JournalCoverPresignResponse;
  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type, "Content-Length": String(file.size) },
    body: file,
  });
  if (!uploadRes.ok) throw new Error(`Cover upload failed (${uploadRes.status}). Please try again.`);
  return presign.objectKey;
}

async function appendUploadedCoverKey(formData: FormData) {
  const coverFile = formData.get("coverImageFile");
  if (!(coverFile instanceof File) || coverFile.size === 0) return;
  const objectKey = await uploadJournalCoverToR2(coverFile);
  formData.set("coverImageKey", objectKey);
}

/* ------------------------------------------------------------------ */
/*  Main exported component                                            */
/* ------------------------------------------------------------------ */

export function AdminJournalEditForm({ journal }: { journal: JournalEditData }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(journal.name);
  const [editSlug, setEditSlug] = useState(journal.slug);
  const [editSlugTouched, setEditSlugTouched] = useState(false);
  const [showStructure, setShowStructure] = useState(false);

  function handleEditNameChange(nextName: string) {
    setEditName(nextName);
    if (!editSlugTouched) setEditSlug(slugifyJournalName(nextName));
  }

  async function handleUpdate(formData: FormData) {
    setIsSaving(true);
    try {
      await appendUploadedCoverKey(formData);
      await updateJournalAction(formData);
      toast.success("Journal updated successfully.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update journal.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateVolume(formData: FormData) {
    setIsSaving(true);
    try {
      await createJournalVolumeAction(formData);
      toast.success("Volume created.");
      router.refresh();
    } catch {
      toast.error("Could not create volume.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateIssue(formData: FormData) {
    setIsSaving(true);
    try {
      await createJournalIssueAction(formData);
      toast.success("Issue created.");
      router.refresh();
    } catch {
      toast.error("Could not create issue.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateBoardMember(formData: FormData) {
    setIsSaving(true);
    try {
      await createJournalEditorialBoardAction(formData);
      toast.success("Board member added.");
      router.refresh();
    } catch {
      toast.error("Could not add board member.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateBoardMember(formData: FormData) {
    setIsSaving(true);
    try {
      await updateJournalEditorialBoardAction(formData);
      toast.success("Board member updated.");
      router.refresh();
    } catch {
      toast.error("Could not update board member.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteBoardMember(formData: FormData) {
    setIsSaving(true);
    try {
      await deleteJournalEditorialBoardAction(formData);
      toast.success("Board member removed.");
      router.refresh();
    } catch {
      toast.error("Could not remove board member.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Journal details form */}
      <form action={handleUpdate} className="space-y-5">
        <input type="hidden" name="journalId" value={journal.id} />

        {/* Overview */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-primary">Overview</h3>
            <p className="text-sm text-muted-foreground">Core journal identity and metadata.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Journal name"
              name="name"
              value={editName}
              required
              disabled={isSaving}
              onChange={(e) => handleEditNameChange(e.target.value)}
            />
            <Field
              label="Slug"
              name="slug"
              value={editSlug}
              required
              disabled={isSaving}
              onChange={(e) => { setEditSlugTouched(true); setEditSlug(e.target.value); }}
            />
            <Field label="ISSN" name="issn" defaultValue={journal.issn ?? ""} disabled={isSaving} placeholder="1234-5678" />
            <Field label="E-ISSN" name="eissn" defaultValue={journal.eissn ?? ""} disabled={isSaving} placeholder="8765-4321" />
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={journal.status}
                disabled={isSaving}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <Field label="Description" name="description" defaultValue={journal.description ?? ""} textarea disabled={isSaving} />
          <CoverImageUploadField defaultKey={journal.coverImageKey ?? ""} disabled={isSaving} />
        </div>

        {/* Aim & Scope */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-primary">Aim & Scope</h3>
            <p className="text-sm text-muted-foreground">Define journal scope, topics, and accepted content formats.</p>
          </div>
          <Field label="Aim and Scope" name="aimAndScope" defaultValue={journal.aimAndScope ?? ""} textarea rows={5} disabled={isSaving} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Topics" name="topics" defaultValue={journal.topics ?? ""} textarea rows={4} disabled={isSaving} />
            <Field label="Content Types" name="contentTypes" defaultValue={journal.contentTypes ?? ""} textarea rows={4} disabled={isSaving} />
          </div>
        </div>

        {/* Policies */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-primary">Policies</h3>
            <p className="text-sm text-muted-foreground">Public policies for ethics, disclosures, rights, and contact.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StructuredSectionsEditor label="Ethics Policy" name="ethicsPolicy" initialValue={journal.ethicsPolicy ?? undefined} disabled={isSaving} />
            <StructuredSectionsEditor label="Disclosures Policy" name="disclosuresPolicy" initialValue={journal.disclosuresPolicy ?? undefined} disabled={isSaving} />
            <StructuredSectionsEditor label="Rights & Permissions" name="rightsPermissions" initialValue={journal.rightsPermissions ?? undefined} disabled={isSaving} />
            <StructuredSectionsEditor label="Contact Information" name="contactInfo" initialValue={journal.contactInfo ?? undefined} disabled={isSaving} />
          </div>
        </div>

        {/* For Authors */}
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-primary">For Authors</h3>
            <p className="text-sm text-muted-foreground">Author-facing workflow, checklist, guidelines, and fees.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StructuredSectionsEditor label="Submission Checklist" name="submissionChecklist" initialValue={journal.submissionChecklist ?? undefined} disabled={isSaving} />
            <StructuredSectionsEditor label="Submission Guidelines" name="submissionGuidelines" initialValue={journal.submissionGuidelines ?? undefined} disabled={isSaving} />
            <StructuredSectionsEditor label="How to Publish" name="howToPublish" initialValue={journal.howToPublish ?? undefined} disabled={isSaving} />
            <StructuredSectionsEditor label="Fees & Funding" name="feesAndFunding" initialValue={journal.feesAndFunding ?? undefined} disabled={isSaving} />
          </div>
        </div>

        <Button type="submit" disabled={isSaving} className="bg-primary text-white hover:bg-primary/90">
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Save journal
        </Button>
      </form>

      {/* Structure: Volumes, Issues, Editorial Board */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <button
          type="button"
          onClick={() => setShowStructure((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <h3 className="text-xl font-semibold tracking-tight text-primary">Volumes, Issues & Editorial Board</h3>
          {showStructure ? <ChevronUp className="size-5 text-muted-foreground" /> : <ChevronDown className="size-5 text-muted-foreground" />}
        </button>

        {showStructure && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Volumes */}
              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <div>
                  <h4 className="text-base font-semibold tracking-tight">Volumes</h4>
                  <p className="text-xs text-muted-foreground">Create and review volume structure.</p>
                </div>
                <form action={handleCreateVolume} className="grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="journalId" value={journal.id} />
                  <Field label="Volume" name="volumeNumber" type="number" required disabled={isSaving} />
                  <Field label="Year" name="year" type="number" required disabled={isSaving} />
                  <Field label="Title" name="title" disabled={isSaving} />
                  <div className="sm:col-span-3">
                    <Button type="submit" variant="outline" disabled={isSaving}>
                      <Plus className="size-3.5" /> Add volume
                    </Button>
                  </div>
                </form>
                <div className="space-y-2">
                  {journal.volumes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No volumes yet.</p>
                  ) : (
                    journal.volumes.map((v) => (
                      <div key={v.id} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                        <div className="font-medium">Vol. {v.volumeNumber} {v.title ? `- ${v.title}` : ""}</div>
                        <div className="text-muted-foreground">{v.year}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Issues */}
              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <div>
                  <h4 className="text-base font-semibold tracking-tight">Issues</h4>
                  <p className="text-xs text-muted-foreground">Attach issues to existing volumes.</p>
                </div>
                <form action={handleCreateIssue} className="grid gap-3">
                  <input type="hidden" name="journalId" value={journal.id} />
                  <div className="space-y-1.5">
                    <Label htmlFor="volumeId" className="text-xs">Volume</Label>
                    <select
                      id="volumeId"
                      name="volumeId"
                      required
                      disabled={isSaving}
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">Select volume...</option>
                      {journal.volumes.map((v) => (
                        <option key={v.id} value={v.id}>Vol. {v.volumeNumber} ({v.year})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Issue number" name="issueNumber" type="number" required disabled={isSaving} />
                    <Field label="Published at" name="publishedAt" type="date" disabled={isSaving} />
                  </div>
                  <Field label="Issue title" name="title" disabled={isSaving} />
                  <Button type="submit" variant="outline" disabled={isSaving}>
                    <Plus className="size-3.5" /> Add issue
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
                          Volume {journal.volumes.find((v) => v.id === issue.volumeId)?.volumeNumber ?? "-"}
                          {issue.publishedAt ? ` · ${new Date(issue.publishedAt).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Editorial Board */}
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h4 className="text-base font-semibold tracking-tight">Editorial Board</h4>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {journal.editorialBoard.length}
                </span>
              </div>
              <form action={handleCreateBoardMember} className="grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="journalId" value={journal.id} />
                <Field label="Name" name="personName" required disabled={isSaving} placeholder="Full name" />
                <Field label="Role" name="role" required disabled={isSaving} placeholder="e.g. Editor-in-Chief" />
                <Field label="Affiliation" name="affiliation" disabled={isSaving} placeholder="Institution" />
                <Field label="Email" name="email" type="email" disabled={isSaving} placeholder="email@example.com" />
                <Field label="ORCID" name="orcid" disabled={isSaving} placeholder="0000-0000-0000-0000" />
                <Field label="Display order" name="displayOrder" type="number" required disabled={isSaving} defaultValue="0" />
                <div className="sm:col-span-3">
                  <Button type="submit" variant="outline" disabled={isSaving}>
                    <Plus className="size-3.5" /> Add member
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
                      onUpdate={handleUpdateBoardMember}
                      onDelete={handleDeleteBoardMember}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board member row                                                   */
/* ------------------------------------------------------------------ */

type BoardMember = JournalEditData["editorialBoard"][number];

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
      <form action={onUpdate} className="space-y-3 rounded-lg border border-primary/20 bg-muted/20 p-3">
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
            <X className="size-3.5" /> Cancel
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

/* ------------------------------------------------------------------ */
/*  Structured sections editor                                         */
/* ------------------------------------------------------------------ */

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
  const example = STRUCTURED_SECTION_EXAMPLES[name] ?? STRUCTURED_SECTION_EXAMPLES.submissionGuidelines;
  const [entries, setEntries] = useState<StructuredSection[]>(
    initialValue && initialValue.length > 0 ? initialValue : [{ heading: "", content: "" }],
  );

  function addEntry() {
    setEntries((prev) => [...prev, { heading: "", content: "" }]);
  }
  function removeEntry(index: number) {
    setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }
  function updateEntry(index: number, field: keyof StructuredSection, value: string) {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  }

  const serialized = entries.length > 0 ? JSON.stringify(entries) : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addEntry} disabled={disabled} className="h-6 text-[10px]">
          <Plus className="size-3" /> Add item
        </Button>
      </div>
      <input type="hidden" name={name} value={serialized} />
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={index} className="relative rounded-lg border border-border/50 bg-muted/20 p-3 pr-8">
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

/* ------------------------------------------------------------------ */
/*  Cover image upload                                                 */
/* ------------------------------------------------------------------ */

function CoverImageUploadField({
  defaultKey,
  disabled,
}: {
  defaultKey?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="coverImageFile" className="text-xs">Cover image</Label>
      <input type="hidden" name="coverImageKey" defaultValue={defaultKey ?? ""} />
      <Input
        id="coverImageFile"
        name="coverImageFile"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
      />
      <p className="text-[11px] text-muted-foreground">
        Upload JPG, PNG, or WebP (max 5 MB). Stored in R2 under <span className="font-mono">journal-covers/</span>.
      </p>
      {defaultKey && (
        <p className="text-[11px] text-muted-foreground">
          Current: <span className="font-mono">{defaultKey}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generic field                                                      */
/* ------------------------------------------------------------------ */

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
  const inputClassName = ["overflow-x-auto", className].filter(Boolean).join(" ");
  const textareaClassName = ["max-h-44 overflow-y-auto", className].filter(Boolean).join(" ");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      {textarea ? (
        <Textarea id={name} name={name} rows={rows} {...(props as ComponentProps<typeof Textarea>)} className={textareaClassName} />
      ) : (
        <Input id={name} name={name} {...props} className={inputClassName} />
      )}
    </div>
  );
}
