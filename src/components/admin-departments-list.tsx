"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  Users,
} from "lucide-react";

import { createDepartmentAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
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
};

export function AdminDepartmentsList({ departments }: AdminDepartmentsListProps) {
  const searchParams = useSearchParams();
  const createParam = searchParams.get("create");
  const toast = createParam ? CREATE_MESSAGES[createParam] : null;

  const totalUsers = departments.reduce((sum, d) => sum + d.userCount, 0);
  const totalResearch = departments.reduce((sum, d) => sum + d.researchCount, 0);

  return (
    <div className="space-y-6">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium ${
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

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight">{departments.length}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Departments</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight">{totalUsers}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Members</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight">{totalResearch}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Publications</p>
        </div>
      </div>

      {/* Create form */}
      <CreateDepartmentForm />

      {/* Department list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          All departments
        </h2>
        {departments.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
                <Building2 className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No departments yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create the first department using the form above.
              </p>
            </CardContent>
          </Card>
        ) : (
          departments.map((dept, idx) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
            >
              <DepartmentCard department={dept} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function DepartmentCard({ department }: { department: DepartmentStat }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-600/10">
              <Building2 className="size-4 text-rose-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold tracking-tight truncate">
                {department.name}
              </CardTitle>
              <CardDescription className="truncate font-mono text-[10px]">
                /{department.slug}
              </CardDescription>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Users className="size-3" />
              {department.userCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <BookOpen className="size-3" />
              {department.researchCount}
            </span>
          </div>
        </div>
      </CardHeader>

      {department.description && (
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {department.description}
          </p>
        </CardContent>
      )}
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
                className="bg-rose-600 text-white hover:bg-rose-700"
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
