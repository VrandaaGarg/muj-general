"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

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

const MAX_VISIBLE = 8;

export function ResearchFilters({ options }: ResearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedDepartments = (searchParams.get("department") ?? "").split(",").filter(Boolean);
  const selectedTypes = (searchParams.get("type") ?? "").split(",").filter(Boolean);
  const selectedYears = (searchParams.get("year") ?? "").split(",").filter(Boolean);
  const selectedTags = (searchParams.get("tag") ?? "").split(",").filter(Boolean);

  const toggleParam = useCallback(
    (key: string, value: string, current: string[]) => {
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const params = new URLSearchParams(searchParams.toString());
      if (next.length > 0) {
        params.set(key, next.join(","));
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/research?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <div
      className={cn(
        "sticky top-4 space-y-6 transition-opacity",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      {/* Department filter */}
      {options.departments.length > 0 && (
        <FilterSection
          title="Department"
          items={options.departments.map((dept) => ({
            key: dept.slug,
            label: dept.name,
            checked: selectedDepartments.includes(dept.slug),
            onChange: () => toggleParam("department", dept.slug, selectedDepartments),
          }))}
        />
      )}

      {/* Type filter */}
      <FilterSection
        title="Type"
        items={Object.entries(RESEARCH_TYPE_LABELS).map(([value, label]) => ({
          key: value,
          label,
          checked: selectedTypes.includes(value),
          onChange: () => toggleParam("type", value, selectedTypes),
        }))}
      />

      {/* Year filter */}
      {options.years.length > 0 && (
        <FilterSection
          title="Year"
          items={options.years.map((year) => ({
            key: String(year),
            label: String(year),
            checked: selectedYears.includes(String(year)),
            onChange: () => toggleParam("year", String(year), selectedYears),
          }))}
        />
      )}

      {/* Tag filter */}
      {options.tags.length > 0 && (
        <FilterSection
          title="Tags"
          items={options.tags.map((tag) => ({
            key: tag.slug,
            label: tag.name,
            checked: selectedTags.includes(tag.slug),
            onChange: () => toggleParam("tag", tag.slug, selectedTags),
          }))}
        />
      )}
    </div>
  );
}

interface FilterItem {
  key: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}

function FilterSection({
  title,
  items,
}: {
  title: string;
  items: FilterItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > MAX_VISIBLE;
  const visibleItems = expanded ? items : items.slice(0, MAX_VISIBLE);

  return (
    <div>
      <h3 className="mb-2.5 border-b border-border/40 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-0.5">
        {visibleItems.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center gap-2.5     px-1 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={item.onChange}
              className="size-4 shrink-0 cursor-pointer border-border accent-primary"
            />
            <span
              className={cn(
                "truncate",
                item.checked
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </label>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1.5 px-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {expanded ? "Show less" : `Show all (${items.length})`}
        </button>
      )}
    </div>
  );
}
