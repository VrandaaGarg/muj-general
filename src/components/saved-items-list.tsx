"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  BookmarkX,
  ChevronRight,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useSavedResearchStore, type SavedResearchItem } from "@/stores/saved-research-store";
import { getTypeLabel } from "@/lib/research-types";
import { Button } from "@/components/ui/button";

function formatSavedDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SavedItemsList() {
  const items = useSavedResearchStore((s) => s.items);
  const unsave = useSavedResearchStore((s) => s.unsave);
  const clearAll = useSavedResearchStore((s) => s.clearAll);
  const count = items.length;

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/"
          className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80"
        >
          Home
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground/50" />
        <span className="font-medium text-foreground">Saved</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Saved Research
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Start building your personal library by saving research items you want to
        </p>
      </div>

      {count === 0 ? (
        <div className="   border border-border/60 bg-card/50 p-12 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center     bg-muted">
            <Bookmark className="size-6 text-muted-foreground/50" />
          </div>
          <p className="text-base font-semibold text-foreground">
            No saved items yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Browse research and click the Save button to bookmark articles for
            later reading.
          </p>
          <Link
            href="/research"
            className="mt-5 inline-flex items-center gap-1.5   bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse research
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <p className="text-sm text-muted-foreground">
              {count} item{count !== 1 ? "s" : ""}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                clearAll();
                toast("All saved items cleared");
              }}
            >
              <Trash2 className="size-3" />
              Clear all
            </Button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <SavedItemCard
                    item={item}
                    onRemove={() => {
                      unsave(item.id);
                      toast("Removed from saved items");
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function SavedItemCard({
  item,
  onRemove,
}: {
  item: SavedResearchItem;
  onRemove: () => void;
}) {
  return (
    <div className="group    border border-border/60 bg-card/50 p-5 transition-colors hover:border-primary/20 hover:bg-card/80">
      <div className="flex gap-5">
        {item.coverImageUrl ? (
          <Link
            href={`/research/${item.slug}`}
            className="relative hidden h-28 w-22 shrink-0 overflow-hidden   border border-border/50 sm:block"
          >
            <Image
              src={item.coverImageUrl}
              alt={item.title}
              fill
              sizes="88px"
              className="object-cover"
            />
          </Link>
        ) : (
          <Link
            href={`/research/${item.slug}`}
            className="hidden h-28 w-22 shrink-0 items-center justify-center   border border-border/50 bg-muted/30 sm:flex"
          >
            <FileText className="size-6 text-muted-foreground/40" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              {getTypeLabel(item.itemType)}
            </span>
            {item.departmentName && (
              <span className="    bg-muted/60 px-2 py-0.5 text-sm font-medium text-muted-foreground">
                {item.departmentName}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {item.publicationYear}
            </span>
          </div>

          <Link href={`/research/${item.slug}`} className="block">
            <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
              {item.title}
            </h3>
          </Link>

          {item.authors.length > 0 && (
            <p className="mt-1.5 line-clamp-1 text-sm leading-relaxed text-muted-foreground">
              {item.authors.join(", ")}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Saved {formatSavedDate(item.savedAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <BookmarkX className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
