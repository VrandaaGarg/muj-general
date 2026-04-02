"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  GitCompare,
  ImageIcon,
  Minus,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface VersionFile {
  fileKind: string;
  objectKey: string;
  originalName: string;
  sizeBytes: number;
  publicUrl: string | null;
}

interface VersionAuthor {
  id: string;
  displayName: string;
  email: string | null;
  affiliation: string | null;
  isCorresponding: boolean;
  authorOrder: number;
}

interface DiffVersion {
  versionNumber: number;
  title: string;
  abstract: string;
  license: string | null;
  changeSummary: string | null;
  notesToAdmin: string | null;
  supervisorName: string | null;
  programName: string | null;
  publicationDate: Date | null;
  files: VersionFile[];
  authors?: VersionAuthor[];
}

interface AdminVersionDiffProps {
  current: DiffVersion;
  previous: DiffVersion;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DiffBadge({ changed }: { changed: boolean }) {
  if (!changed) return null;
  return (
    <span className="ml-1.5 bg-amber-600/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
      changed
    </span>
  );
}

function FieldDiff({
  label,
  current,
  previous,
  multiline = false,
}: {
  label: string;
  current: string | null | undefined;
  previous: string | null | undefined;
  multiline?: boolean;
}) {
  const currentVal = current?.trim() || null;
  const previousVal = previous?.trim() || null;
  const changed = currentVal !== previousVal;

  return (
    <div className="  border border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <DiffBadge changed={changed} />
      </div>
      {changed ? (
        <div className="divide-y divide-border/50">
          {previousVal !== null && (
            <div className="flex items-start gap-2 bg-red-500/5 px-3 py-2">
              <Minus className="mt-0.5 size-3 shrink-0 text-red-500" />
              <p
                className={cn(
                  "text-xs text-red-700/80 line-through decoration-red-400/60",
                  multiline && "whitespace-pre-wrap leading-relaxed",
                )}
              >
                {previousVal}
              </p>
            </div>
          )}
          {currentVal !== null && (
            <div className="flex items-start gap-2 bg-emerald-500/5 px-3 py-2">
              <Plus className="mt-0.5 size-3 shrink-0 text-emerald-600" />
              <p
                className={cn(
                  "text-xs text-emerald-800",
                  multiline && "whitespace-pre-wrap leading-relaxed",
                )}
              >
                {currentVal}
              </p>
            </div>
          )}
          {currentVal === null && (
            <div className="flex items-start gap-2 bg-muted/20 px-3 py-2">
              <Minus className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <p className="text-xs italic text-muted-foreground">Removed</p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 py-2">
          <p
            className={cn(
              "text-xs text-muted-foreground",
              multiline && "whitespace-pre-wrap leading-relaxed",
              !currentVal && "italic",
            )}
          >
            {currentVal ?? "Not set"}
          </p>
        </div>
      )}
    </div>
  );
}

function FileDiff({
  label,
  icon: Icon,
  current,
  previous,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: VersionFile | undefined;
  previous: VersionFile | undefined;
}) {
  const changed =
    current?.objectKey !== previous?.objectKey ||
    current?.sizeBytes !== previous?.sizeBytes;

  const currentUrl = current?.publicUrl ?? null;
  const previousUrl = previous?.publicUrl ?? null;

  return (
    <div className="  border border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-1.5">
        <Icon className="size-3 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <DiffBadge changed={changed} />
      </div>
      {changed ? (
        <div className="divide-y divide-border/50">
          {previous && (
            <div className="flex items-center gap-2 bg-red-500/5 px-3 py-2">
              <Minus className="size-3 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-red-700/80 line-through decoration-red-400/60">
                  {previous.originalName}
                </p>
                <p className="text-[10px] text-red-500/70">{formatBytes(previous.sizeBytes)}</p>
              </div>
              {previousUrl && (
                <a
                  href={previousUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  View old
                </a>
              )}
            </div>
          )}
          {current && (
            <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-2">
              <Plus className="size-3 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-emerald-800">
                  {current.originalName}
                </p>
                <p className="text-[10px] text-emerald-700/70">{formatBytes(current.sizeBytes)}</p>
              </div>
              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-amber-700 underline underline-offset-2 hover:text-amber-800"
                >
                  View new
                </a>
              )}
            </div>
          )}
          {!current && previous && (
            <div className="flex items-center gap-2 bg-muted/20 px-3 py-2">
              <Minus className="size-3 shrink-0 text-muted-foreground" />
              <p className="text-xs italic text-muted-foreground">File removed</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2">
          {current ? (
            <>
              <p className="truncate text-xs text-muted-foreground">{current.originalName}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground/60">
                {formatBytes(current.sizeBytes)}
              </span>
              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto shrink-0 text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  View
                </a>
              )}
            </>
          ) : (
            <p className="text-xs italic text-muted-foreground">No file</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminVersionDiff({ current, previous }: AdminVersionDiffProps) {
  const [open, setOpen] = useState(true);

  const currentPdf = current.files.find((f) => f.fileKind === "main_pdf");
  const previousPdf = previous.files.find((f) => f.fileKind === "main_pdf");
  const currentCover = current.files.find((f) => f.fileKind === "cover_image");
  const previousCover = previous.files.find((f) => f.fileKind === "cover_image");

  const fields = [
    { key: "title", label: "Title", cur: current.title, prev: previous.title },
    { key: "license", label: "License", cur: current.license, prev: previous.license },
    { key: "supervisor", label: "Supervisor", cur: current.supervisorName, prev: previous.supervisorName },
    { key: "program", label: "Program", cur: current.programName, prev: previous.programName },
    { key: "pubDate", label: "Publication date", cur: formatDate(current.publicationDate), prev: formatDate(previous.publicationDate) },
  ];

  const changedCount =
    fields.filter((f) => (f.cur?.trim() || null) !== (f.prev?.trim() || null)).length +
    (current.abstract.trim() !== previous.abstract.trim() ? 1 : 0) +
    ((currentPdf?.objectKey !== previousPdf?.objectKey || currentPdf?.sizeBytes !== previousPdf?.sizeBytes) ? 1 : 0) +
    ((currentCover?.objectKey !== previousCover?.objectKey || currentCover?.sizeBytes !== previousCover?.sizeBytes) ? 1 : 0);

  return (
    <div className="   border border-amber-600/25 bg-amber-600/[0.03]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center   bg-amber-600/10">
            <GitCompare className="size-3.5 text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Changes since last review
            </p>
            <p className="text-[11px] text-muted-foreground">
              v{previous.versionNumber} → v{current.versionNumber}
              {changedCount > 0 && (
                <span className="ml-1.5 text-amber-700">
                  · {changedCount} field{changedCount !== 1 ? "s" : ""} changed
                </span>
              )}
              {changedCount === 0 && (
                <span className="ml-1.5 text-muted-foreground">· no detected changes</span>
              )}
            </p>
          </div>
        </div>
        <span className="inline-flex size-7 shrink-0 items-center justify-center     text-muted-foreground transition-colors hover:bg-muted">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-amber-600/15 px-5 pb-5 pt-4">

              {/* Change summary from editor */}
              {current.changeSummary && (
                <div className="  border border-amber-600/20 bg-amber-600/5 px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Change summary from editor (v{current.versionNumber})
                  </p>
                  <p className="text-xs leading-relaxed text-foreground/85">
                    {current.changeSummary}
                  </p>
                </div>
              )}

              {/* File diffs */}
              <div className="grid gap-2 sm:grid-cols-2">
                <FileDiff
                  label="PDF"
                  icon={FileText}
                  current={currentPdf}
                  previous={previousPdf}
                />
                <FileDiff
                  label="Cover image"
                  icon={ImageIcon}
                  current={currentCover}
                  previous={previousCover}
                />
              </div>

              {/* Abstract diff */}
              <FieldDiff
                label="Abstract"
                current={current.abstract}
                previous={previous.abstract}
                multiline
              />

              {/* Field diffs */}
              <div className="grid gap-2 sm:grid-cols-2">
                {fields.map((field) => (
                  <FieldDiff
                    key={field.key}
                    label={field.label}
                    current={field.cur ?? null}
                    previous={field.prev ?? null}
                  />
                ))}
              </div>

              {/* Authors (current state) */}
              {current.authors && current.authors.length > 0 && (
                <div className="  border border-border/50 overflow-hidden">
                  <div className="border-b border-border/50 bg-muted/30 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Authors (current)
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {current.authors.map((author) => (
                      <div key={author.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-xs">
                        <span className="font-medium">{author.displayName}</span>
                        {author.isCorresponding && (
                          <span className=" bg-amber-600/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                            Corresponding
                          </span>
                        )}
                        {author.email && (
                          <span className="text-muted-foreground">{author.email}</span>
                        )}
                        {author.affiliation && (
                          <span className="text-muted-foreground">· {author.affiliation}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
