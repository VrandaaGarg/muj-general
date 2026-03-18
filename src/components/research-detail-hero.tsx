"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  FileText,
  GraduationCap,
  Home,
  LinkIcon,
  Scale,
  Users,
} from "lucide-react";

import { trackDownload } from "@/lib/actions/research";
import { ResearchThumbnail } from "@/components/pdf-thumbnail-viewer";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { getTypeLabel, getTypeColor } from "@/lib/research-types";

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

interface ResearchDetailHeroProps {
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  publishedAt: Date | null;
  departmentName: string | null;
  departmentSlug: string | null;
  authors: { id: string; name: string }[];
  tags: { id: string; name: string; slug: string }[];
  doi: string | null;
  license: string | null;
  externalUrl: string | null;
  supervisorName: string | null;
  programName: string | null;
  fileUrl: string | null;
  fileOriginalName: string | null;
  fileSizeBytes: number | null;
  coverImageUrl: string | null;
  researchItemId: string;
  viewCount: number;
  downloadCount: number;
  references: Array<{ citationText: string; url: string | null }>;
}

export function ResearchDetailHero({
  title,
  abstract,
  itemType,
  publicationYear,
  departmentName,
  departmentSlug,
  authors,
  tags,
  doi,
  license,
  externalUrl,
  supervisorName,
  programName,
  fileUrl,
  fileOriginalName,
  fileSizeBytes,
  coverImageUrl,
  researchItemId,
  viewCount,
  downloadCount,
  references,
}: ResearchDetailHeroProps) {
  return (
    <section className="relative">
      {/* Warm overlay gradient */}
      <div className="pointer-events-none absolute inset-0 -top-20 bg-linear-to-b from-amber-600/3 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 pt-4 pb-12 md:px-12">
        {/* Breadcrumb */}
        <motion.nav
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/research"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground"
          >
            <Home className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Repository</span>
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/50" />
          <span className="max-w-70 truncate font-medium text-foreground sm:max-w-md">
            {title}
          </span>
        </motion.nav>

        {/* Two-column layout: metadata left, thumbnail right on lg+ */}
        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {/* Left column — metadata + actions */}
          <div className="min-w-0 flex-1">
            {/* Type badge + year */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center gap-2.5"
            >
              <span
                className={cn(
                  "inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold leading-tight tracking-wide",
                  getTypeColor(itemType),
                )}
              >
                {getTypeLabel(itemType)}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="size-3" />
                {publicationYear}
              </span>
              {departmentName && departmentSlug && (
                <Link
                  href={`/departments/${departmentSlug}`}
                  className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Building2 className="size-3" />
                  {departmentName}
                </Link>
              )}
              {(viewCount > 0 || downloadCount > 0) && (
                <>
                  <span className="text-border">·</span>
                  {viewCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="size-3" />
                      {viewCount.toLocaleString()} {viewCount === 1 ? "view" : "views"}
                    </span>
                  )}
                  {downloadCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Download className="size-3" />
                      {downloadCount.toLocaleString()} {downloadCount === 1 ? "download" : "downloads"}
                    </span>
                  )}
                </>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-5 font-sans text-3xl leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-[2.75rem]"
            >
              {title}
            </motion.h1>

            {/* Authors */}
            {authors.length > 0 && (
              <motion.div
                custom={3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-4 flex items-start gap-2"
              >
                <Users className="mt-0.5 size-3.5 shrink-0 text-amber-600/70" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {authors.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/authors/${a.id}`}
                        className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-amber-600/40"
                      >
                        {a.name}
                      </Link>
                    </span>
                  ))}
                </p>
              </motion.div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <motion.div
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mt-4 flex flex-wrap gap-1.5"
              >
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/research?tag=${tag.slug}`}
                    className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-amber-600/30 hover:text-foreground"
                  >
                    {tag.name}
                  </Link>
                ))}
              </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 flex flex-wrap gap-2.5"
            >
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "lg" })}
                  onClick={() => trackDownload(researchItemId).catch(() => {})}
                >
                  <Download className="size-4" />
                  {fileOriginalName ? "Download PDF" : "Open PDF"}
                  {fileSizeBytes && (
                    <span className="ml-1 text-[10px] opacity-70">
                      ({(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  )}
                </a>
              )}
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  <ExternalLink className="size-3.5" />
                  External source
                </a>
              )}
              {doi && (
                <a
                  href={`https://doi.org/${doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  <LinkIcon className="size-3.5" />
                  DOI: {doi}
                </a>
              )}
            </motion.div>
          </div>

          {/* Right column — PDF thumbnail / cover image */}
          {fileUrl && coverImageUrl && (
            <motion.div
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="w-full shrink-0 sm:w-56 lg:w-52 xl:w-60"
            >
              <ResearchThumbnail
                fileUrl={fileUrl}
                coverImageUrl={coverImageUrl}
                title={title}
              />
            </motion.div>
          )}
        </div>

        {/* Divider */}
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 border-t border-border/60"
        />

        {/* Abstract */}
        <motion.div
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8"
        >
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="size-3.5" />
            Abstract
          </h2>
          <p className="text-[15px] leading-[1.8] text-foreground/85">
            {abstract}
          </p>
        </motion.div>

        {/* Additional metadata */}
        {(supervisorName || programName || license) && (
          <motion.div
            custom={8}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-8 rounded-xl border border-border/60 bg-card/50 p-5"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional details
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {supervisorName && (
                <div className="flex items-start gap-2">
                  <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Supervisor
                    </p>
                    <p className="text-sm text-foreground">{supervisorName}</p>
                  </div>
                </div>
              )}
              {programName && (
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Program
                    </p>
                    <p className="text-sm text-foreground">{programName}</p>
                  </div>
                </div>
              )}
              {license && (
                <div className="flex items-start gap-2">
                  <Scale className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      License
                    </p>
                    <p className="text-sm text-foreground">{license}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* References */}
        {references.length > 0 && (
          <motion.div
            custom={9}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-8"
          >
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="size-3.5" />
              References ({references.length})
            </h2>
            <ol className="space-y-2">
              {references.map((ref, index) => (
                <li
                  key={index}
                  className="flex items-baseline gap-2 text-sm leading-relaxed text-foreground/85"
                >
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    [{index + 1}]
                  </span>
                  <span>
                    {ref.citationText}
                    {ref.url && (
                      <>
                        {" "}
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-amber-600 underline decoration-amber-600/30 underline-offset-2 transition-colors hover:text-amber-700"
                        >
                          <LinkIcon className="size-2.5" />
                          Link
                        </a>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </div>
    </section>
  );
}
