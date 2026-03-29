import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
} from "lucide-react";

import { requireAppSession } from "@/lib/auth/session";
import { getSubmitterConfirmationItem } from "@/lib/db/queries";
import { getTypeLabel, getTypeColor } from "@/lib/research-types";
import { SiteHeader } from "@/components/site-header";
import { SubmitterConfirmationForm } from "@/components/submitter-confirmation-form";

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ConfirmationPageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await requireAppSession("/settings");
  const item = await getSubmitterConfirmationItem({
    researchItemId: id,
    userId: session.appUser.id,
  });

  if (!item) return { title: "Not Found" };

  return { title: `Confirm: ${item.title}` };
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function SubmitterConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const session = await requireAppSession("/settings");
  const { id } = await params;

  const item = await getSubmitterConfirmationItem({
    researchItemId: id,
    userId: session.appUser.id,
  });

  if (!item) notFound();

  const isPending =
    item.workflowStage === "awaiting_submitter_confirmation" &&
    item.submitterConfirmationStatus === "pending";

  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader role={session.appUser.role} />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24 md:px-12 md:pt-12 lg:px-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            href="/settings"
            className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80"
          >
            Settings
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">
            Publication Confirmation
          </span>
        </nav>

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Publication Confirmation
        </h1>

        <div className="max-w-2xl space-y-8">
          {/* Item summary */}
          <section className="rounded-xl border border-border/60 p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getTypeColor(item.itemType)}`}
              >
                {getTypeLabel(item.itemType)}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="size-3" />
                {item.publicationYear}
              </span>
              {item.departmentName && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Building2 className="size-3" />
                  {item.departmentName}
                </span>
              )}
            </div>

            <h2 className="mb-3 text-lg font-bold text-foreground">
              {item.title}
            </h2>

            {item.abstract && (
              <div>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="size-3.5" />
                  Abstract
                </h3>
                <p className="text-sm leading-[1.8] text-foreground/85">
                  {item.abstract}
                </p>
              </div>
            )}
          </section>

          {/* Admin request details */}
          {item.submitterConfirmationRequestedAt && (
            <section className="rounded-xl border border-amber-600/20 bg-amber-600/5 p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700">
                Confirmation Requested
              </h2>

              <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {formatDate(item.submitterConfirmationRequestedAt)}
              </div>

              {item.submitterConfirmationNote && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-amber-700/70" />
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {item.submitterConfirmationNote}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Decision form or already-responded state */}
          {isPending ? (
            <section className="rounded-xl border border-border/60 p-6">
              <SubmitterConfirmationForm researchItemId={item.id} />
            </section>
          ) : (
            <section className="rounded-xl border border-border/60 p-6">
              <p className="text-sm text-muted-foreground">
                This confirmation request has already been responded to. Current
                status:{" "}
                <span className="font-medium text-foreground">
                  {item.submitterConfirmationStatus
                    .split("_")
                    .map(
                      (part) =>
                        part.charAt(0).toUpperCase() + part.slice(1),
                    )
                    .join(" ")}
                </span>
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
