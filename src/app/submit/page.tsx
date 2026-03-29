import Link from "next/link";
import { ChevronRight, LogIn, Send } from "lucide-react";

import { getAppSession } from "@/lib/auth/session";
import {
  listDepartments,
  listJournalIssueOptions,
  listJournalOptions,
  listTags,
} from "@/lib/db/queries";
import { RESEARCH_TYPE_OPTIONS } from "@/lib/research-types";
import { SiteHeader } from "@/components/site-header";
import { JournalSubmissionStepForm } from "@/components/journal-submission-step-form";

export default async function SubmitPage() {
  const session = await getAppSession();

  const [departments, tags, journals, journalIssues] = await Promise.all([
    listDepartments(),
    listTags(),
    listJournalOptions(),
    listJournalIssueOptions(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader role={session?.appUser.role} />

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8 md:px-12 md:pt-12 lg:px-20">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Submit</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Publish with us
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Submit any research item under your department. Readers, editors,
            and admins can all submit.
          </p>
        </div>

        {!session ? (
          <div className="mx-auto max-w-xl rounded-xl border border-border/60 bg-card p-6 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <LogIn className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Sign in to submit
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You need an account to submit a manuscript. After sign in, you will
              return here automatically.
            </p>
            <Link
              href={`/sign-in?redirectTo=${encodeURIComponent("/submit")}`}
              className="mt-4 inline-flex"
            >
              <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                <Send className="size-3.5" />
                Sign in to continue
              </span>
            </Link>
          </div>
        ) : !session.user.emailVerified ? (
          <div className="mx-auto max-w-xl rounded-xl border border-border/60 bg-card p-6 text-center">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Verify your email first
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Email verification is required before you can submit research.
            </p>
            <Link
              href={`/verify-email?redirectTo=${encodeURIComponent("/submit")}`}
              className="mt-4 inline-flex rounded-md border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Go to verification
            </Link>
          </div>
        ) : (
          <JournalSubmissionStepForm
            departments={departments}
            tags={tags}
            journals={journals.map((journal) => ({
              id: journal.id,
              name: journal.name,
              slug: journal.slug,
            }))}
            journalIssues={journalIssues}
            itemTypeOptions={RESEARCH_TYPE_OPTIONS}
            basePath="/submit"
          />
        )}
      </main>
    </div>
  );
}
