import { Suspense } from "react";
import {
  Building2,
  Settings,
  Shield,
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

        {/* Pending editor requests */}
        <div className="mb-8">
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
            }
          >
            <AdminPendingRequests requests={pendingRequests} />
          </Suspense>
        </div>

        {/* Research moderation */}
        <div className="mb-8">
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
            }
          >
            <AdminResearchModeration items={pendingResearchItems} />
          </Suspense>
        </div>

        {/* Admin section cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Users className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Users
              </CardTitle>
              <CardDescription>Manage accounts and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Building2 className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Departments
              </CardTitle>
              <CardDescription>Organize academic units</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
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

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Admin tools are being built. Check back as the platform grows.
        </p>
      </main>
    </div>
  );
}
