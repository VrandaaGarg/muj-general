import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { DepartmentContributorsList } from "@/components/department-contributors-list";
import { getDepartmentBySlug } from "@/lib/db/queries";

interface ContributorsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ContributorsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const department = await getDepartmentBySlug(slug);

  if (!department) {
    return { title: "Department Not Found — MUJ General" };
  }

  return {
    title: `Contributors — ${department.name} — MUJ General`,
    description: `Browse all contributors from the ${department.name} at Manipal University Jaipur.`,
  };
}

export default async function ContributorsPage({
  params,
}: ContributorsPageProps) {
  const { slug } = await params;
  const department = await getDepartmentBySlug(slug);

  if (!department) {
    notFound();
  }

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

      <SiteHeader />

      <main className="relative z-10 pt-4 md:pt-8">
        <DepartmentContributorsList
          department={{
            name: department.name,
            slug: department.slug,
            contributors: department.contributors,
          }}
        />
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
