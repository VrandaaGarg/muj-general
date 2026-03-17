import { Suspense } from "react";
import { BookCheck, ClipboardList, PenTool } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import {
  listDepartments,
  listResearchItemsForEditor,
} from "@/lib/db/queries";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { EditorSubmissionForm } from "@/components/editor-submission-form";
import { EditorSubmissionsList } from "@/components/editor-submissions-list";

export default async function EditorPage() {
  const session = await requireRole(["editor", "admin"], {
    returnTo: "/editor",
  });
  const { appUser } = session;

  const [departments, submittedItems] = await Promise.all([
    listDepartments(),
    listResearchItemsForEditor(appUser.id),
  ]);

  const pendingCount = submittedItems.filter(
    (i) => i.status === "submitted",
  ).length;
  const publishedCount = submittedItems.filter(
    (i) => i.status === "published",
  ).length;

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

      <SiteHeader accentColor="violet" role={appUser.role} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-24 md:px-12 md:pt-16">
        {/* Title section */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600/10">
              <PenTool className="size-4 text-violet-600" />
            </div>
            <span className="rounded-full bg-violet-600/10 px-2.5 py-0.5 text-xs font-medium text-violet-600">
              Editor Panel
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            Editor workspace
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Submit research, track review status, and manage your items. Signed
            in as{" "}
            <span className="font-medium text-foreground">{appUser.name}</span>.
          </p>
        </div>

        {/* Stats cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <ClipboardList className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Pending Reviews
              </CardTitle>
              <CardDescription>
                Submissions awaiting admin review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {pendingCount}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <BookCheck className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Published Items
              </CardTitle>
              <CardDescription>
                Approved and publicly visible research
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {publishedCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Submission form */}
        <div className="mb-10">
          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
            }
          >
            <EditorSubmissionForm departments={departments} />
          </Suspense>
        </div>

        {/* Submissions list */}
        <Suspense
          fallback={
            <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
          }
        >
          <EditorSubmissionsList items={submittedItems} />
        </Suspense>
      </main>
    </div>
  );
}
