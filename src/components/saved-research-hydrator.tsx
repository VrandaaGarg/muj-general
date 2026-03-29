"use client";

import { useEffect } from "react";

import { useSavedResearchStore } from "@/stores/saved-research-store";

/**
 * Hydrates the saved-research Zustand store from localStorage on mount.
 * Place this once in the app layout (inside the client boundary).
 * The store starts empty during SSR to avoid hydration mismatches,
 * then loads saved items client-side.
 */
export function SavedResearchHydrator() {
  const hydrate = useSavedResearchStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
