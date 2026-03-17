import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { AuthorProfile } from "@/components/author-profile";
import { getAuthorById } from "@/lib/db/queries";

interface AuthorPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const { id } = await params;
  const author = await getAuthorById(id);

  if (!author) {
    return { title: "Author Not Found — MUJ General" };
  }

  return {
    title: `${author.name} — MUJ General`,
    description: author.affiliation
      ? `Research by ${author.name}, ${author.affiliation}. Browse their published work at Manipal University Jaipur.`
      : `Research by ${author.name}. Browse their published work at Manipal University Jaipur.`,
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params;
  const author = await getAuthorById(id);

  if (!author) {
    notFound();
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <SiteHeader accentColor="amber" />

      <main className="relative z-10 pt-4 md:pt-8">
        <AuthorProfile author={author} />
      </main>

      <footer className="relative z-10 border-t px-6 py-6 md:px-12 lg:px-20">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>MUJ General — Manipal University Jaipur</span>
          <span className="font-mono text-[10px] tracking-wider uppercase opacity-60">
            Research Repository
          </span>
        </div>
      </footer>
    </div>
  );
}
