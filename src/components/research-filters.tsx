"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { motion } from "framer-motion";
import { Filter, RotateCcw, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RESEARCH_TYPE_LABELS } from "@/lib/research-types";

interface FilterOptions {
  departments: { name: string; slug: string }[];
  years: number[];
  tags: { name: string; slug: string }[];
}

interface ResearchFiltersProps {
  options: FilterOptions;
}

export function ResearchFilters({ options }: ResearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get("query") ?? "";
  const currentDepartment = searchParams.get("department") ?? "";
  const currentType = searchParams.get("type") ?? "";
  const currentYear = searchParams.get("year") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  const hasFilters =
    currentQuery || currentDepartment || currentType || currentYear || currentTag;

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      startTransition(() => {
        router.push(`/research?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push("/research");
    });
  }, [router]);

  const selectClasses =
    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={cn(
        "rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur-sm transition-opacity md:p-5",
        isPending && "pointer-events-none opacity-70",
      )}
    >
      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search titles and abstracts…"
          defaultValue={currentQuery}
          className="h-9 pl-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams("query", (e.target as HTMLInputElement).value);
            }
          }}
          onBlur={(e) => {
            if (e.target.value !== currentQuery) {
              updateParams("query", e.target.value);
            }
          }}
        />
      </div>

      {/* Filter row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Filter className="size-3" />
          <span className="text-[11px] font-medium uppercase tracking-wider">
            Filters
          </span>
        </div>

        <select
          value={currentDepartment}
          onChange={(e) => updateParams("department", e.target.value)}
          className={cn(selectClasses, "max-w-[180px]")}
          aria-label="Department"
        >
          <option value="">All departments</option>
          {options.departments.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={currentType}
          onChange={(e) => updateParams("type", e.target.value)}
          className={cn(selectClasses, "max-w-[180px]")}
          aria-label="Item type"
        >
          <option value="">All types</option>
          {Object.entries(RESEARCH_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={currentYear}
          onChange={(e) => updateParams("year", e.target.value)}
          className={cn(selectClasses, "max-w-[120px]")}
          aria-label="Year"
        >
          <option value="">All years</option>
          {options.years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={currentTag}
          onChange={(e) => updateParams("tag", e.target.value)}
          className={cn(selectClasses, "max-w-[180px]")}
          aria-label="Tag"
        >
          <option value="">All tags</option>
          {options.tags.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="xs"
            onClick={clearAll}
            className="ml-auto gap-1 text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Clear
          </Button>
        )}
      </div>
    </motion.div>
  );
}
