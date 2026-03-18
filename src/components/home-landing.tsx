"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  Search,
} from "lucide-react";
import { useState, type FormEvent } from "react";

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

const quickLinks = [
  { label: "Search Journals", href: "/journals" },
  { label: "Research Papers", href: "/research" },
  { label: "Publish with us", href: "/editor" },
] as const;

export function HomeLanding({ journals, recentResearch, departments }: HomeLandingProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

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

      {/* Secondary Nav Bar */}
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 md:px-12 lg:px-20">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="relative shrink-0 py-3 text-md font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform hover:after:scale-x-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="relative z-10">
        {/* Hero Section with Search */}
        <section className="border-b border-border/60 bg-background">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24 lg:px-20">
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Image
                  src="/manipal-university-jaipur-logo-01.svg"
                  alt="Manipal University Jaipur"
                  width={280}
                  height={56}
                  className="mx-auto mb-8 h-14 w-auto md:h-16"
                  priority
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"
              >
                Research Repository
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="mb-8 max-w-xl text-lg text-muted-foreground"
              >
                Search for articles, journals, theses, and authors
              </motion.p>

              <motion.form
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex w-full max-w-2xl items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, keyword..."
                    className="h-12 w-full rounded-lg border border-border bg-card pl-12 pr-4 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  className="flex h-12 shrink-0 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Search
                </button>
              </motion.form>
            </div>
          </div>
        </section>

        {/* Browse Journals */}
        {journals.length > 0 && (
          <section className="border-b border-border/60 bg-primary/10">
            <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:px-20">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Browse Journals
                </h2>
                <Link
                  href="/journals"
                  className="flex items-center gap-1 text-md font-medium text-primary transition-colors hover:text-primary/80"
                >
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {journals.slice(0, 6).map((journal) => (
                  <Link
                    key={journal.id}
                    href={`/journals/${journal.slug}`}
                    className="group flex flex-col rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/25 hover:shadow-sm"
                  >
                    <span className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                      Journal
                    </span>
                    <h3 className="mb-2 text-lg font-bold leading-snug tracking-tight text-foreground">
                      {journal.name}
                    </h3>
                    {journal.description && (
                      <p className="mb-4 line-clamp-3 flex-1 text-md leading-relaxed text-muted-foreground">
                        {journal.description}
                      </p>
                    )}
                    <div className="mt-auto border-t border-border/40 pt-4">
                      <p className="text-xs text-muted-foreground">
                        Published articles
                      </p>
                      <p className="text-base font-bold text-foreground">
                        {journal.itemCount}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent Research */}
        {recentResearch.length > 0 && (
          <section className="border-b border-border/60">
            <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:px-20">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Recent Research
                  </h2>
                  <p className="mt-1 text-md text-muted-foreground">
                    Latest published papers and articles
                  </p>
                </div>
                <Link
                  href="/research"
                  className="flex items-center gap-1 text-md font-medium text-primary transition-colors hover:text-primary/80"
                >
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentResearch.map((item) => (
                  <Link
                    key={item.id}
                    href={`/research/${item.slug}`}
                    className="group overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-primary/25 hover:bg-primary/[0.02]"
                  >
                    {item.coverImageUrl ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                        <Image
                          src={item.coverImageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted/50">
                        <FileText className="size-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className=" text-xs font-medium text-primary capitalize">
                          {item.itemType.replace(/_/g, " ")}
                        </span>
                        {item.publicationYear && (
                          <span className="text-xs text-muted-foreground">
                            {item.publicationYear}
                          </span>
                        )}
                      </div>
                      <h3 className="mb-2 line-clamp-2 group-hover:underline text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      {item.authors.length > 0 && (
                        <p className="mb-2 truncate text-md text-muted-foreground">
                          {item.authors.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      {item.departmentName && (
                        <p className="truncate text-xs text-muted-foreground/70">
                          {item.departmentName}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Browse by Department */}
        {departments.length > 0 && (
          <section className="bg-primary/10">
            <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:px-20  ">
              <h2 className="mb-1 text-3xl font-bold tracking-tight text-foreground">
                Browse by Department
              </h2>
              <div className="mb-6 border-b border-border/60" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {departments.slice(0, 12).map((dept) => (
                  <Link
                    key={dept.id}
                    href={`/departments/${dept.slug}`}
                    className="border-b border-border/40 px-1 py-4 text-[15px] font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary/60"
                  >
                    {dept.name}
                  </Link>
                ))}
              </div>
              {departments.length > 12 && (
                <div className="mt-6">
                  <Link
                    href="/research"
                    className="flex items-center gap-1 text-md font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    View all departments
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 px-6 py-6 md:px-12 lg:px-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-md text-muted-foreground sm:flex-row">
          <span>MUJ General — Manipal University Jaipur</span>
          <span className="text-xs tracking-wider uppercase opacity-60">
            Research Repository
          </span>
        </div>
      </footer>
    </div>
  );
}
