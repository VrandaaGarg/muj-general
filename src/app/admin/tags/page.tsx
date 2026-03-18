import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { listTagAdminStats } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminTagsList } from "@/components/admin-tags-list";

export default async function AdminTagsPage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/tags",
    unauthorizedRedirectTo: "/dashboard",
  });
  const { appUser } = session;

  const tags = await listTagAdminStats();

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
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
            Tags
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Create and manage tags used to categorize research across the
            platform.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-lg border border-border/60 bg-muted/20"
                  />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/20"
                />
              ))}
            </div>
          }
        >
          <AdminTagsList tags={tags} />
        </Suspense>
      </main>
    </div>
  );
}
