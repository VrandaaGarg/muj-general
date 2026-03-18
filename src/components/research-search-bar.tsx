"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ResearchSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get("query") ?? "";

  const updateQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("query", value);
      } else {
        params.delete("query");
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
        "relative transition-opacity",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search by title, author, keyword..."
        defaultValue={currentQuery}
        className="h-12 pl-12 text-base bg-white"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateQuery((e.target as HTMLInputElement).value);
          }
        }}
        onBlur={(e) => {
          if (e.target.value !== currentQuery) {
            updateQuery(e.target.value);
          }
        }}
      />
    </div>
  );
}
