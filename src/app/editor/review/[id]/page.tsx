import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileText,
  Mail,
  ScrollText,
  Tag,
  User,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import {
  getResearchItemForAdminReview,
  listDepartmentResearchItemsForReview,
} from "@/lib/db/queries";
import { getTypeColor, getTypeLabel } from "@/lib/research-types";
import { getPublicFileUrl } from "@/lib/storage/r2";
import { SiteHeader } from "@/components/site-header";

interface EditorReviewPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditorReviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getResearchItemForAdminReview(id);
  if (!item) {
    return { title: "Not Found — Editor Review" };
  }
  return { title: `Preview: ${item.title} — Editor` };
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStageLabel(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function EditorReviewPreviewPage({
  params,
}: EditorReviewPageProps) {
  const session = await requireRole(["editor", "admin"], {
    returnTo: "/editor",
    unauthorizedRedirectTo: "/settings",
  });

  const { id } = await params;
  const item = await getResearchItemForAdminReview(id);

  if (!item) {
    notFound();
  }

  if (session.appUser.role !== "admin") {
    const queue = await listDepartmentResearchItemsForReview(session.appUser.id);
    const allowed = queue.some((entry) => entry.id === id);
    if (!allowed) {
      redirect("/editor");
    }
  }

  const pdfUrl = item.pdfFile ? getPublicFileUrl(item.pdfFile.objectKey) : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader role={session.appUser.role} />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-8 md:px-12 md:pt-12 lg:px-20">
        <Link
          href="/editor"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to editor queue
        </Link>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getTypeColor(item.itemType)}`}
          >
            {getTypeLabel(item.itemType)}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {formatStageLabel(item.workflowStage ?? item.status)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Submitted {formatDate(item.createdAt)}
          </span>
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {item.title}
        </h1>

        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="size-3" />
            {item.submittedByName}
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="size-3" />
            {item.submittedByEmail}
          </span>
          {item.departmentName && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3" />
              {item.departmentName}
            </span>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-border/60 bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-foreground">
              Abstract
            </h2>
            <p className="text-sm leading-relaxed text-foreground/85">
              {item.abstract}
            </p>
          </section>

          {item.authors.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                <Users className="size-4" />
                Authors
              </h2>
              <div className="space-y-1.5 text-sm">
                {item.authors.map((author) => (
                  <p key={author.id}>
                    <span className="font-medium">{author.displayName}</span>
                    {author.email ? ` · ${author.email}` : ""}
                    {author.affiliation ? ` · ${author.affiliation}` : ""}
                  </p>
                ))}
              </div>
            </section>
          )}

          {item.tags.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                <Tag className="size-4" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {item.references.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                <ScrollText className="size-4" />
                References
              </h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/85">
                {item.references.map((ref, index) => (
                  <li key={`${index}-${ref.citationText}`}>
                    {ref.citationText}
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        link <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="rounded-xl border border-border/60 bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-foreground">
              Files
            </h2>
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <FileText className="size-4" />
                Open submitted PDF
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No PDF found.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
