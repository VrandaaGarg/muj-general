import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { requireAppSession } from "@/lib/auth/session";
import { listResearchItemsForSubmitter } from "@/lib/db/queries";
import { getPublicFileUrl } from "@/lib/storage/r2";
import { SiteHeader } from "@/components/site-header";
import { MySubmissionsList } from "@/components/my-submissions-list";

export default async function MySubmissionsPage() {
  const session = await requireAppSession("/my-submissions");

  const items = await listResearchItemsForSubmitter(session.appUser.id);
  const resolvedItems = items.map((item) => ({
    ...item,
    coverImageUrl: item.coverImageObjectKey
      ? getPublicFileUrl(item.coverImageObjectKey)
      : null,
  }));

  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader role={session.appUser.role} />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-8 md:px-12 md:pt-12 lg:px-20">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            href="/settings"
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
          >
            Settings
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">My Submissions</span>
        </nav>

        <div className="mb-8">
          {/* <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <FileText className="size-3.5" />
            Submission Tracker
          </div> */}
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            My Submissions
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Track manuscripts and research items you submitted, including their
            current workflow status.
          </p>
        </div>

        <MySubmissionsList items={resolvedItems} />
      </main>
    </div>
  );
}
