import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronRight,
  Download,
  ExternalLink,
  LinkIcon,
} from "lucide-react";

import { ResearchThumbnail } from "@/components/pdf-thumbnail-viewer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAppSession } from "@/lib/auth/session";
import {
  getPeerReviewInviteForUser,
  getResearchItemForAdminReview,
} from "@/lib/db/queries";
import { getTypeLabel } from "@/lib/research-types";
import { getPublicFileUrl } from "@/lib/storage/r2";

interface PeerReviewSubmissionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PeerReviewSubmissionPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Peer Review Submission ${id} - MUJ General`,
  };
}

function formatDate(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PeerReviewSubmissionPage({
  params,
}: PeerReviewSubmissionPageProps) {
  const session = await requireAppSession("/reviews");
  const { id } = await params;

  const invite = await getPeerReviewInviteForUser({
    inviteId: id,
    userId: session.appUser.id,
    userEmail: session.appUser.email,
  });

  if (!invite) {
    notFound();
  }

  if (invite.status === "declined") {
    redirect("/reviews");
  }

  const item = await getResearchItemForAdminReview(invite.researchItemId);

  if (!item) {
    notFound();
  }

  const pdfUrl = item.pdfFile ? getPublicFileUrl(item.pdfFile.objectKey) : null;
  const coverImageUrl = item.coverImageFile
    ? getPublicFileUrl(item.coverImageFile.objectKey)
    : null;
  const submittedAt = formatDate(item.createdAt);
  const publicationDate = formatDate(item.publicationDate);

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <SiteHeader role={session.appUser.role} />

      <main className="relative z-10 pt-4 md:pt-8">
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -top-20 bg-linear-to-b from-primary/3 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-6xl px-6 pt-4 pb-12 md:px-12 lg:px-20">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Link
                href="/"
                className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
              >
                Home
              </Link>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <Link
                href="/reviews"
                className="font-medium transition-colors hover:text-foreground"
              >
                Peer Reviews
              </Link>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <span className="font-medium text-foreground max-sm:line-clamp-1">
                {item.title}
              </span>
            </nav>

            <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-semibold text-primary">
                    {getTypeLabel(item.itemType)}
                  </span>
                  {item.departmentName && (
                    <span className="rounded-md bg-muted/60 px-2 py-0.5 text-sm font-medium text-muted-foreground">
                      {item.departmentName}
                    </span>
                  )}
                  <span className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-sm font-medium text-primary">
                    For peer review
                  </span>
                </div>

                <h1 className="mt-5 text-2xl font-bold leading-[1.2] tracking-tight text-foreground sm:text-3xl">
                  {item.title}
                </h1>

                {item.authors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {item.authors.map((author, index) => (
                        <span key={author.id}>
                          {index > 0 && ", "}
                          <span className="text-foreground/85">
                            {author.displayName}
                          </span>
                        </span>
                      ))}
                    </p>
                  </div>
                )}

                {item.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-primary/30 px-3 py-1 text-sm font-medium text-primary"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ size: "lg" })}
                    >
                      <Download className="size-4" />
                      Open manuscript PDF
                      {item.pdfFile?.sizeBytes ? (
                        <span className="ml-1 text-xs opacity-70">
                          ({(item.pdfFile.sizeBytes / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      ) : null}
                    </a>
                  )}
                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      <ExternalLink className="size-3.5" />
                      External source
                    </a>
                  )}
                  {item.doi && (
                    <a
                      href={`https://doi.org/${item.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      <LinkIcon className="size-3.5" />
                      DOI: {item.doi}
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {submittedAt && <span>Submitted {submittedAt}</span>}
                  {submittedAt && item.publicationYear ? (
                    <span className="text-border">-</span>
                  ) : null}
                  <span>{item.publicationYear}</span>
                </div>
              </div>

              {pdfUrl && coverImageUrl && (
                <div className="w-full shrink-0 sm:w-56 lg:w-52 xl:w-60">
                  <ResearchThumbnail
                    fileUrl={pdfUrl}
                    coverImageUrl={coverImageUrl}
                    title={item.title}
                  />
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-border/60" />

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="min-w-0 space-y-10">
                <section id="abstract">
                  <h2 className="mb-3 text-lg font-bold text-primary">Abstract</h2>
                  <p className="text-base leading-[1.85] text-foreground/85">
                    {item.abstract}
                  </p>
                </section>

                {(item.supervisorName || item.programName || item.license) && (
                  <section id="additional-details">
                    <h2 className="mb-3 text-lg font-bold text-primary">
                      Additional Details
                    </h2>
                    <div className="grid gap-3 rounded-xl border border-border/60 bg-card/50 p-5 sm:grid-cols-2 md:grid-cols-3">
                      {item.supervisorName && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Supervisor
                          </p>
                          <p className="text-base text-foreground">{item.supervisorName}</p>
                        </div>
                      )}
                      {item.programName && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Program
                          </p>
                          <p className="text-base text-foreground">{item.programName}</p>
                        </div>
                      )}
                      {item.license && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            License
                          </p>
                          <p className="text-base text-foreground">{item.license}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {item.references.length > 0 && (
                  <section id="references">
                    <h2 className="mb-3 text-lg font-bold text-primary">
                      References ({item.references.length})
                    </h2>
                    <ol className="space-y-2.5">
                      {item.references.map((reference, index) => (
                        <li
                          key={`${index}-${reference.citationText}`}
                          className="flex items-baseline gap-2.5 text-base leading-relaxed text-foreground/85"
                        >
                          <span className="shrink-0 text-sm font-medium text-muted-foreground">
                            [{index + 1}]
                          </span>
                          <span>
                            {reference.citationText}
                            {reference.url && (
                              <>
                                {" "}
                                <a
                                  href={reference.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary/80"
                                >
                                  Link
                                </a>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <section id="about-this-submission">
                  <h2 className="mb-1 text-xl font-bold text-primary">
                    About this submission
                  </h2>
                  <div className="mb-6 border-b border-primary/20" />
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                    {item.doi && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          DOI
                        </p>
                        <a
                          href={`https://doi.org/${item.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-sm text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:text-primary/80"
                        >
                          https://doi.org/{item.doi}
                        </a>
                      </div>
                    )}
                    {submittedAt && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Submitted
                        </p>
                        <p className="mt-1 text-base text-foreground">{submittedAt}</p>
                      </div>
                    )}
                    {publicationDate && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Requested publication date
                        </p>
                        <p className="mt-1 text-base text-foreground">{publicationDate}</p>
                      </div>
                    )}
                    {item.departmentName && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Department
                        </p>
                        <p className="mt-1 text-base text-foreground">{item.departmentName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Publication year
                      </p>
                      <p className="mt-1 text-base text-foreground">{item.publicationYear}</p>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="hidden lg:block">
                <div className="sticky top-8 rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Quick links</p>
                  <nav className="space-y-0.5 border-l border-border/60">
                    <a
                      href="#abstract"
                      className="block border-l-2 border-transparent py-2 pl-4 text-sm text-primary underline-offset-2 transition-colors hover:border-primary hover:underline"
                    >
                      Abstract
                    </a>
                    {(item.supervisorName || item.programName || item.license) && (
                      <a
                        href="#additional-details"
                        className="block border-l-2 border-transparent py-2 pl-4 text-sm text-primary underline-offset-2 transition-colors hover:border-primary hover:underline"
                      >
                        Additional details
                      </a>
                    )}
                    {item.references.length > 0 && (
                      <a
                        href="#references"
                        className="block border-l-2 border-transparent py-2 pl-4 text-sm text-primary underline-offset-2 transition-colors hover:border-primary hover:underline"
                      >
                        References
                      </a>
                    )}
                    <a
                      href="#about-this-submission"
                      className="block border-l-2 border-transparent py-2 pl-4 text-sm text-primary underline-offset-2 transition-colors hover:border-primary hover:underline"
                    >
                      About this submission
                    </a>
                  </nav>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
