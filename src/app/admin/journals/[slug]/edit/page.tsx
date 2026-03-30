import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Shield } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getJournalForAdminEdit } from "@/lib/db/queries";
import { SiteHeader } from "@/components/site-header";
import { AdminJournalEditForm } from "@/components/admin-journal-edit-form";

interface EditJournalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EditJournalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const journal = await getJournalForAdminEdit(slug);

  if (!journal) {
    return { title: "Journal Not Found — MUJ General" };
  }

  return {
    title: `Edit ${journal.name} — Admin — MUJ General`,
  };
}

export default async function EditJournalPage({
  params,
}: EditJournalPageProps) {
  const session = await requireRole(["admin"], {
    returnTo: "/admin/journals",
    unauthorizedRedirectTo: "/settings",
  });

  const { slug } = await params;
  const journal = await getJournalForAdminEdit(slug);

  if (!journal) {
    notFound();
  }

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
          <span className="max-w-[200px] truncate font-medium text-foreground">
            {journal.name}
          </span>
        </nav>

        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center   bg-primary/10">
              <Shield className="size-4 text-primary" />
            </div>
            <span className="   bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Admin Panel
            </span>
          </div>
          <h1 className="font-sans text-3xl tracking-tight md:text-4xl">
            Edit Journal
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Update details, policies, structure, and editorial board for{" "}
            <span className="font-medium text-foreground">{journal.name}</span>.
          </p>
        </div>

        <AdminJournalEditForm journal={journal} />
      </main>
    </div>
  );
}
