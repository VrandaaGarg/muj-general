import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  PenTool,
  Shield,
} from "lucide-react";

import { requireAppSession } from "@/lib/auth/session";
import { getLatestEditorAccessRequestForUser } from "@/lib/db/queries";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { EditorAccessRequestCard } from "@/components/editor-access-request-card";
import { SiteHeader } from "@/components/site-header";

const ROLE_META: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Shield }
> = {
  admin: {
    label: "Administrator",
    color: "text-rose-600",
    bgColor: "bg-rose-600/10",
    icon: Shield,
  },
  editor: {
    label: "Editor",
    color: "text-violet-600",
    bgColor: "bg-violet-600/10",
    icon: PenTool,
  },
  reader: {
    label: "Reader",
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    icon: BookOpen,
  },
};

export default async function DashboardPage() {
  const session = await requireAppSession("/dashboard");
  const { appUser } = session;

  const roleMeta = ROLE_META[appUser.role] ?? ROLE_META.reader;
  const RoleIcon = roleMeta.icon;

  const firstName = appUser.name.split(" ")[0];

  const quickLinks: Array<{
    href: string;
    label: string;
    description: string;
    icon: typeof FileText;
    roles: string[];
  }> = [
    {
      href: "/editor",
      label: "Editor Panel",
      description: "Review and manage submissions",
      icon: PenTool,
      roles: ["editor", "admin"],
    },
    {
      href: "/admin",
      label: "Admin Panel",
      description: "Users, departments & settings",
      icon: Shield,
      roles: ["admin"],
    },
  ];

  const visibleLinks = quickLinks.filter((link) =>
    link.roles.includes(appUser.role)
  );

  const latestRequest =
    appUser.role === "reader"
      ? await getLatestEditorAccessRequestForUser(appUser.id)
      : null;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle dot pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      />

      <SiteHeader accentColor="amber" role={appUser.role} />

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-24 md:px-12 md:pt-16">
        {/* Welcome section */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${roleMeta.bgColor}`}
            >
              <RoleIcon className={`size-4 ${roleMeta.color}`} />
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleMeta.bgColor} ${roleMeta.color}`}
            >
              {roleMeta.label}
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {appUser.email}
          </p>
        </div>

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Department card */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Building2 className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appUser.departmentName ? (
                <p className="text-sm font-medium">{appUser.departmentName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not assigned to a department
                </p>
              )}
            </CardContent>
          </Card>

          {/* Account card */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <GraduationCap className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{appUser.name}</p>
                <p className="text-xs text-muted-foreground">
                  {appUser.emailVerified
                    ? "Email verified"
                    : "Email not verified"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick links for elevated roles */}
        {visibleLinks.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
              Quick access
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-amber-600/20 hover:bg-amber-600/[0.02]"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-amber-600/10">
                    <link.icon className="size-4 text-muted-foreground transition-colors group-hover:text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold tracking-tight">
                      {link.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Editor access request section (readers only) */}
        {appUser.role === "reader" && (
          <div className="mt-8">
            <Suspense
              fallback={
                <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
              }
            >
              <EditorAccessRequestCard
                requestStatus={latestRequest?.status ?? null}
                requestMessage={latestRequest?.message ?? null}
                rejectionReason={latestRequest?.rejectionReason ?? null}
                requestCreatedAt={
                  latestRequest?.createdAt
                    ? latestRequest.createdAt.toISOString()
                    : null
                }
                reviewedAt={
                  latestRequest?.reviewedAt
                    ? latestRequest.reviewedAt.toISOString()
                    : null
                }
                emailVerified={appUser.emailVerified}
              />
            </Suspense>
          </div>
        )}

        {/* Browse research CTA */}
        <div className="mt-8 rounded-xl border border-border/60 bg-card/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-600/10">
              <FileText className="size-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold tracking-tight">
                Research Repository
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Explore published research, theses, and academic work from
                across MUJ departments.
              </p>
              <Link
                href="/"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-3",
                })}
              >
                Browse research
                <ArrowRight data-icon="inline-end" className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
