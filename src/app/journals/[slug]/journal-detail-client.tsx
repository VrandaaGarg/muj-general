"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Gavel,
  Home,
  Info,
  Library,
  Mail,
  ScrollText,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { ResearchCard } from "@/components/research-card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StructuredSection {
  heading: string;
  content: string;
}

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
  description: string | null;
  issn: string | null;
  eissn: string | null;
  aimAndScope: string | null;
  topics: string | null;
  contentTypes: string | null;
  ethicsPolicy: StructuredSection[] | null;
  disclosuresPolicy: StructuredSection[] | null;
  rightsPermissions: StructuredSection[] | null;
  contactInfo: StructuredSection[] | null;
  submissionChecklist: StructuredSection[] | null;
  submissionGuidelines: StructuredSection[] | null;
  howToPublish: StructuredSection[] | null;
  feesAndFunding: StructuredSection[] | null;
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
/*  Nav definition                                                     */
/* ------------------------------------------------------------------ */

type NavGroup = { label: string; icon: React.ReactNode; items: { label: string; anchor: string }[] };

function buildNavGroups(journal: JournalData): NavGroup[] {
  const about: NavGroup = {
    label: "About this Journal",
    icon: <Info className="size-3.5" />,
    items: [],
  };
  if (journal.description) about.items.push({ label: "Description", anchor: "description" });
  if (journal.aimAndScope) about.items.push({ label: "Aim & Scope", anchor: "aim-and-scope" });
  if (journal.editorialBoard.length > 0) about.items.push({ label: "Editorial Board", anchor: "editorial-board" });
  if (journal.ethicsPolicy?.length) about.items.push({ label: "Ethics Policy", anchor: "ethics-policy" });
  if (journal.disclosuresPolicy?.length) about.items.push({ label: "Disclosures", anchor: "disclosures-policy" });
  if (journal.rightsPermissions?.length) about.items.push({ label: "Rights & Permissions", anchor: "rights-permissions" });
  if (journal.contactInfo?.length) about.items.push({ label: "Contact", anchor: "contact-info" });

  const articles: NavGroup = {
    label: "Articles",
    icon: <FileText className="size-3.5" />,
    items: [],
  };
  if (journal.onlineFirstItems.length > 0) articles.items.push({ label: "Online First", anchor: "online-first" });
  if (journal.issues.length > 0) articles.items.push({ label: "Volumes & Issues", anchor: "volumes-issues" });

  const forAuthors: NavGroup = {
    label: "For Authors",
    icon: <Send className="size-3.5" />,
    items: [],
  };
  if (journal.submissionGuidelines?.length) forAuthors.items.push({ label: "Submission Guidelines", anchor: "submission-guidelines" });
  if (journal.submissionChecklist?.length) forAuthors.items.push({ label: "Submission Checklist", anchor: "submission-checklist" });
  if (journal.howToPublish?.length) forAuthors.items.push({ label: "How to Publish", anchor: "how-to-publish" });
  if (journal.feesAndFunding?.length) forAuthors.items.push({ label: "Fees & Funding", anchor: "fees-and-funding" });

  return [about, articles, forAuthors].filter((g) => g.items.length > 0);
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */

export function JournalDetailClient({ journal }: { journal: JournalData }) {
  const navGroups = buildNavGroups(journal);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<string>("");
  const navRef = useRef<HTMLElement>(null);

  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => (prev === label ? null : label));
  };

  // Close dropdown on outside click
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

  const scrollToSection = useCallback((anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) {
      const offset = 100;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setOpenGroup(null);
  }, []);

  // Track which section is visible
  useEffect(() => {
    const allAnchors = navGroups.flatMap((g) => g.items.map((i) => i.anchor));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveAnchor(entry.target.id);
          }
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 },
    );

    for (const anchor of allAnchors) {
      const el = document.getElementById(anchor);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [navGroups]);

  const hasAboutContent = journal.description || journal.aimAndScope || journal.topics || journal.contentTypes;
  const hasArticles = journal.onlineFirstItems.length > 0 || journal.issues.length > 0;

  return (
    <>
      {/* ─── Breadcrumb ─── */}
      <motion.nav
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          <Home className="size-3" />
          Home
        </Link>
        <ChevronRight className="size-3 opacity-40" />
        <Link href="/journals" className="transition-colors hover:text-foreground">
          Journals
        </Link>
        <ChevronRight className="size-3 opacity-40" />
        <span className="max-w-[200px] truncate font-medium text-foreground">{journal.name}</span>
      </motion.nav>

      {/* ─── Hero ─── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="mb-8 grid gap-6 md:grid-cols-[1fr_1.2fr]"
      >
        {/* Left: decorative card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-600/20 bg-gradient-to-br from-amber-50/80 via-amber-100/40 to-orange-50/60 p-6 dark:from-amber-950/30 dark:via-amber-900/15 dark:to-orange-950/20">
          <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 size-32 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-600/15 shadow-sm">
                <Library className="size-4 text-amber-700 dark:text-amber-400" />
              </div>
              <span className="rounded-full bg-amber-600/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Journal
              </span>
            </div>
            <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground md:text-3xl">
              {journal.name}
            </h1>
            {journal.topics && (
              <p className="mt-3 text-xs leading-relaxed text-amber-800/70 dark:text-amber-300/60">
                {journal.topics}
              </p>
            )}
          </div>
        </div>

        {/* Right: meta details */}
        <div className="flex flex-col justify-center space-y-4 rounded-2xl border border-border/60 bg-card/50 p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Journal Title</p>
            <h2 className="mt-1 font-serif text-xl tracking-tight md:text-2xl">{journal.name}</h2>
          </div>
          <div className="h-px bg-border/60" />
          <div className="grid gap-3 sm:grid-cols-2">
            {journal.issn && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ISSN (Print)</p>
                <p className="mt-0.5 font-mono text-sm tracking-wide">{journal.issn}</p>
              </div>
            )}
            {journal.eissn && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">E-ISSN (Online)</p>
                <p className="mt-0.5 font-mono text-sm tracking-wide">{journal.eissn}</p>
              </div>
            )}
            {journal.contentTypes && (
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Content Types</p>
                <p className="mt-0.5 text-sm text-foreground/85">{journal.contentTypes}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Section Navigation Bar ─── */}
      {navGroups.length > 0 && (
        <motion.nav
          ref={navRef}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="sticky top-[2px] z-30 mb-10 rounded-xl border border-border/60 bg-card/95 shadow-sm backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-center gap-0.5 p-1.5">
            {navGroups.map((group) => {
              const isOpen = openGroup === group.label;
              const isGroupActive = group.items.some((i) => i.anchor === activeAnchor);

              return (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      isGroupActive
                        ? "bg-amber-600/10 text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {group.icon}
                    <span className="hidden sm:inline">{group.label}</span>
                    <span className="sm:hidden">{group.label.split(" ")[0]}</span>
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Dropdown */}
                  {isOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-lg border border-border/60 bg-card p-1 shadow-lg">
                      {group.items.map((navItem) => (
                        <button
                          key={navItem.anchor}
                          onClick={() => scrollToSection(navItem.anchor)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors",
                            activeAnchor === navItem.anchor
                              ? "bg-amber-600/10 font-medium text-amber-700 dark:text-amber-400"
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

      {/* ─── Content Sections ─── */}
      <div className="space-y-12">
        {/* About this Journal */}
        {hasAboutContent && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            {/* Description */}
            {journal.description && (
              <ContentSection id="description" icon={<BookOpen className="size-4" />} title="Description">
                <p className="text-sm leading-relaxed text-foreground/85">{journal.description}</p>
              </ContentSection>
            )}

            {/* Aim & Scope */}
            {journal.aimAndScope && (
              <ContentSection id="aim-and-scope" icon={<ScrollText className="size-4" />} title="Aim & Scope" className="mt-8">
                <p className="text-sm leading-relaxed text-foreground/85">{journal.aimAndScope}</p>
              </ContentSection>
            )}
          </motion.div>
        )}

        {/* Editorial Board */}
        {journal.editorialBoard.length > 0 && (
          <ContentSection id="editorial-board" icon={<Users className="size-4" />} title="Editorial Board">
            <div className="grid gap-3 sm:grid-cols-2">
              {journal.editorialBoard.map((member) => (
                <div key={member.id} className="rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-amber-600/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {member.role}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{member.personName}</p>
                  {member.affiliation && (
                    <p className="mt-1 text-xs text-muted-foreground">{member.affiliation}</p>
                  )}
                  {(member.email || member.orcid) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {member.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3" />
                          {member.email}
                        </span>
                      )}
                      {member.orcid && (
                        <span className="rounded-full bg-muted px-2 py-0.5">ORCID {member.orcid}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ContentSection>
        )}

        {/* Policies (structured sections under About) */}
        <StructuredBlock id="ethics-policy" icon={<ShieldCheck className="size-4" />} title="Ethics Policy" sections={journal.ethicsPolicy} />
        <StructuredBlock id="disclosures-policy" icon={<Gavel className="size-4" />} title="Disclosures" sections={journal.disclosuresPolicy} />
        <StructuredBlock id="rights-permissions" icon={<ScrollText className="size-4" />} title="Rights & Permissions" sections={journal.rightsPermissions} />
        <StructuredBlock id="contact-info" icon={<Mail className="size-4" />} title="Contact Information" sections={journal.contactInfo} />

        {/* Articles */}
        {hasArticles && (
          <div>
            {journal.onlineFirstItems.length > 0 && (
              <ContentSection id="online-first" icon={<FileText className="size-4" />} title="Online First">
                <div className="space-y-4">
                  {journal.onlineFirstItems.map((item, index) => (
                    <ResearchCard key={item.id} item={item} index={index} />
                  ))}
                </div>
              </ContentSection>
            )}

            {journal.issues.length > 0 && (
              <ContentSection
                id="volumes-issues"
                icon={<Library className="size-4" />}
                title="Volumes & Issues"
                className={journal.onlineFirstItems.length > 0 ? "mt-10" : undefined}
              >
                <div className="space-y-8">
                  {journal.issues.map((issue) => (
                    <div key={issue.id}>
                      <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Volume {issue.volumeNumber} ({issue.volumeYear})
                        </p>
                        <h3 className="mt-1 font-serif text-xl tracking-tight text-foreground">
                          Issue {issue.issueNumber}
                          {issue.title ? ` \u2014 ${issue.title}` : ""}
                        </h3>
                        {issue.publishedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Published {new Date(issue.publishedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="space-y-4">
                        {issue.items.map((item, index) => (
                          <ResearchCard key={item.id} item={item} index={index} />
                        ))}
                        {issue.items.length === 0 && (
                          <p className="py-4 text-center text-xs text-muted-foreground">
                            No articles published in this issue yet.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ContentSection>
            )}
          </div>
        )}

        {/* For Authors */}
        <StructuredBlock id="submission-guidelines" icon={<Send className="size-4" />} title="Submission Guidelines" sections={journal.submissionGuidelines} />
        <StructuredBlock id="submission-checklist" icon={<FileText className="size-4" />} title="Submission Checklist" sections={journal.submissionChecklist} />
        <StructuredBlock id="how-to-publish" icon={<BookOpen className="size-4" />} title="How to Publish" sections={journal.howToPublish} />
        <StructuredBlock id="fees-and-funding" icon={<Wallet className="size-4" />} title="Fees & Funding" sections={journal.feesAndFunding} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: Content Section wrapper                                    */
/* ------------------------------------------------------------------ */

function ContentSection({
  id,
  icon,
  title,
  className,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-28", className)}>
      <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md bg-amber-600/10 text-amber-700 dark:text-amber-400">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: Structured JSONB block                                     */
/* ------------------------------------------------------------------ */

function StructuredBlock({
  id,
  icon,
  title,
  sections,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  sections: StructuredSection[] | null;
}) {
  if (!sections?.length) return null;

  return (
    <ContentSection id={id} icon={icon} title={title}>
      <div className="space-y-5">
        {sections.map((section, idx) => (
          <div key={idx} className="rounded-xl border border-border/60 bg-card/50 p-5">
            <h3 className="mb-2 text-sm font-semibold text-foreground">{section.heading}</h3>
            <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{section.content}</div>
          </div>
        ))}
      </div>
    </ContentSection>
  );
}
