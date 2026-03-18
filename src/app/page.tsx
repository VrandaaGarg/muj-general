import { listPublicJournals, listPublishedResearchItems, listDepartments } from "@/lib/db/queries";
import { getPublicFileUrl } from "@/lib/storage/r2";
import { HomeLanding } from "@/components/home-landing";

export default async function Home() {
  const [journals, recentItems, departments] = await Promise.all([
    listPublicJournals(),
    listPublishedResearchItems({ page: 1, pageSize: 6 }),
    listDepartments(),
  ]);

  const recentResearch = recentItems.map((item) => ({
    ...item,
    coverImageUrl: item.coverImageObjectKey
      ? getPublicFileUrl(item.coverImageObjectKey)
      : null,
  }));

  return (
    <HomeLanding
      journals={journals}
      recentResearch={recentResearch}
      departments={departments}
    />
  );
}
