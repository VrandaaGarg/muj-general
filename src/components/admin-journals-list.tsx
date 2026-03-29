"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  FileText,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  ScrollText,
  Shield,
  User,
  Users,
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
import { MarkdownToolbarTextarea } from "@/components/ui/markdown-toolbar-textarea";
import { Textarea } from "@/components/ui/textarea";

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

const JOURNAL_CREATE_STEPS = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "scope", label: "Aim & Scope", icon: FileText },
  { key: "policies", label: "Policies", icon: Shield },
  { key: "authors", label: "For Authors", icon: User },
  { key: "board", label: "Editorial Board", icon: Users },
  { key: "review", label: "Review", icon: CircleHelp },
] as const;

type BoardDraft = {
  personName: string;
  role: string;
  affiliation: string;
  email: string;
  orcid: string;
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
  "slug-exists": { text: "This journal slug already exists. Choose a different slug.", type: "error" },
  "name-exists": { text: "A journal with this name already exists.", type: "error" },
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

export function AdminJournalsList({
  journals,
  mode = "list",
}: {
  journals: JournalOverview[];
  mode?: "list" | "create";
}) {
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
  const [createDescription, setCreateDescription] = useState("");
  const [createAimAndScope, setCreateAimAndScope] = useState("");
  const [createTopics, setCreateTopics] = useState("");
  const [createContentTypes, setCreateContentTypes] = useState("");
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createStep, setCreateStep] = useState(0);

  const [ethicsPolicy, setEthicsPolicy] = useState("");
  const [disclosuresPolicy, setDisclosuresPolicy] = useState("");
  const [rightsPermissions, setRightsPermissions] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submissionChecklist, setSubmissionChecklist] = useState("");
  const [submissionGuidelines, setSubmissionGuidelines] = useState("");
  const [howToPublish, setHowToPublish] = useState("");
  const [feesAndFunding, setFeesAndFunding] = useState("");
  const [boardMembers, setBoardMembers] = useState<BoardDraft[]>([]);

  const createSteps = JOURNAL_CREATE_STEPS;
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);

  function handleCreateNameChange(nextName: string) {
    setCreateName(nextName);
    if (!createSlugTouched) {
      setCreateSlug(slugifyJournalName(nextName));
    }
  }

  function canAdvanceFromCreateStep(step: number) {
    if (step === 0) {
      return createName.trim().length >= 2 && createSlug.trim().length >= 2;
    }
    return true;
  }

  function goToCreateStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= createSteps.length) return;
    if (nextStep > createStep && !canAdvanceFromCreateStep(createStep)) {
      toast.error("Journal name and slug are required before continuing.");
      return;
    }
    setCreateStep(nextStep);
  }

  function addBoardMember() {
    setBoardMembers((prev) => [
      ...prev,
      {
        personName: "",
        role: "",
        affiliation: "",
        email: "",
        orcid: "",
      },
    ]);
  }

  function updateBoardMember(
    index: number,
    field: keyof BoardDraft,
    value: string,
  ) {
    setBoardMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member,
      ),
    );
  }

  function removeBoardMember(index: number) {
    setBoardMembers((prev) => prev.filter((_, i) => i !== index));
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

  const totalPages = Math.max(1, Math.ceil(journals.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedJournals = journals.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      {mode === "create" ? (
        <Card className="border-border/60 py-4">
        {/* <CardHeader>
        
          <CardTitle className="text-2xl font-semibold text-primary tracking-tight">Create Journal</CardTitle>
          <CardDescription>Start a new journal and configure its public profile.</CardDescription>
        </CardHeader> */}
        <CardContent>
          <form action={handleCreate} className="grid gap-4">
            <div className="hidden sm:flex items-center rounded-xl border border-border/60 bg-muted/20 p-3">
              {createSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = createStep === index;
                const isPast = index < createStep;
                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <button
                      type="button"
                      onClick={() => goToCreateStep(index)}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : isPast
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-[10px] ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : isPast
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isPast ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                      </span>
                      <span className="hidden md:inline">{step.label}</span>
                    </button>
                    {index < createSteps.length - 1 && (
                      <div className={`mx-1 h-px flex-1 ${index < createStep ? "bg-primary/30" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex sm:hidden items-center gap-1 rounded-xl border border-border/60 bg-muted/20 p-2">
              {createSteps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => goToCreateStep(index)}
                  className="flex-1"
                >
                  <div
                    className={`h-1.5 rounded-full ${
                      index === createStep
                        ? "bg-primary"
                        : index < createStep
                          ? "bg-primary/40"
                          : "bg-muted"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className={createStep === 0 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4" : "hidden"}>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Overview</h3>
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
              <RichTextField
                label="Description"
                name="description"
                value={createDescription}
                onChange={setCreateDescription}
                placeholder="Write a concise journal overview. Use headings, lists, bold and italic formatting if needed."
                disabled={isCreating}
              />
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

            <div className={createStep === 1 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4" : "hidden"}>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Aim &amp; Scope</h3>
                <p className="text-sm text-muted-foreground">
                  Define journal scope, topics, and accepted content formats.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <RichTextField
                    label="Aim and Scope"
                    name="aimAndScope"
                    value={createAimAndScope}
                    onChange={setCreateAimAndScope}
                    placeholder="Define the journal mission, scope, and focus areas."
                    disabled={isCreating}
                  />
                </div>
                <RichTextField
                  label="Topics"
                  name="topics"
                  value={createTopics}
                  onChange={setCreateTopics}
                  placeholder="List key domains, themes, and research topics."
                  disabled={isCreating}
                />
                <RichTextField
                  label="Content Types"
                  name="contentTypes"
                  value={createContentTypes}
                  onChange={setCreateContentTypes}
                  placeholder="List accepted manuscript/content types."
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className={createStep === 2 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4" : "hidden"}>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Write policy text with markdown formatting tools.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <RichTextField label="Ethics Policy" name="ethicsPolicy" placeholder="Describe publication ethics, misconduct handling, and integrity standards." value={ethicsPolicy} onChange={setEthicsPolicy} disabled={isCreating} />
                <RichTextField label="Disclosures Policy" name="disclosuresPolicy" placeholder="Describe conflict-of-interest and disclosure requirements." value={disclosuresPolicy} onChange={setDisclosuresPolicy} disabled={isCreating} />
                <RichTextField label="Rights & Permissions" name="rightsPermissions" placeholder="Describe copyright, licensing, and reuse permissions." value={rightsPermissions} onChange={setRightsPermissions} disabled={isCreating} />
                <RichTextField label="Contact Information" name="contactInfo" placeholder="Add editorial office contact details and response expectations." value={contactInfo} onChange={setContactInfo} disabled={isCreating} />
              </div>
            </div>

            <div className={createStep === 3 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4" : "hidden"}>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">For Authors</h3>
                <p className="text-sm text-muted-foreground">
                  Provide submission requirements, process guidance, and fee notes.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <RichTextField label="Submission Checklist" name="submissionChecklist" placeholder="Share a pre-submission checklist for authors." value={submissionChecklist} onChange={setSubmissionChecklist} disabled={isCreating} />
                <RichTextField label="Submission Guidelines" name="submissionGuidelines" placeholder="Provide manuscript formatting and citation guidance." value={submissionGuidelines} onChange={setSubmissionGuidelines} disabled={isCreating} />
                <RichTextField label="How to Publish" name="howToPublish" placeholder="Explain the workflow from submission to publication." value={howToPublish} onChange={setHowToPublish} disabled={isCreating} />
                <RichTextField label="Fees & Funding" name="feesAndFunding" placeholder="Describe APCs, waivers, and funding support details." value={feesAndFunding} onChange={setFeesAndFunding} disabled={isCreating} />
              </div>
            </div>

            <div className={createStep === 4 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4" : "hidden"}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Editorial Board</h3>
                  <p className="text-sm text-muted-foreground">
                    Optional: add editorial board members now, or manage them later from journal edit.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addBoardMember}>
                  <Plus className="size-3.5" />
                  Add member
                </Button>
              </div>

              {boardMembers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                  No members added yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {boardMembers.map((member, index) => (
                    <div key={`board-${index}`} className="rounded-xl border border-border/60 bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Member {index + 1}</p>
                        <Button type="button" variant="ghost" size="xs" onClick={() => removeBoardMember(index)}>
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Name" name={`board-name-${index}`} value={member.personName} onChange={(e) => updateBoardMember(index, "personName", e.target.value)} />
                        <Field label="Role" name={`board-role-${index}`} value={member.role} onChange={(e) => updateBoardMember(index, "role", e.target.value)} />
                        <Field label="Affiliation" name={`board-aff-${index}`} value={member.affiliation} onChange={(e) => updateBoardMember(index, "affiliation", e.target.value)} />
                        <Field label="Email" name={`board-email-${index}`} type="email" value={member.email} onChange={(e) => updateBoardMember(index, "email", e.target.value)} />
                        <Field label="ORCID" name={`board-orcid-${index}`} className="sm:col-span-2" value={member.orcid} onChange={(e) => updateBoardMember(index, "orcid", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={createStep === 5 ? "space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4" : "hidden"}>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Review</h3>
                <p className="text-sm text-muted-foreground">Review core details before creating the journal.</p>
              </div>
              <div className="grid gap-3 rounded-lg border border-border/50 bg-background p-3 text-sm">
                <div><span className="font-medium">Journal name:</span> {createName || "-"}</div>
                <div><span className="font-medium">Slug:</span> {createSlug || "-"}</div>
                <div><span className="font-medium">Policies filled:</span> {[ethicsPolicy, disclosuresPolicy, rightsPermissions, contactInfo].filter((v) => v.trim().length > 0).length} / 4</div>
                <div><span className="font-medium">Author guidance filled:</span> {[submissionChecklist, submissionGuidelines, howToPublish, feesAndFunding].filter((v) => v.trim().length > 0).length} / 4</div>
                <div><span className="font-medium">Board members:</span> {boardMembers.filter((m) => m.personName.trim() && m.role.trim()).length}</div>
              </div>
            </div>

            <input
              type="hidden"
              name="boardMembersJson"
              value={JSON.stringify(
                boardMembers
                  .filter((m) => m.personName.trim() && m.role.trim())
                  .map((member, index) => ({
                    personName: member.personName.trim(),
                    role: member.role.trim(),
                    affiliation: member.affiliation.trim(),
                    email: member.email.trim(),
                    orcid: member.orcid.trim(),
                    displayOrder: index,
                  })),
              )}
              readOnly
            />

            <div className="flex items-center justify-between border-t border-border/40 pt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => goToCreateStep(createStep - 1)}
                disabled={createStep === 0 || isCreating}
              >
                <ArrowLeft className="size-3.5" />
                Back
              </Button>

              {createStep < createSteps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => goToCreateStep(createStep + 1)}
                  disabled={isCreating}
                >
                  Next
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button type="submit" disabled={isCreating} className="bg-primary text-white hover:bg-primary/90">
                  {isCreating ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Create journal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      ) : (
        <>
          <Card className="border-border/60 bg-muted/20">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                Create a new journal
              </CardTitle>
              <CardDescription>
                Start a new journal profile, configure scope and policies, then publish it to the journals listing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/journals/new/submission">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Create journal
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {journals.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No journals launched yet.
              </CardContent>
            </Card>
          ) : (
            <>
              {paginatedJournals.map((journal, index) => (
                <JournalCard key={journal.id} journal={journal} index={index} />
              ))}

              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + pageSize, journals.length)} of {journals.length} journals
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ArrowLeft className="size-3.5" />
                    Prev
                  </Button>
                  <span className="text-xs font-medium text-foreground">
                    Page {safePage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                  >
                    Next
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
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

function RichTextField({
  label,
  name,
  placeholder,
  disabled,
  value,
  onChange,
}: {
  label: string;
  name: string;
  placeholder: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <MarkdownToolbarTextarea
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={8}
    />
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
