import { Suspense } from "react";
import Link from "next/link";
import { Clock3, ChevronRight, Eye } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import {
  listDepartmentResearchItemsForReview,
  listPeerReviewInvitesForResearchItems,
} from "@/lib/db/queries";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { EditorDepartmentReviewList } from "@/components/editor-department-review-list";

export default async function EditorPage() {
  const session = await requireRole(["editor", "admin"], {
    returnTo: "/editor",
  });
  const { appUser } = session;

  const departmentReviewItems = await listDepartmentResearchItemsForReview(appUser.id);

  const peerInvitesMap = await listPeerReviewInvitesForResearchItems(
    departmentReviewItems.map((item) => item.id),
  );

  const pendingReviewCount = departmentReviewItems.filter(
    (item) =>
      item.workflowStage === "submitted" ||
      item.workflowStage === "editor_review" ||
      item.workflowStage === "editor_revision_requested",
  ).length;
  const peerReviewCount = departmentReviewItems.filter(
    (item) => item.workflowStage === "peer_review",
  ).length;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle dot pattern */}
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
          <Link href="/" className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80">
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Editor</span>
        </nav>

        {/* Title section */}
        <div className="mb-10">
          {/* <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <PenTool className="size-4 text-primary" />
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Editor Panel
            </span>
          </div> */}
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
            Editor workspace
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Review only submissions routed to your department or journals where
            you are on the editorial board, then forward finalized decisions to
            admin.
          </p>
        </div>

        {/* Stats cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Eye className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Department Queue
              </CardTitle>
              <CardDescription>
                Submissions awaiting your department review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {departmentReviewItems.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Clock3 className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Pending Review
              </CardTitle>
              <CardDescription>
                Items waiting for your editor decision
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {pendingReviewCount}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Clock3 className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Peer Review Stage
              </CardTitle>
              <CardDescription>
                Items currently in external peer review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {peerReviewCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Department review queue */}
        <div className="mb-10">
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
            }
          >
            <EditorDepartmentReviewList items={departmentReviewItems} peerInvitesMap={peerInvitesMap} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
