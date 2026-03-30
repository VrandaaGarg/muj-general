"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

import { getTypeLabel } from "@/lib/research-types";

interface ResearchCardItem {
  slug: string;
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  publishedAt?: Date | null;
  departmentName: string | null;
  departmentSlug?: string | null;
  authors: { id?: string; name: string }[];
  tags: { id?: string; name: string; slug?: string }[];
  coverImageUrl: string | null;
}

interface ResearchCardProps {
  item: ResearchCardItem;
  index: number;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ResearchCard({ item, index }: ResearchCardProps) {
  const snippet =
    item.abstract.length > 180
      ? item.abstract.slice(0, 180).trimEnd() + "..."
      : item.abstract;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.05, 0.4),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link
        href={`/research/${item.slug}`}
        className="group flex items-start gap-6 border-b-2 border-border py-6 transition-colors first:pt-0"
      >
        {/* Left: content */}
        <div className="min-w-0 flex-1">
          {/* Type label */}
          <p className="mb-2 text-md font-semibold text-foreground">
            {getTypeLabel(item.itemType)}
          </p>

          {/* Title — full, no truncation */}
          <h3 className="mb-2 text-2xl font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary group-hover:underline">
            {item.title}
          </h3>

          {/* Abstract snippet */}
          {item.abstract && (
            <p className="mb-3 text-md leading-relaxed text-muted-foreground">
              {snippet}
            </p>
          )}

          {/* Authors */}
          {item.authors.length > 0 && (
            <p className="mb-1 text-sm text-muted-foreground">
              {item.authors.map((a) => a.name).join(", ")}
            </p>
          )}

          {/* Published date */}
          {item.publishedAt && (
            <p className="text-sm font-medium text-foreground">
              {formatDate(item.publishedAt)}
            </p>
          )}
        </div>

        {/* Right: thumbnail */}
        {item.coverImageUrl ? (
          <div className="relative hidden size-40 shrink-0 overflow-hidden   sm:block lg:size-44">
            <Image
              src={item.coverImageUrl}
              alt={item.title}
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="hidden size-40 shrink-0 items-center justify-center   bg-muted/50 sm:flex lg:size-44">
            <FileText className="size-8 text-muted-foreground/25" />
          </div>
        )}
      </Link>
    </motion.div>
  );
}
