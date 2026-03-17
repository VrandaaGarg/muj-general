"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Building2 } from "lucide-react";

import { getTypeLabel, getTypeColor } from "@/lib/research-types";
import { cn } from "@/lib/utils";

interface RelatedItem {
  id: string;
  slug: string;
  title: string;
  itemType: string;
  publicationYear: number;
  departmentName: string | null;
  departmentSlug: string | null;
}

interface ResearchRelatedProps {
  related: RelatedItem[];
  more: RelatedItem[];
}

export function ResearchRelated({ related, more }: ResearchRelatedProps) {
  const hasRelated = related.length > 0;
  const hasMore = more.length > 0;

  if (!hasRelated && !hasMore) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 pb-16 md:px-12">
      {hasRelated && (
        <ItemGrid
          title="Related research"
          items={related}
          delayBase={0.6}
        />
      )}

      {hasMore && (
        <ItemGrid
          title="More from the repository"
          items={more}
          delayBase={hasRelated ? 0.9 : 0.6}
        />
      )}
    </div>
  );
}

function ItemGrid({
  title,
  items,
  delayBase,
}: {
  title: string;
  items: RelatedItem[];
  delayBase: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: delayBase }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <Link
          href="/research"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Browse all
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: delayBase + 0.1 + index * 0.08,
            }}
          >
            <Link
              href={`/research/${item.slug}`}
              className="group flex h-full flex-col rounded-xl border border-border/60 bg-card/50 p-4 transition-all hover:border-amber-600/25 hover:bg-amber-600/2 hover:shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight tracking-wide",
                    getTypeColor(item.itemType),
                  )}
                >
                  {getTypeLabel(item.itemType)}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <CalendarDays className="size-2.5" />
                  {item.publicationYear}
                </span>
              </div>
              <h3 className="flex-1 font-serif text-sm leading-snug tracking-tight text-foreground transition-colors group-hover:text-amber-700">
                {item.title}
              </h3>
              {item.departmentName && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Building2 className="size-2.5" />
                  {item.departmentName}
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
