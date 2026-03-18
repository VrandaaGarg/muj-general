"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  LinkIcon,
} from "lucide-react";

import { trackDownload } from "@/lib/actions/research";
import { ResearchThumbnail } from "@/components/pdf-thumbnail-viewer";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { getTypeLabel } from "@/lib/research-types";
import { ResearchRelated } from "@/components/research-related";

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
  children?: React.ReactNode;
}

export function ResearchDetailHero({
  title,
  abstract,
  itemType,
  publicationYear,
  publishedAt,
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
  children,
}: ResearchDetailHeroProps) {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 -top-20 bg-linear-to-b from-primary/3 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 pt-4 pb-12 md:px-12 lg:px-20">
        {/* Breadcrumb */}
        <motion.nav
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            href="/research"
            className="font-medium transition-colors hover:text-foreground"
          >
            Research
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground max-sm:line-clamp-1">
            {title}
          </span>
        </motion.nav>

        {/* Two-column layout: metadata left, thumbnail right on lg+ */}
        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {/* Left column — metadata + actions */}
          <div className="min-w-0 flex-1">
            {/* Type + department */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center gap-2.5"
            >
              <span className="text-sm font-semibold text-primary">
                {getTypeLabel(itemType)}
              </span>
              {departmentName && departmentSlug && (
                <Link
                  href={`/departments/${departmentSlug}`}
                  className="rounded-md bg-muted/60 px-2 py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {departmentName}
                </Link>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-5 text-2xl font-bold leading-[1.2] tracking-tight text-foreground sm:text-3xl"
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
                className="mt-4"
              >
                <p className="text-base leading-relaxed text-muted-foreground">
                  {authors.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/authors/${a.id}`}
                        className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground hover:decoration-primary/40"
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
                className="mt-4 flex flex-wrap gap-2"
              >
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/research?tag=${tag.slug}`}
                    className="rounded-full border border-primary/30 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
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
                    <span className="ml-1 text-xs opacity-70">
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

            {/* Published date + views */}
            <motion.div
              custom={6}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
            >
              {publishedAt && (
                <span>
                  Published{" "}
                  {new Date(publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              {publishedAt && viewCount > 0 && (
                <span className="text-border">·</span>
              )}
              {viewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="size-3.5" />
                  {viewCount.toLocaleString()} {viewCount === 1 ? "view" : "views"}
                </span>
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
        <div className="mt-8 border-t border-border/60" />

        {/* Two-column: content left, sticky tabbed nav right */}
        <div className="mt-8 flex flex-col gap-10 lg:flex-row">
          {/* Left: main content */}
          <div className="min-w-0 flex-1">
            {/* Abstract */}
            <section id="abstract">
              <h2 className="mb-3 text-lg font-bold text-primary">
                Abstract
              </h2>
              <p className="text-base leading-[1.85] text-foreground/85">
                {abstract}
              </p>
            </section>

            {/* Additional metadata */}
            {(supervisorName || programName || license) && (
              <section id="additional-details" className="mt-10">
                <h2 className="mb-3 text-lg font-bold text-primary">
                  Additional Details
                </h2>
                <div className="grid gap-3 rounded-xl border border-border/60 bg-card/50 p-5 sm:grid-cols-2 md:grid-cols-3">
                  {supervisorName && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Supervisor
                      </p>
                      <p className="text-base text-foreground">{supervisorName}</p>
                    </div>
                  )}
                  {programName && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Program
                      </p>
                      <p className="text-base text-foreground">{programName}</p>
                    </div>
                  )}
                  {license && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        License
                      </p>
                      <p className="text-base text-foreground">{license}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* References (inline in left col) */}
            {references.length > 0 && (
              <section id="references" className="mt-10">
                <h2 className="mb-3 text-lg font-bold text-primary">
                  References ({references.length})
                </h2>
                <ol className="space-y-2.5">
                  {references.map((ref, index) => (
                    <li
                      key={index}
                      className="flex items-baseline gap-2.5 text-base leading-relaxed text-foreground/85"
                    >
                      <span className="shrink-0 text-sm font-medium text-muted-foreground">
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
                              className="text-sm text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary/80"
                            >
                              Link
                            </a>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* About this paper */}
            <section id="about-this-paper" className="mt-10">
              <h2 className="mb-1 text-xl font-bold text-primary">
                About this paper
              </h2>
              <div className="mb-6 border-b border-primary/20" />
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {doi && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      DOI
                    </p>
                    <a
                      href={`https://doi.org/${doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-sm text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary/80"
                    >
                      https://doi.org/{doi}
                    </a>
                  </div>
                )}
                {publishedAt && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Published
                    </p>
                    <p className="mt-1 text-base text-foreground">
                      {new Date(publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {departmentName && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Department
                    </p>
                    <p className="mt-1 text-base text-foreground">{departmentName}</p>
                  </div>
                )}
                {license && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      License
                    </p>
                    <p className="mt-1 text-base text-foreground">{license}</p>
                  </div>
                )}
                {supervisorName && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Supervisor
                    </p>
                    <p className="mt-1 text-base text-foreground">{supervisorName}</p>
                  </div>
                )}
                {programName && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Program
                    </p>
                    <p className="mt-1 text-base text-foreground">{programName}</p>
                  </div>
                )}
              </div>
              {tags.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-3 text-lg font-bold text-primary">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/research?tag=${tag.slug}`}
                        className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Publish with us */}
            <section id="publish-with-us" className="mt-10">
              <h2 className="mb-1 text-xl font-bold text-primary">
                Publish with us
              </h2>
              <div className="mb-4 border-b border-primary/20" />
              <p className="mb-4 text-base text-muted-foreground">
                Submit your research to MUJ General. Join our community of
                researchers and share your work with the academic world.
              </p>
              <Link
                href="/editor"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get started
              </Link>
            </section>

            {/* Related sections passed as children */}
            {children}
          </div>

          {/* Right: sticky tabbed sidebar */}
          <SidebarNav
            hasAdditionalDetails={Boolean(supervisorName || programName || license)}
            hasReferences={references.length > 0}
            references={references}
          />
        </div>
      </div>
    </section>
  );
}

function SidebarNav({
  hasAdditionalDetails,
  hasReferences,
  references,
}: {
  hasAdditionalDetails: boolean;
  hasReferences: boolean;
  references: Array<{ citationText: string; url: string | null }>;
}) {
  const [activeTab, setActiveTab] = useState<"sections" | "references">("sections");

  const sections = [
    { id: "abstract", label: "Abstract" },
    ...(hasAdditionalDetails
      ? [{ id: "additional-details", label: "Additional details" }]
      : []),
    ...(hasReferences ? [{ id: "references", label: "References" }] : []),
    { id: "about-this-paper", label: "About this paper" },
    { id: "publish-with-us", label: "Publish with us" },
  ];

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-8">
        {/* Tab switcher */}
        <div className="flex rounded-lg border border-border/60 text-sm font-medium">
          <button
            onClick={() => setActiveTab("sections")}
            className={cn(
              "flex-1 rounded-l-lg px-4 py-2.5 transition-colors",
              activeTab === "sections"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Sections
          </button>
          <button
            onClick={() => setActiveTab("references")}
            className={cn(
              "flex-1 rounded-r-lg border-l border-border/60 px-4 py-2.5 transition-colors",
              activeTab === "references"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            References
          </button>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === "sections" ? (
            <nav className="space-y-0.5 border-l border-border/60">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block border-l-2 border-transparent py-2 pl-4 text-sm text-primary underline-offset-2 transition-colors hover:border-primary hover:underline"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          ) : (
            <div className="space-y-0">
              {references.map((ref, index) => (
                <div
                  key={index}
                  className="border-b border-border/40 py-4 first:pt-0 last:border-b-0"
                >
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {index + 1}. {ref.citationText}
                  </p>
                  {ref.url && (
                    <div className="mt-2 flex justify-end">
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary underline-offset-2 transition-colors hover:underline"
                      >
                        Link
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
