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
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="space-y-6">
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
        <p className="mt-1 text-base text-muted-foreground">
          {count > 0
            ? `${count} saved item${count !== 1 ? "s" : ""} stored locally in your browser.`
            : "Items you save will appear here. Saved data is stored locally in your browser."}
        </p>
      </div>

      {count === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Bookmark className="size-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No saved items yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse research and click the Save button to bookmark articles
                for later.
              </p>
            </div>
            <Link
              href="/research"
              className="mt-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Browse research
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {count} item{count !== 1 ? "s" : ""}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={() => {
                clearAll();
                toast("All saved items cleared");
              }}
            >
              <Trash2 className="size-3" />
              Clear all
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
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
    <Card className="group border-border/60 transition-colors hover:border-primary/20">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {item.coverImageUrl ? (
            <Link
              href={`/research/${item.slug}`}
              className="relative hidden h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-border/50 sm:block"
            >
              <Image
                src={item.coverImageUrl}
                alt={item.title}
                fill
                sizes="80px"
                className="object-cover transition-transform group-hover:scale-105"
              />
            </Link>
          ) : (
            <Link
              href={`/research/${item.slug}`}
              className="hidden h-24 w-20 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 sm:flex"
            >
              <FileText className="size-6 text-muted-foreground/40" />
            </Link>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {getTypeLabel(item.itemType)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {item.publicationYear}
              </span>
              {item.departmentName && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.departmentName}
                  </span>
                </>
              )}
            </div>

            <Link
              href={`/research/${item.slug}`}
              className="block"
            >
              <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                {item.title}
              </h3>
            </Link>

            {item.authors.length > 0 && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {item.authors.join(", ")}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Saved {formatSavedDate(item.savedAt)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <BookmarkX className="size-3" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
