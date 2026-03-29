import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { listJournalAdminOverview } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminJournalsList } from "@/components/admin-journals-list";

export default async function AdminJournalsPage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const journals = await listJournalAdminOverview();

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

      <SiteHeader role={session.appUser.role} />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-4 md:px-12 lg:px-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            href="/admin"
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Admin
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Journals</span>
        </nav>

        <div className="mb-10">
          {/* <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-4 text-primary" />
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Admin Panel
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Library className="mr-1 inline size-3" />
              Journals
            </span>
          </div> */}
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">Journals</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Manage journals, volumes, and issues for online-first and issue-based publication flows.
          </p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-border/60 bg-muted/20" />}>
          <AdminJournalsList journals={journals} />
        </Suspense>
      </main>
    </div>
  );
}
