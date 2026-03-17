import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { listModerationHistory } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminModerationHistory } from "@/components/admin-moderation-history";

export default async function AdminHistoryPage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/history",
    unauthorizedRedirectTo: "/dashboard",
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

      <SiteHeader accentColor="rose" role={appUser.role} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-24 md:px-12 md:pt-16">
        {/* Breadcrumb */}
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to Admin
        </Link>

        {/* Title section */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-600/10">
              <Shield className="size-4 text-rose-600" />
            </div>
            <span className="rounded-full bg-rose-600/10 px-2.5 py-0.5 text-xs font-medium text-rose-600">
              Admin Panel
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
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
