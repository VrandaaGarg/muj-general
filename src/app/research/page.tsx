import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { ResearchSearchBar } from "@/components/research-search-bar";
import { ResearchFilters } from "@/components/research-filters";
import { ResearchResults } from "@/components/research-results";
import { ResearchPagination } from "@/components/research-pagination";
import {
  listPublishedResearchItems,
  countPublishedResearchItems,
  listPublishedFilterOptions,
} from "@/lib/db/queries";
import { getPublicFileUrl } from "@/lib/storage/r2";

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
      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-20 md:px-12 md:pt-12 lg:px-20">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground hover:underline">Home</Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">Research</span>
        </nav>

        {/* Hero area */}
        <div className="mb-6 max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Explore MUJ Research
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Discover papers, theses, and academic work published across every
            department at Manipal University Jaipur.
          </p>
        </div>

        {/* Full-width search bar */}
        <Suspense>
          <ResearchSearchBar />
        </Suspense>

        {/* Two-column layout: Filters (left) + Results (right) */}
        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          {/* Left: Filters sidebar */}
          <aside className="w-full shrink-0 lg:w-64 xl:w-72">
            <Suspense
              fallback={
                <div className="h-96 animate-pulse    border border-border/60 bg-muted/30" />
              }
            >
              <ResearchFilters options={filterOptions} />
            </Suspense>
          </aside>

          {/* Right: Results + Pagination */}
          <div className="min-w-0 flex-1">
            <ResearchResults
              items={items.map((item) => ({
                ...item,
                coverImageUrl: item.coverImageObjectKey
                  ? getPublicFileUrl(item.coverImageObjectKey)
                  : null,
              }))}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={PAGE_SIZE}
            />

            <Suspense>
              <ResearchPagination
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </Suspense>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t px-6 py-6 md:px-12 lg:px-20">
        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <span>MUJ General — Manipal University Jaipur</span>
          <span className="text-xs tracking-wider uppercase opacity-60">
            Research Repository
          </span>
        </div>
      </footer>
    </div>
  );
}
