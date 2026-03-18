"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Users } from "lucide-react";

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
  authors: { id: string; name: string }[];
  coverImageUrl: string | null;
}

interface ResearchRelatedProps {
  related: RelatedItem[];
  more: RelatedItem[];
  sameAuthors?: RelatedItem[];
}

export function ResearchRelated({
  related,
  more,
  sameAuthors = [],
}: ResearchRelatedProps) {
  const hasRelated = related.length > 0;
  const hasMore = more.length > 0;
  const hasSameAuthors = sameAuthors.length > 0;

  if (!hasRelated && !hasMore && !hasSameAuthors) return null;

  // Compute staggered delays based on which sections are visible
  const sections: Array<{
    key: string;
    title: string;
    items: RelatedItem[];
  }> = [];

  if (hasSameAuthors) {
    sections.push({ key: "same-authors", title: "More from the same authors", items: sameAuthors });
  }
  if (hasRelated) {
    sections.push({ key: "related", title: "Related research", items: related });
  }
  if (hasMore) {
    sections.push({ key: "more", title: "More from the repository", items: more });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 pb-16 md:px-12">
      {sections.map((section, sectionIndex) => (
        <ItemGrid
          key={section.key}
          title={section.title}
          items={section.items}
          delayBase={0.6 + sectionIndex * 0.3}
        />
      ))}
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
        {items.map((item, index) => {
          const visibleAuthors = item.authors.slice(0, 2);
          const extraAuthors =
            item.authors.length > 2 ? item.authors.length - 2 : 0;

          return (
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
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-all hover:border-amber-600/25 hover:bg-amber-600/2 hover:shadow-sm"
              >
                {/* Thumbnail */}
                {item.coverImageUrl && (
                  <div className="relative aspect-4/3 w-full overflow-hidden border-b border-border/40">
                    <Image
                      src={item.coverImageUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4">
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

                  <h3 className="line-clamp-2 flex-1 font-sans text-sm leading-snug tracking-tight text-foreground transition-colors group-hover:text-amber-700">
                    {item.title}
                  </h3>

                  {visibleAuthors.length > 0 && (
                    <div className="mt-2 flex items-start gap-1 text-[10px] text-muted-foreground">
                      <Users className="mt-0.5 size-2.5 shrink-0" />
                      <span className="line-clamp-1">
                        {visibleAuthors.map((a) => a.name).join(", ")}
                        {extraAuthors > 0 && ` +${extraAuthors}`}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
