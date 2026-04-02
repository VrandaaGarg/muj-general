import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { SiteHeader } from "@/components/site-header";
import { AdminJournalsList } from "@/components/admin-journals-list";

export default async function AdminJournalCreatePage() {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals/new/submission",
    unauthorizedRedirectTo: "/settings",
  });

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
          <Link
            href="/admin/journals"
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Journals
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">New Submission</span>
        </nav>

        <div className="mb-10">
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
            Create Journal
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Complete the step-based form to launch a new journal.
          </p>
        </div>

        <AdminJournalsList journals={[]} mode="create" />
      </main>
    </div>
  );
}
