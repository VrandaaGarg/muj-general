import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { DepartmentProfile } from "@/components/department-profile";
import { getDepartmentBySlug } from "@/lib/db/queries";

interface DepartmentPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DepartmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const department = await getDepartmentBySlug(slug);

  if (!department) {
    return { title: "Department Not Found — MUJ General" };
  }

  return {
    title: `${department.name} — MUJ General`,
    description: department.description
      ? department.description.length > 200
        ? department.description.slice(0, 200).trimEnd() + "…"
        : department.description
      : `Browse published research from the ${department.name} at Manipal University Jaipur.`,
  };
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  const { slug } = await params;
  const department = await getDepartmentBySlug(slug);

  if (!department) {
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
        <DepartmentProfile department={department} />
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
