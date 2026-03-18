import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicJournalBySlug } from "@/lib/db/queries";
import { getPublicFileUrl } from "@/lib/storage/r2";
import { SiteHeader } from "@/components/site-header";
import { JournalDetailClient } from "./journal-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const journal = await getPublicJournalBySlug(slug);
  if (!journal) return { title: "Journal not found - MUJ General" };
  return {
    title: `${journal.name} - Journals - MUJ General`,
    description: journal.description ?? `Browse ${journal.name} on MUJ General.`,
  };
}

export default async function JournalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const journal = await getPublicJournalBySlug(slug);

  if (!journal) notFound();

  const resolveUrls = <T extends { coverImageObjectKey: string | null }>(items: T[]) =>
    items.map((item) => ({
      ...item,
      coverImageUrl: item.coverImageObjectKey ? getPublicFileUrl(item.coverImageObjectKey) : null,
    }));

  const onlineFirstItems = resolveUrls(journal.onlineFirstItems);
  const issueGroups = journal.issues.map((issue) => ({
    ...issue,
    items: resolveUrls(issue.items),
  }));

  const clientData = {
    name: journal.name,
    slug: journal.slug,
    description: journal.description,
    issn: journal.issn,
    eissn: journal.eissn,
    aimAndScope: journal.aimAndScope,
    topics: journal.topics,
    contentTypes: journal.contentTypes,
    ethicsPolicy: journal.ethicsPolicy,
    disclosuresPolicy: journal.disclosuresPolicy,
    rightsPermissions: journal.rightsPermissions,
    contactInfo: journal.contactInfo,
    submissionChecklist: journal.submissionChecklist,
    submissionGuidelines: journal.submissionGuidelines,
    howToPublish: journal.howToPublish,
    feesAndFunding: journal.feesAndFunding,
    editorialBoard: journal.editorialBoard,
    onlineFirstItems,
    issues: issueGroups,
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <SiteHeader />

      <main className="relative z-10 mx-auto pb-20 pt-4 ">
        <JournalDetailClient journal={clientData} />
      </main>

      <footer className="relative z-10 border-t px-6 py-6 md:px-12 lg:px-20">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>MUJ General &mdash; Manipal University Jaipur</span>
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            Journal Repository
          </span>
        </div>
      </footer>
    </div>
  );
}
