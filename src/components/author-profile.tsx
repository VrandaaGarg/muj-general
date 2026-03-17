"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Mail,
  User,
} from "lucide-react";

import { ResearchCard } from "@/components/research-card";
import { cn } from "@/lib/utils";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

interface AuthorItem {
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
}

interface AuthorProfileProps {
  author: {
    id: string;
    name: string;
    affiliation: string | null;
    email: string | null;
    orcid: string | null;
    items: AuthorItem[];
  };
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function AuthorProfile({ author }: AuthorProfileProps) {
  const initials = getInitials(author.name);

  return (
    <section className="relative">
      {/* Warm overlay gradient */}
      <div className="pointer-events-none absolute inset-0 -top-20 bg-gradient-to-b from-amber-600/[0.03] via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 pt-4 pb-12 md:px-12">
        {/* Breadcrumb */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
          <Link
            href="/research"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to repository
          </Link>
        </motion.div>

        {/* Author header */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 flex items-start gap-5"
        >
          {/* Avatar */}
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-amber-600/20 bg-amber-600/[0.06] sm:size-20">
            <span className="font-serif text-xl font-semibold text-amber-700 sm:text-2xl">
              {initials}
            </span>
          </div>

          <div className="min-w-0 pt-1">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Author
            </p>
            <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {author.name}
            </h1>

            {author.affiliation && (
              <div className="mt-2 flex items-center gap-1.5">
                <Building2 className="size-3.5 shrink-0 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  {author.affiliation}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Contact links */}
        {(author.email || author.orcid) && (
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            {author.email && (
              <a
                href={`mailto:${author.email}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
                  "hover:border-amber-600/25 hover:bg-amber-600/[0.02] hover:text-foreground",
                )}
              >
                <Mail className="size-3" />
                {author.email}
              </a>
            )}
            {author.orcid && (
              <a
                href={`https://orcid.org/${author.orcid}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
                  "hover:border-amber-600/25 hover:bg-amber-600/[0.02] hover:text-foreground",
                )}
              >
                <ExternalLink className="size-3" />
                ORCID: {author.orcid}
              </a>
            )}
          </motion.div>
        )}

        {/* Divider */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 border-t border-border/60"
        />

        {/* Published items */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8"
        >
          <div className="mb-5 flex items-center gap-2">
            <User className="size-3.5 text-muted-foreground/60" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Published work
            </h2>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {author.items.length}
            </span>
          </div>

          {author.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
              <p className="font-serif text-lg text-foreground">
                No publications yet
              </p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                This author doesn&apos;t have any published items in the repository.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {author.items.map((item, index) => (
                <ResearchCard key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
