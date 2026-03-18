import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  Settings,
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

      <SiteHeader accentColor="rose" role={appUser.role} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-24 md:px-12 md:pt-16">
        {/* Title section */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-600/10">
              <Shield className="size-4 text-rose-600" />
            </div>
            <span className="rounded-full bg-rose-600/10 px-2.5 py-0.5 text-xs font-medium text-rose-600">
              Admin Panel
            </span>
            {totalPending > 0 && (
              <span className="rounded-full bg-amber-600/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                {totalPending} pending
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            Administration
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Manage users, moderate research, and configure the platform. Signed
            in as{" "}
            <span className="font-medium text-foreground">{appUser.name}</span>.
          </p>
        </div>

        {/* Sections: whichever has items renders first */}
        {pendingResearchCount >= pendingRequestCount ? (
          <>
            <div className="mb-8">
              <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />}>
                <AdminResearchModeration items={pendingResearchItems} />
              </Suspense>
            </div>
            <div className="mb-8">
              <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />}>
                <AdminPendingRequests requests={pendingRequests} />
              </Suspense>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8">
              <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />}>
                <AdminPendingRequests requests={pendingRequests} />
              </Suspense>
            </div>
            <div className="mb-8">
              <Suspense fallback={<div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />}>
                <AdminResearchModeration items={pendingResearchItems} />
              </Suspense>
            </div>
          </>
        )}

        {/* Admin section cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/admin/users" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-rose-600/30 group-hover:bg-rose-600/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-rose-600/10 transition-colors group-hover:bg-rose-600/15">
                  <Users className="size-4 text-rose-600" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Users
                </CardTitle>
                <CardDescription>Manage accounts and roles</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/departments" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-rose-600/30 group-hover:bg-rose-600/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-rose-600/10 transition-colors group-hover:bg-rose-600/15">
                  <Building2 className="size-4 text-rose-600" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Departments
                </CardTitle>
                <CardDescription>Organize academic units</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/tags" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-rose-600/30 group-hover:bg-rose-600/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-rose-600/10 transition-colors group-hover:bg-rose-600/15">
                  <Tag className="size-4 text-rose-600" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Tags
                </CardTitle>
                <CardDescription>Categorize research items</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Manage
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/history" className="group">
            <Card className="border-border/60 transition-colors group-hover:border-rose-600/30 group-hover:bg-rose-600/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-rose-600/10 transition-colors group-hover:bg-rose-600/15">
                  <Clock className="size-4 text-rose-600" />
                </div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Moderation History
                </CardTitle>
                <CardDescription>Audit trail of decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 opacity-0 transition-opacity group-hover:opacity-100">
                  View
                  <ArrowRight className="size-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Upcoming */}
        <div className="mt-4">
          <Card className="border-border/60 opacity-60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Settings className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Settings
              </CardTitle>
              <CardDescription>Platform configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
