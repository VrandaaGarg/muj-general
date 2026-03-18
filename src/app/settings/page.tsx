import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { requireAppSession } from "@/lib/auth/session";
import { SiteHeader } from "@/components/site-header";
import { SettingsSignOut } from "@/components/settings-sign-out";

export default async function SettingsPage() {
  const session = await requireAppSession("/settings");
  const { appUser } = session;

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

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Account Settings
        </h1>

        <div className="max-w-2xl space-y-8">
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
