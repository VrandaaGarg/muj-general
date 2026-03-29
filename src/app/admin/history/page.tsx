import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { listModerationHistory } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminModerationHistory } from "@/components/admin-moderation-history";

export default async function AdminHistoryPage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/history",
    unauthorizedRedirectTo: "/settings",
  });
  const { appUser } = session;

  const history = await listModerationHistory();

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
          <span className="font-medium text-foreground">History</span>
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
          </div> */}
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
            Moderation History
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Full audit trail of all moderation decisions made across the
            platform.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-border/60 bg-muted/20"
                />
              ))}
            </div>
          }
        >
          <AdminModerationHistory entries={history} />
        </Suspense>
      </main>
    </div>
  );
}
