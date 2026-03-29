import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, Library, ScrollText } from "lucide-react";

import { listPublicJournals } from "@/lib/db/queries";
import { getPublicFileUrl } from "@/lib/storage/r2";
import { SiteHeader } from "@/components/site-header";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function JournalsPage() {
  const journals = (await listPublicJournals()).map((journal) => ({
    ...journal,
    coverImageUrl: journal.coverImageKey ? getPublicFileUrl(journal.coverImageKey) : null,
  }));

  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-8 md:px-12 lg:px-20">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Journals</span>
        </nav>

        <div className="mb-10">
          {/* <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Library className="size-4 text-primary" />
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Journal Collection
            </span>
          </div> */}
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">Journals</h1>
          <p className="mt-2 max-w-3xl text-base text-muted-foreground">
            Browse journals, online-first publications, and issue-based article collections published through MUJ General.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {journals.map((journal) => (
            <Link key={journal.id} href={`/journals/${journal.slug}`} className="group">
                <Card className="h-full border-border/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
                  <CardHeader>
                  <div className="relative h-40 w-full overflow-hidden rounded-lg border border-border/40 bg-muted/40">
                    {journal.coverImageUrl ? (
                      <Image
                        src={journal.coverImageUrl}
                        alt={`${journal.name} cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10">
                        <ScrollText className="size-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="font-sans text-xl tracking-tight">{journal.name}</CardTitle>
                  <CardDescription className="font-mono text-[11px]">/{journal.slug}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {journal.description && (
                    <div className="max-h-28 overflow-hidden">
                      <MarkdownContent
                        content={journal.description}
                        className="prose-sm text-sm text-muted-foreground"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {journal.issn && <span className="rounded-full bg-muted px-2 py-0.5">ISSN {journal.issn}</span>}
                    {journal.eissn && <span className="rounded-full bg-muted px-2 py-0.5">E-ISSN {journal.eissn}</span>}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{journal.itemCount} items</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Open journal
                    <ArrowRight className="size-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
