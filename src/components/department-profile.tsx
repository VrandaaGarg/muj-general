"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Building2, ChevronRight, User } from "lucide-react";

import { ResearchCard } from "@/components/research-card";

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

interface DepartmentItem {
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

export interface DepartmentContributor {
  id: string;
  name: string;
  email: string | null;
  affiliation: string | null;
  contributionCount: number;
}

interface DepartmentProfileProps {
  department: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    contributors: DepartmentContributor[];
    items: DepartmentItem[];
  };
}

const PREVIEW_CONTRIBUTORS_COUNT = 6;

export function DepartmentProfile({ department }: DepartmentProfileProps) {
  const previewContributors = department.contributors.slice(
    0,
    PREVIEW_CONTRIBUTORS_COUNT,
  );
  const hasMore =
    department.contributors.length > PREVIEW_CONTRIBUTORS_COUNT;

  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 -top-20 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 pt-4 pb-12 md:px-12">
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
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">
            {department.name}
          </span>
        </motion.nav>

        {/* Department header */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 flex items-start gap-5"
        >
          {/* <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.08] sm:size-20">
            <Building2 className="size-7 text-primary sm:size-9" />
          </div> */}

          <div className="min-w-0 pt-1">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Department
            </p>
            <h1 className="font-sans text-2xl leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {department.name}
            </h1>
          </div>
        </motion.div>

        {/* Description */}
        {department.description && (
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-6 max-w-2xl"
          >
            <p className="text-[15px] leading-[1.8] text-foreground/85">
              {department.description}
            </p>
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

        {/* Published research (first) */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8"
        >
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-primary">
              Published Research
            </h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {department.items.length}
            </span>
          </div>

          {department.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
              <p className="font-sans text-lg text-foreground">
                No publications yet
              </p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                This department doesn&apos;t have any published items in the
                repository.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {department.items.map((item, index) => (
                <ResearchCard key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Contributors (after published research) */}
        {department.contributors.length > 0 && (
          <>
            <motion.div
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-10 border-t border-border/60"
            />

            <motion.div
              custom={6}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-8"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold tracking-tight text-primary">
                    Contributors
                  </h2>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                    {department.contributors.length}
                  </span>
                </div>

                {hasMore && (
                  <Link
                    href={`/departments/${department.slug}/contributors`}
                    className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    View all
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {previewContributors.map((contributor) => (
                  <ContributorCard
                    key={contributor.id}
                    contributor={contributor}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}

function ContributorCard({
  contributor,
}: {
  contributor: DepartmentContributor;
}) {
  return (
    <Link
      href={`/authors/${contributor.id}`}
      className="group flex flex-col items-center rounded-xl border border-border/60 bg-white px-4 py-5 text-center transition-all hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm"
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-border/80 bg-muted/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.08]">
        <User className="size-4.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
      </div>

      <p className="mt-3 text-sm font-medium leading-snug text-foreground">
        {contributor.name}
      </p>

      {contributor.affiliation && (
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {contributor.affiliation}
        </p>
      )}

      {!contributor.affiliation && contributor.email && (
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {contributor.email}
        </p>
      )}
    </Link>
  );
}
