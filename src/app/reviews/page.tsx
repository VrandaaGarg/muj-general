import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, FileSearch } from "lucide-react";

import { requireAppSession } from "@/lib/auth/session";
import { listPeerReviewInvitesForUser } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { PeerReviewDashboard } from "@/components/peer-review-dashboard";

export default async function ReviewsPage() {
  const session = await requireAppSession("/reviews");
  const { appUser } = session;

  const invites = await listPeerReviewInvitesForUser({
    userId: appUser.id,
    userEmail: appUser.email,
  });

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      />

      <SiteHeader role={appUser.role} />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24 md:px-12 md:pt-12 lg:px-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Peer Reviews</span>
        </nav>

        <div className="mb-10">
          {/* <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <FileSearch className="size-4 text-primary" />
            </div>
          </div> */}
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
            Peer Reviews
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Manage your peer review invitations and submit feedback on
            submissions.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
          }
        >
          <PeerReviewDashboard invites={invites} />
        </Suspense>
      </main>
    </div>
  );
}
