import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { listPendingResearchModerationItems } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminResearchModerationFull } from "@/components/admin-research-moderation-full";

export default async function ResearchSubmissionsPage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/research-submissions",
  });
  const { appUser } = session;

  const items = await listPendingResearchModerationItems();

  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader role={appUser.role} />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24 md:px-12 md:pt-12 lg:px-20">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            href="/admin"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80"
          >
            Admin
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">
            Research Submissions
          </span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Research Submissions
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Review and moderate all pending research submissions.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
          }
        >
          <AdminResearchModerationFull items={items} />
        </Suspense>
      </main>
    </div>
  );
}
