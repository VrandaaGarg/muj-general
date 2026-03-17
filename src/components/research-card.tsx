"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Building2, Users } from "lucide-react";

import { getTypeLabel, getTypeColor } from "@/lib/research-types";
import { cn } from "@/lib/utils";

interface ResearchCardItem {
  slug: string;
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  departmentName: string | null;
  departmentSlug?: string | null;
  authors: { id: string; name: string }[];
  tags: { id: string; name: string; slug: string }[];
}

interface ResearchCardProps {
  item: ResearchCardItem;
  index: number;
}

export function ResearchCard({ item, index }: ResearchCardProps) {
  const snippet =
    item.abstract.length > 180
      ? item.abstract.slice(0, 180).trimEnd() + "…"
      : item.abstract;

  const visibleAuthors = item.authors.slice(0, 3);
  const extraAuthors = item.authors.length > 3 ? item.authors.length - 3 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.06, 0.5),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link
        href={`/research/${item.slug}`}
        className="group flex h-full flex-col rounded-xl border border-border/60 bg-card/50 p-5 transition-all hover:border-amber-600/25 hover:bg-amber-600/[0.02] hover:shadow-sm"
      >
        {/* Header: type badge + year */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold leading-tight tracking-wide",
              getTypeColor(item.itemType),
            )}
          >
            {getTypeLabel(item.itemType)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="size-3" />
            {item.publicationYear}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg leading-snug tracking-tight text-foreground transition-colors group-hover:text-amber-700 sm:text-xl">
          {item.title}
        </h3>

        {/* Abstract snippet */}
        <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
          {snippet}
        </p>

        {/* Meta footer */}
        <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-3">
          {visibleAuthors.length > 0 && (
            <div className="flex items-start gap-1.5">
              <Users className="mt-0.5 size-3 shrink-0 text-muted-foreground/60" />
              <span className="text-xs leading-snug text-muted-foreground">
                {visibleAuthors.map((a) => a.name).join(", ")}
                {extraAuthors > 0 && ` +${extraAuthors}`}
              </span>
            </div>
          )}

          {item.departmentName && (
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3 shrink-0 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground">
                {item.departmentName}
              </span>
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
              {item.tags.length > 4 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  +{item.tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
