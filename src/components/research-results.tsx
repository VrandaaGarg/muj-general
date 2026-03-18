"use client";

import { motion } from "framer-motion";
import { BookX } from "lucide-react";

import { ResearchCard } from "@/components/research-card";

interface ResearchListItem {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  publishedAt: Date | null;
  departmentName: string | null;
  departmentSlug: string | null;
  authors: { id: string; name: string }[];
  tags: { id: string; name: string; slug: string }[];
  coverImageUrl: string | null;
}

interface ResearchResultsProps {
  items: ResearchListItem[];
  totalCount: number;
  currentPage?: number;
  pageSize?: number;
}

export function ResearchResults({ items, totalCount, currentPage = 1, pageSize = 9 }: ResearchResultsProps) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 py-20 text-center"
      >
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <BookX className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-sans text-lg text-foreground">
          No results found
        </h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Try adjusting your search or filters to discover research from across
          MUJ.
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Result count */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-4 font-semibold text-sm text-primary"
      >
        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
      </motion.p>

      {/* List */}
      <div className="grid gap-4">
        {items.map((item, index) => (
          <ResearchCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
