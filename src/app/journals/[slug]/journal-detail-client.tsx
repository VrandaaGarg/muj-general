"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FileUp,
  Mail,
  User,
} from "lucide-react";

import { MarkdownContent } from "@/components/ui/markdown-content";
import { ResearchCard } from "@/components/research-card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EditorialBoardMember {
  id: string;
  role: string;
  personName: string;
  affiliation: string | null;
  email: string | null;
  orcid: string | null;
}

interface ResearchItem {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  itemType: string;
  publicationYear: number;
  publishedAt: Date | null;
  departmentName: string | null;
  departmentSlug?: string | null;
  authors: { id: string; name: string }[];
  tags: { id: string; name: string; slug: string }[];
  coverImageUrl: string | null;
}

interface IssueGroup {
  id: string;
  title: string | null;
  issueNumber: number;
  publishedAt: Date | null;
  volumeNumber: number;
  volumeTitle: string | null;
  volumeYear: number;
  items: ResearchItem[];
}

interface JournalData {
  name: string;
  slug: string;
  coverImageUrl: string | null;
  description: string | null;
  issn: string | null;
  eissn: string | null;
  aimAndScope: string | null;
  topics: string | null;
  contentTypes: string | null;
  ethicsPolicy: string | null;
  disclosuresPolicy: string | null;
  rightsPermissions: string | null;
  contactInfo: string | null;
  submissionChecklist: string | null;
  submissionGuidelines: string | null;
  howToPublish: string | null;
  feesAndFunding: string | null;
  editorialBoard: EditorialBoardMember[];
  onlineFirstItems: ResearchItem[];
  issues: IssueGroup[];
}

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/* ------------------------------------------------------------------ */
/*  Section IDs                                                        */
/* ------------------------------------------------------------------ */

type SectionId =
  | null
  | "aim-scope-topics"
  | "editorial-board"
  | "policies-ethics"
  | "online-first"
  | "volumes-issues"
  | "submission-guidelines"
  | "submission-checklist"
  | "how-to-publish"
  | "fees-and-funding";

/* ------------------------------------------------------------------ */
/*  Nav definition                                                     */
/* ------------------------------------------------------------------ */

type NavGroup = {
  label: string;
  items: { label: string; sectionId: SectionId }[];
};

function buildNavGroups(journal: JournalData): NavGroup[] {
  const about: NavGroup = {
    label: "About this Journal",
    items: [],
  };
  const hasAimScope = journal.aimAndScope || journal.topics || journal.contentTypes;
  if (hasAimScope) about.items.push({ label: "Aim & Scope", sectionId: "aim-scope-topics" });
  if (journal.editorialBoard.length > 0) about.items.push({ label: "Editorial Board", sectionId: "editorial-board" });
  const hasPolicies =
    journal.ethicsPolicy?.length ||
    journal.disclosuresPolicy?.length ||
    journal.rightsPermissions?.length ||
    journal.contactInfo?.length;
  if (hasPolicies) about.items.push({ label: "Policies, Ethics & Disclosures", sectionId: "policies-ethics" });

  const articles: NavGroup = {
    label: "Articles",
    items: [],
  };
  if (journal.onlineFirstItems.length > 0) articles.items.push({ label: "Online First", sectionId: "online-first" });
  if (journal.issues.length > 0) articles.items.push({ label: "Volumes & Issues", sectionId: "volumes-issues" });

  const forAuthors: NavGroup = {
    label: "For Authors",
    items: [],
  };
  if (journal.submissionGuidelines?.length) forAuthors.items.push({ label: "Submission Guidelines", sectionId: "submission-guidelines" });
  if (journal.submissionChecklist?.length) forAuthors.items.push({ label: "Submission Checklist", sectionId: "submission-checklist" });
  if (journal.howToPublish?.length) forAuthors.items.push({ label: "How to Publish", sectionId: "how-to-publish" });
  if (journal.feesAndFunding?.length) forAuthors.items.push({ label: "Fees & Funding", sectionId: "fees-and-funding" });

  return [about, articles, forAuthors].filter((g) => g.items.length > 0);
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */

export function JournalDetailClient({ journal }: { journal: JournalData }) {
  const navGroups = buildNavGroups(journal);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>(null);
  const navRef = useRef<HTMLElement>(null);

  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => (prev === label ? null : label));
  };

  useEffect(() => {
    if (!openGroup) return;
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openGroup]);

  const selectSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    setOpenGroup(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allArticles = useMemo(() => {
    const issueArticles = journal.issues.flatMap((issue) => issue.items);
    return [...journal.onlineFirstItems, ...issueArticles].sort((a, b) => {
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return db - da;
    });
  }, [journal.onlineFirstItems, journal.issues]);

  const totalArticles = allArticles.length;

  const latestPublished = useMemo(() => {
    if (allArticles.length === 0) return null;
    const first = allArticles[0];
    return first.publishedAt ? new Date(first.publishedAt) : null;
  }, [allArticles]);

  const boardByRole = useMemo(() => {
    const groups: Record<string, EditorialBoardMember[]> = {};
    for (const m of journal.editorialBoard) {
      if (!groups[m.role]) groups[m.role] = [];
      groups[m.role].push(m);
    }
    return Object.entries(groups);
  }, [journal.editorialBoard]);

  const previewEditors = journal.editorialBoard.slice(0, 3);
  const previewArticles = allArticles.slice(0, 3);

  return (
    <>
      {/* Breadcrumb */}
      <motion.nav
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-base text-muted-foreground max-w-7xl mx-auto px-6 md:px-12 lg:px-20"
      >
        <Link
          href="/"
          className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
        >
          Home
        </Link>
        <ChevronRight className="size-4 text-muted-foreground/50" />
        <Link
          href="/journals"
          className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
        >
          Journals
        </Link>
        <ChevronRight className="size-4 text-muted-foreground/50" />
        <span className="max-w-[280px] truncate font-medium text-foreground">
          {journal.name}
        </span>
      </motion.nav>

      {/* Hero: cover LEFT, details RIGHT */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8 lg:gap-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20"
      >
        {/* Left: cover */}
        <div className="w-full shrink-0 sm:w-44 lg:w-48 xl:w-52">
          {journal.coverImageUrl ? (
            <div className="relative aspect-[4/5] w-full overflow-hidden    border border-border/50 shadow-md">
              <Image
                src={journal.coverImageUrl}
                alt={`${journal.name} cover`}
                fill
                sizes="(max-width: 640px) 100vw, 220px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[4/5] w-full items-end justify-start overflow-hidden    bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-5 shadow-md">
              <p className="text-2xl font-bold leading-snug tracking-tight text-primary-foreground">
                {journal.name}
              </p>
            </div>
          )}
        </div>

        {/* Right: name + stats */}
        <div className="min-w-0 flex-1">
          <span className="text-base font-semibold text-primary">Journal</span>

          <h1 className="mt-2">
            <button
              type="button"
              onClick={() => selectSection(null)}
              className="text-left text-4xl font-bold leading-[1.15] tracking-tight text-foreground transition-colors hover:text-primary sm:text-5xl"
            >
              {journal.name}
            </button>
          </h1>

          <div className="mt-4">
            <Link
              href={`/journals/${journal.slug}/new/submission`}
              className="inline-flex items-center gap-2   bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <FileUp className="size-4" />
              Upload your manuscript
            </Link>
          </div>

          {/* Quick stats grid */}
          <div className="mt-5 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {journal.issn && (
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">ISSN (Print)</p>
                <p className="mt-0.5 font-mono text-base tracking-wide text-foreground">{journal.issn}</p>
              </div>
            )}
            {journal.eissn && (
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">E-ISSN (Online)</p>
                <p className="mt-0.5 font-mono text-base tracking-wide text-foreground">{journal.eissn}</p>
              </div>
            )}
            {totalArticles > 0 && (
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Articles</p>
                <p className="mt-0.5 text-base font-medium text-foreground">{totalArticles}</p>
              </div>
            )}
            {latestPublished && (
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Latest Published</p>
                <p className="mt-0.5 text-base text-foreground">
                  {latestPublished.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Section Navigation Bar */}
      {navGroups.length > 0 && (
        <motion.nav
          ref={navRef}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="sticky top-0 z-30 border-y border-border/60 bg-white backdrop-blur-sm "
        >
          <div className="flex items-center gap-0 max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
            {navGroups.map((group) => {
              const isOpen = openGroup === group.label;
              const isGroupActive = group.items.some((i) => i.sectionId === activeSection);

              return (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "inline-flex items-center gap-2 border-b-2 px-5 py-3.5 text-base font-medium transition-colors",
                      isGroupActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full z-40 mt-0.5 min-w-[240px]   border border-border/60 bg-card p-1.5 shadow-lg">
                      {group.items.map((navItem) => (
                        <button
                          key={navItem.sectionId}
                          onClick={() => selectSection(navItem.sectionId)}
                          className={cn(
                            "flex w-full items-center gap-2     px-3.5 py-2.5 text-left text-base transition-colors",
                            activeSection === navItem.sectionId
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {navItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.nav>
      )}

      <div className="h-8" />

      {/* Content: conditional rendering */}
      <div>
        {/* Default view */}
        {activeSection === null && (
          <DefaultContent
            journal={journal}
            previewEditors={previewEditors}
            previewArticles={previewArticles}
            totalArticles={totalArticles}
            onNavigate={selectSection}
          />
        )}

        {/* About > Aim & Scope (includes topics + content types) */}
        {activeSection === "aim-scope-topics" && (
          <SectionShell title="Aim & Scope">
            <div className="space-y-7 ">
              {journal.aimAndScope && (
                <MarkdownContent
                  content={journal.aimAndScope}
                  className="text-foreground/85"
                />
              )}
              {journal.topics && (
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-primary">Topics</h3>
                  <MarkdownContent content={journal.topics} className="text-foreground/85" />
                </div>
              )}
              {journal.contentTypes && (
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-primary">Content Types</h3>
                  <MarkdownContent
                    content={journal.contentTypes}
                    className="text-foreground/85"
                  />
                </div>
              )}
            </div>
          </SectionShell>
        )}

        {/* About > Editorial Board */}
        {activeSection === "editorial-board" && journal.editorialBoard.length > 0 && (
          <SectionShell title="Editorial Board">
            <EditorialBoardFull boardByRole={boardByRole} />
          </SectionShell>
        )}

        {/* About > Policies, Ethics & Disclosures */}
        {activeSection === "policies-ethics" && (
          <SectionShell title="Policies, Ethics & Disclosures">
            <div className="space-y-8">
              {journal.ethicsPolicy?.length && journal.ethicsPolicy.length > 0 && (
                <MarkdownSectionBlock title="Ethics Policy" content={journal.ethicsPolicy} />
              )}
              {journal.disclosuresPolicy?.length && journal.disclosuresPolicy.length > 0 && (
                <MarkdownSectionBlock title="Disclosures" content={journal.disclosuresPolicy} />
              )}
              {journal.rightsPermissions?.length && journal.rightsPermissions.length > 0 && (
                <MarkdownSectionBlock title="Rights & Permissions" content={journal.rightsPermissions} />
              )}
              {journal.contactInfo?.length && journal.contactInfo.length > 0 && (
                <MarkdownSectionBlock title="Contact Information" content={journal.contactInfo} />
              )}
            </div>
          </SectionShell>
        )}

        {/* Articles > Online First */}
        {activeSection === "online-first" && journal.onlineFirstItems.length > 0 && (
          <SectionShell title="Online First">
            <div className="space-y-4">
              {journal.onlineFirstItems.map((item, index) => (
                <ResearchCard key={item.id} item={item} index={index} />
              ))}
            </div>
          </SectionShell>
        )}

        {/* Articles > Volumes & Issues */}
        {activeSection === "volumes-issues" && journal.issues.length > 0 && (
          <SectionShell title="Volumes & Issues">
            <div className="space-y-8">
              {journal.issues.map((issue) => (
                <div key={issue.id}>
                  <div className="mb-4    border border-border/60 bg-muted/20 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Volume {issue.volumeNumber} ({issue.volumeYear})
                    </p>
                    <h3 className="mt-1 font-sans text-2xl tracking-tight text-foreground">
                      Issue {issue.issueNumber}
                      {issue.title ? ` \u2014 ${issue.title}` : ""}
                    </h3>
                    {issue.publishedAt && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Published {new Date(issue.publishedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="space-y-4">
                    {issue.items.map((item, index) => (
                      <ResearchCard key={item.id} item={item} index={index} />
                    ))}
                    {issue.items.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No articles published in this issue yet.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>
        )}

        {/* For Authors sections */}
        {activeSection === "submission-guidelines" && (
          <RichTextSectionView title="Submission Guidelines" content={journal.submissionGuidelines} />
        )}
        {activeSection === "submission-checklist" && (
          <RichTextSectionView title="Submission Checklist" content={journal.submissionChecklist} />
        )}
        {activeSection === "how-to-publish" && (
          <RichTextSectionView title="How to Publish" content={journal.howToPublish} />
        )}
        {activeSection === "fees-and-funding" && (
          <RichTextSectionView title="Fees & Funding" content={journal.feesAndFunding} />
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Default view                                                       */
/* ------------------------------------------------------------------ */

function DefaultContent({
  journal,
  previewEditors,
  previewArticles,
  totalArticles,
  onNavigate,
}: {
  journal: JournalData;
  previewEditors: EditorialBoardMember[];
  previewArticles: ResearchItem[];
  totalArticles: number;
  onNavigate: (section: SectionId) => void;
}) {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="space-y-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      {/* Brief overview */}
      {journal.description && (
        <section>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight text-primary">Overview</h2>
          <MarkdownContent content={journal.description} className="text-foreground/85" />
        </section>
      )}

      {/* Editorial board preview */}
      {previewEditors.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-primary">Editorial Board</h2>
            {journal.editorialBoard.length > previewEditors.length && (
              <button
                onClick={() => onNavigate("editorial-board")}
                className="text-base font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all editors
              </button>
            )}
          </div>
          <div className="divide-y divide-border/60">
            {previewEditors.map((member) => (
              <EditorRow key={member.id} member={member} />
            ))}
          </div>
        </section>
      )}

      {/* Recent articles preview */}
      {previewArticles.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-primary">Recent Articles</h2>
            {totalArticles > previewArticles.length && (
              <button
                onClick={() => onNavigate(journal.onlineFirstItems.length > 0 ? "online-first" : "volumes-issues")}
                className="text-base font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all articles
              </button>
            )}
          </div>
          <div className="space-y-4">
            {previewArticles.map((item, index) => (
              <ResearchCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editorial Board (full, grouped by role)                            */
/* ------------------------------------------------------------------ */

function EditorialBoardFull({
  boardByRole,
}: {
  boardByRole: [string, EditorialBoardMember[]][];
}) {
  return (
    <div className="space-y-8">
      {boardByRole.map(([role, members]) => (
        <div key={role}>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{role}</h3>
          <div className="mt-2 border-t border-primary/20" />
          <div className="divide-y divide-border/60">
            {members.map((member) => (
              <EditorRow key={member.id} member={member} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single editor row                                                  */
/* ------------------------------------------------------------------ */

function EditorRow({ member }: { member: EditorialBoardMember }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex size-11 shrink-0 items-center justify-center    border border-border/80 bg-muted/50">
        <User className="size-5 text-muted-foreground/70" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{member.personName}</p>
        {member.affiliation && (
          <p className="mt-0.5 text-sm text-muted-foreground">{member.affiliation}</p>
        )}
        {member.email && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            {member.email}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section shell                                                      */
/* ------------------------------------------------------------------ */

function SectionShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
      <h2 className="mb-5 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-primary">
        
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function MarkdownSectionBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="mt-2 border-t border-primary/20" />
      <MarkdownContent content={content} className="mt-5 text-foreground/85" />
    </div>
  );
}

function RichTextSectionView({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content?.trim()) return null;

  return (
    <SectionShell title={title}>
      <MarkdownContent content={content} className="text-foreground/85" />
    </SectionShell>
  );
}
