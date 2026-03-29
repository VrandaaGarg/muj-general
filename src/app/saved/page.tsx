import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { SavedItemsList } from "@/components/saved-items-list";

export const metadata: Metadata = {
  title: "Saved Research - MUJ General",
  description: "Your locally saved research articles and manuscripts.",
};

export default function SavedPage() {
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

      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-24 md:px-12 md:pt-12 lg:px-20">
        <SavedItemsList />
      </main>
    </div>
  );
}
