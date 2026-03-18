/** Human-readable labels for research item types */
export const RESEARCH_TYPE_LABELS: Record<string, string> = {
  research_paper: "Research Paper",
  journal_article: "Journal Article",
  conference_paper: "Conference Paper",
  thesis: "Thesis",
  dissertation: "Dissertation",
  capstone_project: "Capstone Project",
  technical_report: "Technical Report",
  patent: "Patent",
  poster: "Poster",
  dataset: "Dataset",
  presentation: "Presentation",
};

export const RESEARCH_TYPE_OPTIONS = [
  { value: "research_paper", label: "Research Paper" },
  { value: "journal_article", label: "Journal Article" },
  { value: "conference_paper", label: "Conference Paper" },
  { value: "thesis", label: "Thesis" },
  { value: "dissertation", label: "Dissertation" },
  { value: "capstone_project", label: "Capstone Project" },
  { value: "technical_report", label: "Technical Report" },
  { value: "patent", label: "Patent" },
  { value: "poster", label: "Poster" },
  { value: "dataset", label: "Dataset" },
  { value: "presentation", label: "Presentation" },
] as const;

/** Short color accent classes per item type for badges */
export const RESEARCH_TYPE_COLORS: Record<string, string> = {
  research_paper: "bg-blue-600/10 text-blue-700",
  journal_article: "bg-emerald-600/10 text-emerald-700",
  conference_paper: "bg-violet-600/10 text-violet-700",
  thesis: "bg-amber-600/10 text-amber-700",
  dissertation: "bg-rose-600/10 text-rose-700",
  capstone_project: "bg-cyan-600/10 text-cyan-700",
  technical_report: "bg-slate-500/10 text-slate-700",
  patent: "bg-orange-600/10 text-orange-700",
  poster: "bg-pink-600/10 text-pink-700",
  dataset: "bg-teal-600/10 text-teal-700",
  presentation: "bg-indigo-600/10 text-indigo-700",
};

export function getTypeLabel(type: string): string {
  return RESEARCH_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function getTypeColor(type: string): string {
  return RESEARCH_TYPE_COLORS[type] ?? "bg-muted text-muted-foreground";
}
