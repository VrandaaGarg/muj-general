"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileText,
  Library,
  Search,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { SiteHeader } from "@/components/site-header";

interface Journal {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  issn: string | null;
  eissn: string | null;
  createdAt: Date;
  itemCount: number;
}

interface ResearchItem {
  id: string;
  slug: string;
  title: string;
  abstract: string | null;
  itemType: string;
  publicationYear: number | null;
  publishedAt: Date | null;
  departmentName: string | null;
  departmentSlug: string | null;
  authors: { name: string }[];
  tags: { name: string }[];
  coverImageUrl: string | null;
}

interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface HomeLandingProps {
  journals: Journal[];
  recentResearch: ResearchItem[];
  departments: Department[];
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export function HomeLanding({
  journals,
  recentResearch,
  departments,
}: HomeLandingProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const totalPublished = useMemo(
    () => journals.reduce((sum, j) => sum + j.itemCount, 0),
    [journals],
  );

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/research?query=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/research");
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader />

      <main className="relative z-10">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b border-border/60">
          {/* college background image */}
          <Image
            src="/image2.png"
            alt=""
            fill
            className="pointer-events-none object-cover"
            sizes="100vw"
            priority
          />
          {/* dark overlay — heavier on the left for text readability */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/90 to-primary/30" />
          {/* subtle top/bottom fade for edge blending */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
          {/* paper texture grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "180px 180px",
            }}
          />

          <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-12 md:py-28 lg:px-20">
            <div className="flex max-w-5xl mx-auto flex-col items-center text-left">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-4 text-sm font-semibold uppercase tracking-widest text-white"
              >
                Manipal University Jaipur
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="mb-4 text-4xl font-bold leading-tight text-center tracking-tight text-white sm:text-5xl md:text-6xl"
              >
                Institutional Research Repository
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="mb-10 max-w-2xl text-lg text-center leading-relaxed text-white/85"
              >
                Explore peer-reviewed journals, published articles, theses, and
                scholarly work from faculty and researchers across all
                departments.
              </motion.p>

              <motion.form
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
                className="w-full max-w-xl"
              >
                <div className="relative flex items-center overflow-hidden border border-white/20 bg-white/95 shadow-lg shadow-black/10 backdrop-blur-sm transition-shadow focus-within:border-white/40 focus-within:shadow-xl">
                  <Search className="pointer-events-none ml-5 size-5 shrink-0 text-muted-foreground/70" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, keyword…"
                    className="h-14 flex-1 bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="submit"
                    className="mr-1.5 flex h-10 shrink-0 items-center gap-2 bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Search
                  </button>
                </div>
              </motion.form>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        {(journals.length > 0 || departments.length > 0) && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="border-b border-border/60 bg-card"
          >
            <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-border/60 px-6 md:px-12 lg:px-20">
              <StatCell
                value={totalPublished}
                label="Published Items"
                icon={<FileText className="size-4 text-primary/70" />}
              />
              <StatCell
                value={journals.length}
                label={journals.length === 1 ? "Journal" : "Journals"}
                icon={<BookOpen className="size-4 text-primary/70" />}
              />
              <StatCell
                value={departments.length}
                label={departments.length === 1 ? "Department" : "Departments"}
                icon={<Building2 className="size-4 text-primary/70" />}
              />
            </div>
          </motion.section>
        )}

        {/* ── Quick Actions ── */}
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:px-20">
            <div className="mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Explore Our Repository
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Access open research, submit your work, and track publications
              </p>
            </div>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {[
                {
                  title: "Discover open access",
                  href: "/research",
                  image: "/image3.png",
                },
                {
                  title: "Publish with us",
                  href: "/submit",
                  image: "/image.png",
                },
                {
                  title: "Track your research",
                  href: "/my-submissions",
                  image: "/image4.png",
                },
              ].map((card) => (
                <motion.div key={card.title} variants={fadeUp}>
                  <Link
                    href={card.href}
                    className="group block overflow-hidden rounded-lg border border-border/60 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.06]"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                        {card.title}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Browse Journals ── */}
        {journals.length > 0 && (
          <section className="border-b border-border/60 bg-primary/[0.035]">
            <div className="mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-18 lg:px-20">
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                    <Library className="size-3.5" />
                    Journals
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Browse Journals
                  </h2>
                </div>
                <Link
                  href="/journals"
                  className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {journals.slice(0, 6).map((journal) => (
                  <motion.div key={journal.id} variants={fadeUp}>
                    <Link
                      href={`/journals/${journal.slug}`}
                      className="group flex h-full flex-col border border-border/60 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.06]"
                    >
                      <div className="mb-4 flex items-start gap-4">
                        {/* decorative initial */}
                        <div className="flex size-11 shrink-0 items-center justify-center bg-primary/[0.08] text-lg font-bold text-primary">
                          {journal.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {journal.name}
                          </h3>
                          {(journal.issn ?? journal.eissn) && (
                            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground/70">
                              {journal.issn
                                ? `ISSN ${journal.issn}`
                                : `eISSN ${journal.eissn}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {journal.description && (
                        <div className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground [&_p]:m-0 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                          >
                            {journal.description}
                          </ReactMarkdown>
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-4">
                        <div>
                          <p className="text-xs text-muted-foreground/70">
                            Published articles
                          </p>
                          <p className="text-base font-bold tabular-nums text-foreground">
                            {journal.itemCount}
                          </p>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* ── Recent Research ── */}
        {recentResearch.length > 0 && (
          <section className="border-b border-border/60">
            <div className="mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-18 lg:px-20">
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                    <FileText className="size-3.5" />
                    Latest
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Recent Research
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Latest published papers and articles
                  </p>
                </div>
                <Link
                  href="/research"
                  className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {recentResearch.map((item) => (
                  <motion.div key={item.id} variants={fadeUp}>
                    <Link
                      href={`/research/${item.slug}`}
                      className="group flex h-full flex-col overflow-hidden border border-border/60 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.06]"
                    >
                      {item.coverImageUrl ? (
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                          <Image
                            src={item.coverImageUrl}
                            alt={item.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-[16/9] w-full items-center justify-center bg-primary/[0.03]">
                          <FileText className="size-8 text-primary/20" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-1.5 flex items-center gap-2 text-xs">
                          <span className="font-medium capitalize text-primary">
                            {item.itemType.replace(/_/g, " ")}
                          </span>
                          {item.publicationYear && (
                            <>
                              <span className="text-border">·</span>
                              <span className="tabular-nums text-muted-foreground">
                                {item.publicationYear}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="mb-2 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                          {item.title}
                        </h3>
                        {item.authors.length > 0 && (
                          <p className="mb-1.5 truncate text-sm text-muted-foreground">
                            {item.authors.map((a) => a.name).join(", ")}
                          </p>
                        )}
                        {item.departmentName && (
                          <p className="mt-auto truncate text-xs text-muted-foreground/60">
                            {item.departmentName}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* ── Departments ── */}
        {departments.length > 0 && (
          <section className="bg-primary/[0.035]">
            <div className="mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-18 lg:px-20">
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                    <Building2 className="size-3.5" />
                    Departments
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Browse by Department
                  </h2>
                </div>
                {departments.length > 12 && (
                  <Link
                    href="/research"
                    className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    View all
                    <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {departments.slice(0, 12).map((dept) => (
                  <motion.div key={dept.id} variants={fadeUp}>
                    <Link
                      href={`/departments/${dept.slug}`}
                      className="group flex items-start gap-4 border border-border/60 bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.06]"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center bg-primary/[0.08]">
                        <Building2 className="size-4.5 text-primary/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                          {dept.name}
                        </h3>
                        {dept.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground/70">
                            {dept.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-20">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <Link href="/" className="inline-block">
                <Image
                  src="/manipal-university-jaipur-logo-01.svg"
                  alt="Manipal University Jaipur"
                  width={160}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The institutional research repository for Manipal University
                Jaipur.
              </p>
            </div>

            {/* Browse */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
                Browse
              </h4>
              <ul className="space-y-2 text-sm">
                <FooterLink href="/research">All Research</FooterLink>
                <FooterLink href="/journals">Journals</FooterLink>
                <FooterLink href="/research?itemType=thesis">
                  Theses
                </FooterLink>
              </ul>
            </div>

            {/* Publish */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
                Publish
              </h4>
              <ul className="space-y-2 text-sm">
                <FooterLink href="/submit">Submit Research</FooterLink>
                <FooterLink href="/sign-up">Create Account</FooterLink>
              </ul>
            </div>

            {/* Institution */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
                Institution
              </h4>
              <ul className="space-y-2 text-sm">
                <FooterLink
                  href="https://jaipur.manipal.edu"
                  external
                >
                  MUJ Website
                </FooterLink>
                <FooterLink
                  href="https://jaipur.manipal.edu/foe/research.html"
                  external
                >
                  Research at MUJ
                </FooterLink>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>
              © {new Date().getFullYear()} MUJ General — Manipal University
              Jaipur
            </span>
            <span className="uppercase tracking-wider opacity-60">
              Research Repository
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function StatCell({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-5">
      {icon}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {value.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
