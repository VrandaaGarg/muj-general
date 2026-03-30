"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface ResearchPaginationProps {
  currentPage: number;
  totalPages: number;
}

function buildHref(searchParams: URLSearchParams, page: number): string {
  const params = new URLSearchParams(searchParams.toString());
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/research?${qs}` : "/research";
}

export function ResearchPagination({
  currentPage,
  totalPages,
}: ResearchPaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  // Build visible page numbers with ellipsis
  const pages: (number | "ellipsis")[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  const linkClasses =
    "flex size-8 items-center justify-center   text-xs font-medium transition-colors";

  return (
    <motion.nav
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1"
    >
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={buildHref(searchParams, currentPage - 1)}
          className={cn(linkClasses, "text-muted-foreground hover:bg-muted")}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </Link>
      ) : (
        <span
          className={cn(linkClasses, "cursor-not-allowed text-muted-foreground/30")}
          aria-disabled="true"
        >
          <ChevronLeft className="size-3.5" />
        </span>
      )}

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex size-8 items-center justify-center text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(searchParams, page)}
            className={cn(
              linkClasses,
              page === currentPage
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Link>
        ),
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={buildHref(searchParams, currentPage + 1)}
          className={cn(linkClasses, "text-muted-foreground hover:bg-muted")}
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </Link>
      ) : (
        <span
          className={cn(linkClasses, "cursor-not-allowed text-muted-foreground/30")}
          aria-disabled="true"
        >
          <ChevronRight className="size-3.5" />
        </span>
      )}
    </motion.nav>
  );
}
