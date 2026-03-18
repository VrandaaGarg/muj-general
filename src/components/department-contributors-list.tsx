"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, Search, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { DepartmentContributor } from "@/components/department-profile";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

interface DepartmentContributorsListProps {
  department: {
    name: string;
    slug: string;
    contributors: DepartmentContributor[];
  };
}

export function DepartmentContributorsList({
  department,
}: DepartmentContributorsListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return department.contributors;
    const q = query.trim().toLowerCase();
    return department.contributors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.affiliation?.toLowerCase().includes(q),
    );
  }, [department.contributors, query]);

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
          <Link
            href={`/departments/${department.slug}`}
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            {department.name}
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Contributors</span>
        </motion.nav>

        {/* Heading */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8"
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
            {department.name}
          </p>
          <h1 className="font-sans text-2xl leading-tight tracking-tight text-foreground sm:text-3xl">
            Contributors
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {department.contributors.length}{" "}
            {department.contributors.length === 1
              ? "contributor"
              : "contributors"}{" "}
            with published research in this department.
          </p>
        </motion.div>

        {/* Search */}
        {department.contributors.length > 6 && (
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="relative mt-6"
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or affiliation…"
              className="pl-9"
            />
          </motion.div>
        )}

        {/* Divider */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 border-t border-border/60"
        />

        {/* Grid */}
        <div className="mt-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
              <p className="font-sans text-lg text-foreground">
                No contributors found
              </p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Try adjusting your search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((contributor, index) => (
                <motion.div
                  key={contributor.id}
                  custom={index + 4}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={`/authors/${contributor.id}`}
                    className="group flex flex-col items-center rounded-xl border border-border/60 bg-card/50 px-4 py-5 text-center transition-all hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm"
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
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
