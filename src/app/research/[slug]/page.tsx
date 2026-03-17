import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { ResearchDetailHero } from "@/components/research-detail-hero";
import { ResearchRelated } from "@/components/research-related";
import {
  getPublishedResearchItemBySlug,
  listRelatedPublishedResearchItems,
} from "@/lib/db/queries";
import { getPublicFileUrl } from "@/lib/storage/r2";

interface ResearchDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ResearchDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedResearchItemBySlug(slug);

  if (!item) {
    return { title: "Not Found — MUJ General" };
  }

  const description =
    item.abstract.length > 200
      ? item.abstract.slice(0, 200).trimEnd() + "…"
      : item.abstract;

  return {
    title: `${item.title} — MUJ General`,
    description,
  };
}

export default async function ResearchDetailPage({
  params,
}: ResearchDetailPageProps) {
  const { slug } = await params;
  const item = await getPublishedResearchItemBySlug(slug);

  if (!item) {
    notFound();
  }

  const relatedItems = await listRelatedPublishedResearchItems({
    researchItemId: item.id,
    departmentSlug: item.departmentSlug,
    itemType: item.itemType,
  });

  const fileUrl = item.fileObjectKey
    ? getPublicFileUrl(item.fileObjectKey)
    : null;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <SiteHeader accentColor="amber" />

      <main className="relative z-10 pt-4 md:pt-8">
        <ResearchDetailHero
          title={item.title}
          abstract={item.abstract}
          itemType={item.itemType}
          publicationYear={item.publicationYear}
          publishedAt={item.publishedAt}
          departmentName={item.departmentName}
          departmentSlug={item.departmentSlug}
          authors={item.authors}
          tags={item.tags}
          doi={item.doi}
          license={item.license}
          externalUrl={item.externalUrl}
          supervisorName={item.supervisorName}
          programName={item.programName}
          fileUrl={fileUrl}
          fileOriginalName={item.fileOriginalName}
          fileSizeBytes={item.fileSizeBytes}
        />

        <ResearchRelated items={relatedItems} />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t px-6 py-6 md:px-12 lg:px-20">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>MUJ General — Manipal University Jaipur</span>
          <span className="font-mono text-[10px] tracking-wider uppercase opacity-60">
            Research Repository
          </span>
        </div>
      </footer>
    </div>
  );
}
