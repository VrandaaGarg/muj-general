"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
}

interface Reference {
  citationText: string;
  url: string | null;
}

interface SubmissionSidebarNavProps {
  sections: Section[];
  references: Reference[];
}

export function SubmissionSidebarNav({
  sections,
  references,
}: SubmissionSidebarNavProps) {
  const hasReferences = references.length > 0;
  const [activeTab, setActiveTab] = useState<"sections" | "references">(
    "sections",
  );

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-8">
        {hasReferences ? (
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
        ) : (
          <p className="text-sm font-semibold text-foreground">Sections</p>
        )}

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
                  key={`${index}-${ref.citationText}`}
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
