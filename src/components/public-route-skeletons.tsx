import { SiteHeader } from "@/components/site-header";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/60 ${className}`} />;
}

export function ResearchPageSkeleton() {
  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-20 md:px-12 md:pt-12 lg:px-20">
        <div className="mb-4 flex items-center gap-2">
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-3 w-3 rounded-full" />
          <SkeletonBlock className="h-4 w-16" />
        </div>

        <div className="mb-6 max-w-2xl space-y-3">
          <SkeletonBlock className="h-10 w-72" />
          <SkeletonBlock className="h-4 w-full max-w-xl" />
          <SkeletonBlock className="h-4 w-5/6 max-w-lg" />
        </div>

        <SkeletonBlock className="h-12 w-full" />

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64 xl:w-72">
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <SkeletonBlock className="h-5 w-24" />
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((__, itemIndex) => (
                      <SkeletonBlock key={itemIndex} className="h-5 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <SkeletonBlock className="mb-4 h-5 w-48" />
            <div className="grid gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <SkeletonBlock className="h-36 w-full sm:w-40" />
                    <div className="flex-1 space-y-3">
                      <SkeletonBlock className="h-6 w-3/4" />
                      <SkeletonBlock className="h-4 w-1/3" />
                      <SkeletonBlock className="h-4 w-full" />
                      <SkeletonBlock className="h-4 w-11/12" />
                      <SkeletonBlock className="h-4 w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-9 w-9" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ResearchDetailSkeleton() {
  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader />

      <main className="relative z-10 pt-4 md:pt-8">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-12 lg:px-20">
          <div className="mb-6 flex items-center gap-2">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-3 w-3 rounded-full" />
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-3 w-3 rounded-full" />
            <SkeletonBlock className="h-4 w-40" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row">
              <SkeletonBlock className="h-80 w-full lg:w-72" />
              <div className="flex-1 space-y-4">
                <SkeletonBlock className="h-5 w-24" />
                <SkeletonBlock className="h-12 w-5/6" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-7 w-24 rounded-full" />
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-4/5" />
                </div>
                <div className="grid gap-3 pt-4 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <SkeletonBlock className="h-7 w-40" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
                  <SkeletonBlock className="h-32 w-full" />
                  <SkeletonBlock className="h-5 w-3/4" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function JournalsPageSkeleton() {
  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-8 md:px-12 lg:px-20">
        <div className="mb-6 flex items-center gap-2">
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-3 w-3 rounded-full" />
          <SkeletonBlock className="h-4 w-16" />
        </div>

        <div className="mb-10 space-y-3">
          <SkeletonBlock className="h-10 w-40" />
          <SkeletonBlock className="h-4 w-full max-w-2xl" />
          <SkeletonBlock className="h-4 w-5/6 max-w-xl" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-4">
              <SkeletonBlock className="h-40 w-full" />
              <SkeletonBlock className="h-7 w-2/3" />
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-11/12" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function JournalDetailSkeleton() {
  return (
    <div className="relative min-h-screen bg-background">
      <SiteHeader />

      <main className="relative z-10 pb-20 pt-4">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
          <div className="mb-6 flex items-center gap-2">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-3 w-3 rounded-full" />
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-3 w-3 rounded-full" />
            <SkeletonBlock className="h-4 w-40" />
          </div>

          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8 lg:gap-10">
            <SkeletonBlock className="aspect-[4/5] w-full sm:w-44 lg:w-48 xl:w-52" />

            <div className="min-w-0 flex-1 space-y-4">
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="h-12 w-5/6" />
              <SkeletonBlock className="h-10 w-48" />
              <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="h-5 w-36" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sticky top-0 mb-8 border-y border-border/60 bg-background/90 py-3 backdrop-blur-sm">
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-9 w-36" />
              ))}
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-4">
              <SkeletonBlock className="h-8 w-48" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>

            <div className="space-y-4">
              <SkeletonBlock className="h-8 w-56" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
                    <SkeletonBlock className="h-32 w-full" />
                    <SkeletonBlock className="h-5 w-3/4" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
