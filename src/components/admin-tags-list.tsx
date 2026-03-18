"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Archive,
  BookOpen,
  Check,
  Loader2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveTagAction,
  createTagAction,
  deleteTagAction,
  updateTagAction,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TagStat {
  id: string;
  name: string;
  slug: string;
  archivedAt: Date | null;
  createdAt: Date;
  researchCount: number;
}

interface AdminTagsListProps {
  tags: TagStat[];
}

const CREATE_MESSAGES: Record<
  string,
  { text: string; type: "success" | "error" }
> = {
  success: { text: "Tag created successfully.", type: "success" },
  updated: { text: "Tag updated successfully.", type: "success" },
  archived: { text: "Tag archived.", type: "success" },
  restored: { text: "Tag restored.", type: "success" },
  deleted: { text: "Tag deleted.", type: "success" },
  "has-links": {
    text: "Cannot delete tag while it is attached to research items.",
    type: "error",
  },
  invalid: {
    text: "Invalid data — name and slug are required.",
    type: "error",
  },
};

export function AdminTagsList({ tags }: AdminTagsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createParam = searchParams.get("create") ?? searchParams.get("op");

  useEffect(() => {
    if (!createParam) return;
    const msg = CREATE_MESSAGES[createParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else toast.error(msg.text);
    router.replace("/admin/tags", { scroll: false });
  }, [createParam, router]);

  const totalResearch = tags.reduce((sum, t) => sum + t.researchCount, 0);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight">{tags.length}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Tags</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3 text-center">
          <p className="text-lg font-semibold tracking-tight">
            {totalResearch}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground">
            Tagged items
          </p>
        </div>
      </div>

      {/* Create form */}
      <CreateTagForm />

      {/* Tag list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          All tags
        </h2>
        {tags.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
                <Tag className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No tags yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create the first tag using the form above.
              </p>
            </CardContent>
          </Card>
        ) : (
          tags.map((tag, idx) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
            >
              <TagCard tag={tag} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function TagCard({ tag }: { tag: TagStat }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpdate(formData: FormData) {
    setSaving(true);
    try {
      await updateTagAction(formData);
    } catch {
      setSaving(false);
    }
  }

  async function handleArchive(mode: "archive" | "restore") {
    if (!window.confirm(mode === "archive" ? "Archive this tag?" : "Restore this tag?")) {
      return;
    }

    const formData = new FormData();
    formData.set("tagId", tag.id);
    formData.set("mode", mode);
    setSaving(true);
    try {
      await archiveTagAction(formData);
    } catch {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this tag permanently?")) {
      return;
    }

    const formData = new FormData();
    formData.set("tagId", tag.id);
    setSaving(true);
    try {
      await deleteTagAction(formData);
    } catch {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-600/10">
              <Tag className="size-4 text-rose-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold tracking-tight">
                {tag.name}
              </CardTitle>
              <CardDescription className="truncate font-mono text-[10px]">
                /{tag.slug}
              </CardDescription>
              {tag.archivedAt && (
                <p className="mt-1 text-[10px] font-medium text-amber-600">
                  Archived
                </p>
              )}
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <BookOpen className="size-3" />
            {tag.researchCount}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {editing ? (
          <form action={handleUpdate} className="space-y-2">
            <input type="hidden" name="tagId" value={tag.id} />
            <Input name="name" defaultValue={tag.name} required maxLength={120} disabled={saving} />
            <Input name="slug" defaultValue={tag.slug} required maxLength={140} disabled={saving} />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                <Check className="size-3.5" />
                Save
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} disabled={saving}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleArchive(tag.archivedAt ? "restore" : "archive")}
              disabled={saving}
            >
              {tag.archivedAt ? <Undo2 className="size-3.5" /> : <Archive className="size-3.5" />}
              {tag.archivedAt ? "Restore" : "Archive"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={saving}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateTagForm() {
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
      await createTagAction(formData);
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
        Create tag
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
            New tag
          </CardTitle>
          <CardDescription>
            Add a tag to organize and categorize research items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tag-name" className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tag-name"
                  name="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Machine Learning"
                  required
                  minLength={2}
                  maxLength={120}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tag-slug" className="text-xs">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tag-slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="machine-learning"
                  required
                  minLength={2}
                  maxLength={140}
                  pattern="^[a-z0-9-]+$"
                  title="Lowercase letters, numbers, and hyphens only"
                  disabled={saving}
                  className="font-mono text-xs"
                />
              </div>
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
                {saving ? "Creating..." : "Create tag"}
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
