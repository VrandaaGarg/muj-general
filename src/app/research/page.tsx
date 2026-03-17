import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import { ResearchFilters } from "@/components/research-filters";
import { ResearchResults } from "@/components/research-results";
import { ResearchPagination } from "@/components/research-pagination";
import {
  listPublishedResearchItems,
  countPublishedResearchItems,
  listPublishedFilterOptions,
} from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Research Repository — MUJ General",
  description:
    "Browse and discover published research across all departments at Manipal University Jaipur.",
};

const PAGE_SIZE = 9;

interface ResearchPageProps {
  searchParams: Promise<{
    query?: string;
    department?: string;
    type?: string;
    year?: string;
    tag?: string;
    page?: string;
  }>;
}

export default async function ResearchPage({ searchParams }: ResearchPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);

  const filters = {
    query: params.query,
    department: params.department,
    type: params.type,
    year: params.year,
    tag: params.tag,
    page: currentPage,
    pageSize: PAGE_SIZE,
  };

  const [items, totalCount, filterOptions] = await Promise.all([
    listPublishedResearchItems(filters),
    countPublishedResearchItems(filters),
    listPublishedFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="relative min-h-screen bg-background">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <SiteHeader accentColor="amber" />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-20 md:px-12 md:pt-12">
        {/* Hero area */}
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
            Research Repository
          </p>
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
            Explore MUJ research
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Discover papers, theses, and academic work published across every
            department at Manipal University Jaipur.
          </p>
        </div>

        {/* Filters */}
        <Suspense
          fallback={
            <div className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
          }
        >
          <ResearchFilters options={filterOptions} />
        </Suspense>

        {/* Results */}
        <div className="mt-8">
          <ResearchResults items={items} totalCount={totalCount} />
        </div>

        {/* Pagination */}
        <Suspense>
          <ResearchPagination
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t px-6 py-6 md:px-12 lg:px-20">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>MUJ General — Manipal University Jaipur</span>
          <span className="font-mono text-[10px] tracking-wider uppercase opacity-60">
            Research Repository
          </span>
        </div>
      </footer>
    </div>
  );
}
