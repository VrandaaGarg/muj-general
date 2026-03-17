import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { listAdminUsers, listDepartments } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminUsersList } from "@/components/admin-users-list";

export default async function AdminUsersPage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/users",
    unauthorizedRedirectTo: "/dashboard",
  });
  const { appUser } = session;

  const [users, departments] = await Promise.all([
    listAdminUsers(),
    listDepartments(),
  ]);

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
            User Management
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            View all registered users, update roles, and assign departments.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/20"
                />
              ))}
            </div>
          }
        >
          <AdminUsersList users={users} departments={departments} />
        </Suspense>
      </main>
    </div>
  );
}
