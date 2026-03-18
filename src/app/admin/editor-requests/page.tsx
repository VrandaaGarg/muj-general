import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { listPendingEditorAccessRequests } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminPendingRequests } from "@/components/admin-pending-requests";

export default async function EditorRequestsPage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/editor-requests",
  });
  const { appUser } = session;

  const requests = await listPendingEditorAccessRequests();

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
            Editor Requests
          </span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Editor Access Requests
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Review all pending editor access requests.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
          }
        >
          <AdminPendingRequests requests={requests} />
        </Suspense>
      </main>
    </div>
  );
}
