import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { requireAppSession } from "@/lib/auth/session";
import {
  listDepartments,
  listJournalIssueOptions,
  listJournalOptions,
  listTags,
} from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { JournalSubmissionStepForm } from "@/components/journal-submission-step-form";

export default async function JournalSubmissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await requireAppSession(`/journals/${slug}/new/submission`);

  if (!session.user.emailVerified) {
    redirect(`/verify-email?redirectTo=${encodeURIComponent(`/journals/${slug}/new/submission`)}`);
  }

  const [departments, tags, journals] = await Promise.all([
    listDepartments(),
    listTags(),
    listJournalOptions(),
  ]);

  const selectedJournal = journals.find((journal) => journal.slug === slug);
  if (!selectedJournal) {
    redirect("/journals");
  }

  const journalIssues = await listJournalIssueOptions(selectedJournal.id);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader role={session.appUser.role} />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-8 md:px-12 md:pt-12 lg:px-20">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80">
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link href="/journals" className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80">
            Journals
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link href={`/journals/${selectedJournal.slug}`} className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80">
            {selectedJournal.name}
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">New Submission</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Submit to {selectedJournal.name}</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Start a new submission for this journal. You can save a draft and continue later.
          </p>
        </div>

        <JournalSubmissionStepForm
          departments={departments}
          tags={tags}
          journal={{
            id: selectedJournal.id,
            name: selectedJournal.name,
            slug: selectedJournal.slug,
          }}
          journalIssues={journalIssues}
          basePath={`/journals/${selectedJournal.slug}/new/submission`}
        />
      </main>
    </div>
  );
}
