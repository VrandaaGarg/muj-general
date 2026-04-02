"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Archive,
  BookOpen,
  Building2,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveDepartmentAction,
  createDepartmentAction,
  deleteDepartmentAction,
  updateDepartmentAction,
} from "@/lib/actions/admin";
import { useLocalCache } from "@/hooks/use-local-cache";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DepartmentStat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  userCount: number;
  researchCount: number;
}

interface AdminDepartmentsListProps {
  departments: DepartmentStat[];
}

const CREATE_MESSAGES: Record<string, { text: string; type: "success" | "error" }> = {
  success: { text: "Department created successfully.", type: "success" },
  invalid: { text: "Invalid data — name and slug are required.", type: "error" },
  updated: { text: "Department updated successfully.", type: "success" },
  archived: { text: "Department archived.", type: "success" },
  restored: { text: "Department restored.", type: "success" },
  deleted: { text: "Department deleted.", type: "success" },
  "has-links": {
    text: "Cannot delete department with linked users or research items.",
    type: "error",
  },
};

export function AdminDepartmentsList({ departments }: AdminDepartmentsListProps) {
  const { data: cachedDepartments } = useLocalCache(
    "admin-departments:list",
    departments,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const createParam = searchParams.get("create") ?? searchParams.get("op");

  useEffect(() => {
    if (!createParam) return;
    const msg = CREATE_MESSAGES[createParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else toast.error(msg.text);
    router.replace("/admin/departments", { scroll: false });
  }, [createParam, router]);

  const totalUsers = cachedDepartments.reduce((sum, d) => sum + d.userCount, 0);
  const totalResearch = cachedDepartments.reduce((sum, d) => sum + d.researchCount, 0);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="  border border-border/60 bg-card p-3 text-center">
            <p className="text-lg font-semibold tracking-tight">{cachedDepartments.length}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Departments</p>
        </div>
        <div className="  border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight">{totalUsers}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Members</p>
        </div>
        <div className="  border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight">{totalResearch}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Publications</p>
        </div>
      </div>

      {/* Create form */}
      <CreateDepartmentForm
        key={createParam === "success" ? "department-form-reset" : "department-form"}
      />

      {/* Department list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          All departments
        </h2>
        {cachedDepartments.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center   bg-muted">
                <Building2 className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No departments yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create the first department using the form above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cachedDepartments.map((dept, idx) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                className="h-full"
              >
                <DepartmentCard department={dept} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DepartmentCard({ department }: { department: DepartmentStat }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<
    null | { mode: "archive" | "restore" | "delete" }
  >(null);

  async function handleUpdate(formData: FormData) {
    setSaving(true);
    try {
      await updateDepartmentAction(formData);
    } catch {
      setSaving(false);
    }
  }

  async function handleArchive(mode: "archive" | "restore") {
    const formData = new FormData();
    formData.set("departmentId", department.id);
    formData.set("mode", mode);
    setSaving(true);
    try {
      await archiveDepartmentAction(formData);
    } catch {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const formData = new FormData();
    formData.set("departmentId", department.id);
    setSaving(true);
    try {
      await deleteDepartmentAction(formData);
    } catch {
      setSaving(false);
    }
  }

  return (
    <Card className="h-full border-border/60 bg-card/90">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center   bg-primary/10">
              <Building2 className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base font-semibold tracking-tight">
                {department.name}
              </CardTitle>
              <CardDescription className="mt-0.5 truncate font-mono text-[11px]">
                /{department.slug}
              </CardDescription>
              {department.archivedAt && (
                <p className="mt-1 inline-flex    bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Archived
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1    border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Users className="size-3" />
              {department.userCount}
            </span>
            <span className="inline-flex items-center gap-1    border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <BookOpen className="size-3" />
              {department.researchCount}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {editing ? (
          <form action={handleUpdate} className="space-y-2 border-t border-border/50 pt-3">
            <input type="hidden" name="departmentId" value={department.id} />
            <Input
              name="name"
              defaultValue={department.name}
              required
              maxLength={160}
              disabled={saving}
            />
            <Input
              name="slug"
              defaultValue={department.slug}
              required
              maxLength={180}
              disabled={saving}
            />
            <Textarea
              name="description"
              defaultValue={department.description ?? ""}
              maxLength={500}
              disabled={saving}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                <Check className="size-3.5" />
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            {department.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {department.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                disabled={saving}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirmState({ mode: department.archivedAt ? "restore" : "archive" })
                }
                disabled={saving}
              >
                {department.archivedAt ? (
                  <Undo2 className="size-3.5" />
                ) : (
                  <Archive className="size-3.5" />
                )}
                {department.archivedAt ? "Restore" : "Archive"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmState({ mode: "delete" })}
                disabled={saving}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmState !== null}
        title={
          confirmState?.mode === "delete"
            ? "Delete this department?"
            : confirmState?.mode === "archive"
              ? "Archive this department?"
              : "Restore this department?"
        }
        description={
          confirmState?.mode === "delete"
            ? "This action permanently deletes the department. It only works if no users or items are linked."
            : confirmState?.mode === "archive"
              ? "Archived departments are hidden from normal selection lists until restored."
              : "This will make the department active and selectable again."
        }
        confirmLabel={
          confirmState?.mode === "delete"
            ? "Delete"
            : confirmState?.mode === "archive"
              ? "Archive"
              : "Restore"
        }
        cancelLabel="Cancel"
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;
          setConfirmState(null);
          if (confirmState.mode === "delete") {
            await handleDelete();
            return;
          }
          await handleArchive(confirmState.mode);
        }}
      />
    </Card>
  );
}

function CreateDepartmentForm() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) {
      setSlug(
        value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-"),
      );
    }
  }

  function handleSlugChange(value: string) {
    setAutoSlug(false);
    setSlug(value);
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    try {
      await createDepartmentAction(formData);
    } catch {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full border-dashed"
      >
        <Plus className="size-3.5" />
        Create department
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">
            New department
          </CardTitle>
          <CardDescription>
            Add a new academic department to the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name" className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dept-name"
                  name="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Computer Science"
                  required
                  minLength={2}
                  maxLength={160}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept-slug" className="text-xs">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dept-slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="computer-science"
                  required
                  minLength={2}
                  maxLength={180}
                  pattern="^[a-z0-9-]+$"
                  title="Lowercase letters, numbers, and hyphens only"
                  disabled={saving}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-desc" className="text-xs">
                Description
              </Label>
              <Textarea
                id="dept-desc"
                name="description"
                placeholder="Brief description of the department…"
                maxLength={500}
                rows={2}
                disabled={saving}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={saving || !name.trim() || !slug.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {saving ? "Creating…" : "Create department"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
