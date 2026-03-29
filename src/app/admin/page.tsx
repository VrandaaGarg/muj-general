import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Clock,
  Library,
  Shield,
  Tag,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import {
  listPendingEditorAccessRequests,
  countPendingEditorAccessRequests,
  listPendingResearchModerationItems,
  countPendingResearchModerationItems,
  listPeerReviewInvitesForResearchItems,
} from "@/lib/db/queries";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AdminPendingRequests } from "@/components/admin-pending-requests";
import { AdminResearchModeration } from "@/components/admin-research-moderation";
import { SiteHeader } from "@/components/site-header";

export default async function AdminPage() {
  const session = await requireRole(["admin"], { returnTo: "/admin" });
  const { appUser } = session;

  const [
    pendingRequests,
    pendingRequestCount,
    pendingResearchItems,
    pendingResearchCount,
  ] = await Promise.all([
    listPendingEditorAccessRequests(),
    countPendingEditorAccessRequests(),
    listPendingResearchModerationItems(),
    countPendingResearchModerationItems(),
  ]);

  const peerInvitesMap = await listPeerReviewInvitesForResearchItems(
    pendingResearchItems.map((item) => item.id),
  );

  const totalPending = pendingRequestCount + pendingResearchCount;

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

        <main className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-24 md:px-12 md:pt-12 lg:px-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80">
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Admin</span>
        </nav>

        {/* Title section */}
        <div className="mb-10">
          {/* <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-4 text-primary" />
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Admin Panel
            </span>
            {totalPending > 0 && (
              <span className="rounded-full bg-amber-600/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                {totalPending} pending
              </span>
            )}
          </div> */}
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
            Administration
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Manage users, moderate research, and configure the platform.
          </p>
        </div>

        {/* Admin section cards */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/users" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Users className="size-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Users
                </CardTitle>
                <CardDescription>Manage accounts and roles</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/departments" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Building2 className="size-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Departments
                </CardTitle>
                <CardDescription>Organize academic units</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/tags" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Tag className="size-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Tags
                </CardTitle>
                <CardDescription>Categorize research items</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/journals" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Library className="size-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Journals
                </CardTitle>
                <CardDescription>Manage journals, volumes, and issues</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/history" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Clock className="size-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Moderation History
                </CardTitle>
                <CardDescription>Audit trail of decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pending sections */}
        <div className="mb-8">
          <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />}>
            <AdminPendingRequests requests={pendingRequests} limit={5} />
          </Suspense>
        </div>
        <div className="mb-8">
          <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />}>
            <AdminResearchModeration items={pendingResearchItems} peerInvitesMap={peerInvitesMap} limit={5} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
