type LegacyStructuredSection = {
  heading?: unknown;
  content?: unknown;
};

function toSectionText(section: LegacyStructuredSection) {
  const heading =
    typeof section.heading === "string" ? section.heading.trim() : "";
  const content =
    typeof section.content === "string" ? section.content.trim() : "";

  if (!heading && !content) {
    return null;
  }

  if (heading && content) {
    return `### ${heading}\n${content}`;
  }

  return heading ? `### ${heading}` : content;
}

export function normalizeJournalRichText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const lines = value
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) {
          return null;
        }
        return toSectionText(entry as LegacyStructuredSection);
      })
      .filter((entry): entry is string => Boolean(entry));

    if (lines.length === 0) {
      return null;
    }

    return lines.join("\n\n");
  }

  if (typeof value === "object" && value !== null) {
    const single = toSectionText(value as LegacyStructuredSection);
    return single ?? null;
  }

  return null;
}
