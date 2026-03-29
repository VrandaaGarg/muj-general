import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileSearch,
  Inbox,
} from "lucide-react";

import { requireAppSession } from "@/lib/auth/session";
import { listPendingSubmitterConfirmations } from "@/lib/db/queries";
import { getTypeLabel, getTypeColor } from "@/lib/research-types";
import { SiteHeader } from "@/components/site-header";
import { SettingsSignOut } from "@/components/settings-sign-out";

interface SettingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const session = await requireAppSession("/settings");
  const { appUser } = session;

  const [pendingConfirmations, resolvedParams] = await Promise.all([
    listPendingSubmitterConfirmations(appUser.id),
    searchParams,
  ]);

  const confirmationUpdated = resolvedParams.confirmation === "updated";

  const roleMeta: Record<string, { label: string; color: string }> = {
    admin: { label: "Administrator", color: "text-primary" },
    editor: { label: "Editor", color: "text-primary" },
    reader: { label: "Reader", color: "text-muted-foreground" },
  };

  const role = roleMeta[appUser.role] ?? roleMeta.reader;

  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader role={appUser.role} />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24 md:px-12 md:pt-12 lg:px-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-primary underline-offset-2 transition-colors hover:underline hover:text-primary/80">
            Home
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Settings</span>
        </nav>

        {/* Success banner */}
        {confirmationUpdated && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-600/20 bg-emerald-600/5 px-4 py-3">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-700">
              Your publication confirmation response has been recorded.
            </p>
          </div>
        )}

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Account Settings
        </h1>

        <div className="max-w-2xl space-y-8">
          {/* Pending confirmations */}
          <section className="rounded-xl border border-border/60 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
              <ClipboardCheck className="size-5" />
              Pending Confirmations
            </h2>

            {pendingConfirmations.length > 0 ? (
              <div className="space-y-3">
                {pendingConfirmations.map((item) => (
                  <Link
                    key={item.id}
                    href={`/submissions/confirm/${item.id}`}
                    className="group block rounded-lg border border-border/60 p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getTypeColor(item.itemType)}`}
                      >
                        {getTypeLabel(item.itemType)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.publicationYear}
                      </span>
                      {item.submitterConfirmationRequestedAt && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-2.5" />
                          Requested{" "}
                          {formatDate(item.submitterConfirmationRequestedAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    {item.submitterConfirmationNote && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.submitterConfirmationNote}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Inbox className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No pending publication confirmations.
                </p>
              </div>
            )}
          </section>

          {/* Profile info */}
          <section className="rounded-xl border border-border/60 p-6">
            <h2 className="mb-4 text-lg font-bold text-primary">Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Full name
                </p>
                <p className="mt-1 text-base text-foreground">{appUser.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </p>
                <p className="mt-1 text-base text-foreground">{appUser.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </p>
                <p className={`mt-1 text-base font-medium ${role.color}`}>
                  {role.label}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email status
                </p>
                <p className="mt-1 text-base text-foreground">
                  {appUser.emailVerified ? "Verified" : "Not verified"}
                </p>
              </div>
            </div>
          </section>

          {/* Department */}
          <section className="rounded-xl border border-border/60 p-6">
            <h2 className="mb-4 text-lg font-bold text-primary">Department</h2>
            {appUser.departmentName ? (
              <p className="text-base text-foreground">{appUser.departmentName}</p>
            ) : (
              <p className="text-base text-muted-foreground">
                Not assigned to a department
              </p>
            )}
          </section>

          {/* Peer Reviews */}
          <section className="rounded-xl border border-border/60 p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-primary">
              <FileSearch className="size-5" />
              Peer Reviews
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              View and manage your peer review invitations and submitted reviews.
            </p>
            <Link
              href="/reviews"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Go to Peer Reviews
              <ChevronRight className="size-3.5" />
            </Link>
          </section>

          {/* Password */}
          <section className="rounded-xl border border-border/60 p-6">
            <h2 className="mb-2 text-lg font-bold text-primary">Password</h2>
            <p className="text-sm text-muted-foreground">
              Password update is coming soon.
            </p>
          </section>

          {/* Sign out */}
          <section className="rounded-xl border border-border/60 p-6">
            <h2 className="mb-2 text-lg font-bold text-primary">Sign out</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Sign out of your MUJ General account on this device.
            </p>
            <SettingsSignOut />
          </section>
        </div>
      </main>
    </div>
  );
}
