import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import {
  countPublishedResearchItems,
  getPublicJournalBySlug,
  getPublishedResearchItemBySlug,
  listMoreFromSameAuthors,
  listPublicJournals,
  listPublishedFilterOptions,
  listPublishedResearchItems,
  listRelatedPublishedResearchItems,
} from "@/lib/db/queries";

type PublishedResearchFilters = Parameters<typeof listPublishedResearchItems>[0];
type RelatedResearchParams = Parameters<typeof listRelatedPublishedResearchItems>[0];
type SameAuthorParams = Parameters<typeof listMoreFromSameAuthors>[0];

export const PUBLIC_CACHE_TAGS = {
  research: "research",
  researchFilters: "research:filters",
  journals: "journals",
} as const;

export function revalidatePublicResearchCache(slug?: string) {
  revalidateTag(PUBLIC_CACHE_TAGS.research, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.researchFilters, "max");

  if (slug) {
    revalidateTag(`${PUBLIC_CACHE_TAGS.research}:${slug}`, "max");
  }
}

export function revalidatePublicJournalCache(slug?: string) {
  revalidateTag(PUBLIC_CACHE_TAGS.journals, "max");

  if (slug) {
    revalidateTag(`${PUBLIC_CACHE_TAGS.journals}:${slug}`, "max");
  }
}

function normalizeCsvValue(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort()
    .join(",");

  return normalized || undefined;
}

function normalizeResearchFilters(filters: PublishedResearchFilters) {
  return {
    query: filters.query?.trim() || undefined,
    department: normalizeCsvValue(filters.department),
    type: normalizeCsvValue(filters.type),
    year: normalizeCsvValue(filters.year),
    tag: normalizeCsvValue(filters.tag),
    page: filters.page && filters.page > 0 ? filters.page : 1,
    pageSize: filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 9,
  } satisfies PublishedResearchFilters;
}

function normalizeRelatedParams(params: RelatedResearchParams) {
  return {
    researchItemId: params.researchItemId,
    departmentSlug: params.departmentSlug?.trim() || undefined,
    itemType: params.itemType?.trim() || undefined,
  } satisfies RelatedResearchParams;
}

function normalizeSameAuthorParams(params: SameAuthorParams) {
  return {
    researchItemId: params.researchItemId,
    authorIds: [...params.authorIds].sort(),
  } satisfies SameAuthorParams;
}

export async function getCachedPublicJournals() {
  return unstable_cache(listPublicJournals, ["public-journals"], {
    tags: [PUBLIC_CACHE_TAGS.journals],
    revalidate: 300,
  })();
}

export async function getCachedPublicJournalBySlug(slug: string) {
  return unstable_cache(
    async () => getPublicJournalBySlug(slug),
    ["public-journal", slug],
    {
      tags: [PUBLIC_CACHE_TAGS.journals, `${PUBLIC_CACHE_TAGS.journals}:${slug}`],
      revalidate: 300,
    },
  )();
}

export async function getCachedPublishedResearchItems(filters: PublishedResearchFilters) {
  const normalizedFilters = normalizeResearchFilters(filters);

  return unstable_cache(
    async () => listPublishedResearchItems(normalizedFilters),
    ["published-research-items", JSON.stringify(normalizedFilters)],
    {
      tags: [PUBLIC_CACHE_TAGS.research],
      revalidate: 180,
    },
  )();
}

export async function getCachedPublishedResearchCount(filters: PublishedResearchFilters) {
  const normalizedFilters = normalizeResearchFilters(filters);

  return unstable_cache(
    async () => countPublishedResearchItems(normalizedFilters),
    ["published-research-count", JSON.stringify(normalizedFilters)],
    {
      tags: [PUBLIC_CACHE_TAGS.research],
      revalidate: 180,
    },
  )();
}

export async function getCachedPublishedResearchFilterOptions() {
  return unstable_cache(listPublishedFilterOptions, ["published-research-filters"], {
    tags: [PUBLIC_CACHE_TAGS.research, PUBLIC_CACHE_TAGS.researchFilters],
    revalidate: 300,
  })();
}

export async function getCachedPublishedResearchItemBySlug(slug: string) {
  return unstable_cache(
    async () => getPublishedResearchItemBySlug(slug),
    ["published-research-item", slug],
    {
      tags: [PUBLIC_CACHE_TAGS.research, `${PUBLIC_CACHE_TAGS.research}:${slug}`],
      revalidate: 180,
    },
  )();
}

export async function getCachedRelatedPublishedResearchItems(
  params: RelatedResearchParams,
) {
  const normalizedParams = normalizeRelatedParams(params);

  return unstable_cache(
    async () => listRelatedPublishedResearchItems(normalizedParams),
    ["related-published-research-items", JSON.stringify(normalizedParams)],
    {
      tags: [PUBLIC_CACHE_TAGS.research],
      revalidate: 180,
    },
  )();
}

export async function getCachedMoreFromSameAuthors(params: SameAuthorParams) {
  const normalizedParams = normalizeSameAuthorParams(params);

  return unstable_cache(
    async () => listMoreFromSameAuthors(normalizedParams),
    ["same-author-published-research-items", JSON.stringify(normalizedParams)],
    {
      tags: [PUBLIC_CACHE_TAGS.research],
      revalidate: 180,
    },
  )();
}
