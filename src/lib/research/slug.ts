export function slugifyResearchTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createResearchItemSlug(title: string) {
  const baseSlug = slugifyResearchTitle(title) || "research-item";
  return `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
}
