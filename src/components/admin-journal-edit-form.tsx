"use client";

import { type ComponentProps, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
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
import { MarkdownToolbarTextarea } from "@/components/ui/markdown-toolbar-textarea";
import { Textarea } from "@/components/ui/textarea";

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
  ethicsPolicy: string | null;
  disclosuresPolicy: string | null;
  rightsPermissions: string | null;
  contactInfo: string | null;
  submissionChecklist: string | null;
  submissionGuidelines: string | null;
  howToPublish: string | null;
  feesAndFunding: string | null;
  editorialBoardCanReviewSubmissions: boolean;
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
  const [editDescription, setEditDescription] = useState(journal.description ?? "");
  const [editAimAndScope, setEditAimAndScope] = useState(
    journal.aimAndScope ?? "",
  );
  const [editTopics, setEditTopics] = useState(journal.topics ?? "");
  const [editContentTypes, setEditContentTypes] = useState(
    journal.contentTypes ?? "",
  );
  const [editSlugTouched, setEditSlugTouched] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [ethicsPolicy, setEthicsPolicy] = useState(journal.ethicsPolicy ?? "");
  const [disclosuresPolicy, setDisclosuresPolicy] = useState(
    journal.disclosuresPolicy ?? "",
  );
  const [rightsPermissions, setRightsPermissions] = useState(
    journal.rightsPermissions ?? "",
  );
  const [contactInfo, setContactInfo] = useState(journal.contactInfo ?? "");
  const [submissionChecklist, setSubmissionChecklist] = useState(
    journal.submissionChecklist ?? "",
  );
  const [submissionGuidelines, setSubmissionGuidelines] = useState(
    journal.submissionGuidelines ?? "",
  );
  const [howToPublish, setHowToPublish] = useState(journal.howToPublish ?? "");
  const [feesAndFunding, setFeesAndFunding] = useState(
    journal.feesAndFunding ?? "",
  );
  const [editStep, setEditStep] = useState(0);
  const editSteps = ["Overview", "Aim & Scope", "Policies", "For Authors", "Review"] as const;

  function handleEditNameChange(nextName: string) {
    setEditName(nextName);
    if (!editSlugTouched) setEditSlug(slugifyJournalName(nextName));
  }

  function canAdvanceFromEditStep(step: number) {
    if (step === 0) {
      return editName.trim().length >= 2 && editSlug.trim().length >= 2;
    }
    return true;
  }

  function goToEditStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= editSteps.length) return;
    if (nextStep > editStep && !canAdvanceFromEditStep(editStep)) {
      toast.error("Journal name and slug are required before continuing.");
      return;
    }
    setEditStep(nextStep);
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

        <div className="hidden sm:flex items-center rounded-xl border border-border/60 bg-muted/20 p-3">
          {editSteps.map((step, index) => (
            <div key={step} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => goToEditStep(index)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  editStep === index
                    ? "bg-primary/10 text-primary"
                    : index < editStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {step}
              </button>
              {index < editSteps.length - 1 && (
                <div className={`mx-1 h-px flex-1 ${index < editStep ? "bg-primary/30" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex sm:hidden items-center gap-1 rounded-xl border border-border/60 bg-muted/20 p-2">
          {editSteps.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => goToEditStep(index)}
              className="flex-1"
            >
              <div
                className={`h-1.5 rounded-full ${
                  index === editStep
                    ? "bg-primary"
                    : index < editStep
                      ? "bg-primary/40"
                      : "bg-muted"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Overview */}
        <div className={editStep === 0 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5" : "hidden"}>
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
          <RichTextField
            label="Description"
            name="description"
            value={editDescription}
            onChange={setEditDescription}
            placeholder="Write a concise journal overview. Use headings, lists, bold and italic formatting if needed."
            disabled={isSaving}
          />
          <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              name="editorialBoardCanReviewSubmissions"
              defaultChecked={journal.editorialBoardCanReviewSubmissions}
              disabled={isSaving}
              className="size-4 rounded border-input"
            />
            Editorial board can review submissions
          </label>
          <CoverImageUploadField defaultKey={journal.coverImageKey ?? ""} disabled={isSaving} />
        </div>

        {/* Aim & Scope */}
        <div className={editStep === 1 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5" : "hidden"}>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-primary">Aim & Scope</h3>
            <p className="text-sm text-muted-foreground">Define journal scope, topics, and accepted content formats.</p>
          </div>
          <RichTextField
            label="Aim and Scope"
            name="aimAndScope"
            value={editAimAndScope}
            onChange={setEditAimAndScope}
            placeholder="Define the journal mission, scope, and focus areas."
            disabled={isSaving}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <RichTextField
              label="Topics"
              name="topics"
              value={editTopics}
              onChange={setEditTopics}
              placeholder="List key domains, themes, and research topics."
              disabled={isSaving}
            />
            <RichTextField
              label="Content Types"
              name="contentTypes"
              value={editContentTypes}
              onChange={setEditContentTypes}
              placeholder="List accepted manuscript/content types."
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Policies */}
        <div className={editStep === 2 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5" : "hidden"}>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-primary">Policies</h3>
            <p className="text-sm text-muted-foreground">Public policies for ethics, disclosures, rights, and contact.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <RichTextField label="Ethics Policy" name="ethicsPolicy" value={ethicsPolicy} onChange={setEthicsPolicy} placeholder="Describe publication ethics, misconduct handling, and integrity standards." disabled={isSaving} />
            <RichTextField label="Disclosures Policy" name="disclosuresPolicy" value={disclosuresPolicy} onChange={setDisclosuresPolicy} placeholder="Describe conflict-of-interest and disclosure requirements." disabled={isSaving} />
            <RichTextField label="Rights & Permissions" name="rightsPermissions" value={rightsPermissions} onChange={setRightsPermissions} placeholder="Describe copyright, licensing, and reuse permissions." disabled={isSaving} />
            <RichTextField label="Contact Information" name="contactInfo" value={contactInfo} onChange={setContactInfo} placeholder="Add editorial office contact details and response expectations." disabled={isSaving} />
          </div>
        </div>

        {/* For Authors */}
        <div className={editStep === 3 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5" : "hidden"}>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-primary">For Authors</h3>
            <p className="text-sm text-muted-foreground">Author-facing workflow, checklist, guidelines, and fees.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <RichTextField label="Submission Checklist" name="submissionChecklist" value={submissionChecklist} onChange={setSubmissionChecklist} placeholder="Share a pre-submission checklist for authors." disabled={isSaving} />
            <RichTextField label="Submission Guidelines" name="submissionGuidelines" value={submissionGuidelines} onChange={setSubmissionGuidelines} placeholder="Provide manuscript formatting and citation guidance." disabled={isSaving} />
            <RichTextField label="How to Publish" name="howToPublish" value={howToPublish} onChange={setHowToPublish} placeholder="Explain the workflow from submission to publication." disabled={isSaving} />
            <RichTextField label="Fees & Funding" name="feesAndFunding" value={feesAndFunding} onChange={setFeesAndFunding} placeholder="Describe APCs, waivers, and funding support details." disabled={isSaving} />
          </div>
        </div>

        <input type="hidden" name="ethicsPolicy" value={ethicsPolicy} readOnly />
        <input type="hidden" name="description" value={editDescription} readOnly />
        <input type="hidden" name="aimAndScope" value={editAimAndScope} readOnly />
        <input type="hidden" name="topics" value={editTopics} readOnly />
        <input type="hidden" name="contentTypes" value={editContentTypes} readOnly />
        <input type="hidden" name="disclosuresPolicy" value={disclosuresPolicy} readOnly />
        <input type="hidden" name="rightsPermissions" value={rightsPermissions} readOnly />
        <input type="hidden" name="contactInfo" value={contactInfo} readOnly />
        <input type="hidden" name="submissionChecklist" value={submissionChecklist} readOnly />
        <input type="hidden" name="submissionGuidelines" value={submissionGuidelines} readOnly />
        <input type="hidden" name="howToPublish" value={howToPublish} readOnly />
        <input type="hidden" name="feesAndFunding" value={feesAndFunding} readOnly />

        <div className={editStep === 4 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-5" : "hidden"}>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Review</h3>
            <p className="text-sm text-muted-foreground">Confirm updates and save changes.</p>
          </div>
          <div className="grid gap-3 rounded-lg border border-border/50 bg-background p-3 text-sm">
            <div><span className="font-medium">Journal name:</span> {editName || "-"}</div>
            <div><span className="font-medium">Slug:</span> {editSlug || "-"}</div>
            <div><span className="font-medium">Policies filled:</span> {[ethicsPolicy, disclosuresPolicy, rightsPermissions, contactInfo].filter((v) => v.trim().length > 0).length} / 4</div>
            <div><span className="font-medium">Author guidance filled:</span> {[submissionChecklist, submissionGuidelines, howToPublish, feesAndFunding].filter((v) => v.trim().length > 0).length} / 4</div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/40 pt-5">
          <Button type="button" variant="ghost" onClick={() => goToEditStep(editStep - 1)} disabled={editStep === 0 || isSaving}>
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          {editStep < editSteps.length - 1 ? (
            <Button type="button" onClick={() => goToEditStep(editStep + 1)} disabled={isSaving}>
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save journal
            </Button>
          )}
        </div>
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

function RichTextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <MarkdownToolbarTextarea
      label={label}
      name={`${name}Editor`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={8}
    />
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
