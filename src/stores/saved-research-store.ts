"use client";

import { create } from "zustand";

const STORAGE_KEY = "muj-saved-research";

export interface SavedResearchItem {
  id: string;
  slug: string;
  title: string;
  itemType: string;
  publicationYear: number;
  departmentName: string | null;
  authors: string[];
  coverImageUrl: string | null;
  savedAt: number;
}

interface SavedResearchState {
  items: SavedResearchItem[];
  hydrated: boolean;
}

interface SavedResearchActions {
  hydrate: () => void;
  save: (item: Omit<SavedResearchItem, "savedAt">) => void;
  unsave: (id: string) => void;
  toggle: (item: Omit<SavedResearchItem, "savedAt">) => void;
  clearAll: () => void;
  isSaved: (id: string) => boolean;
}

type SavedResearchStore = SavedResearchState & SavedResearchActions;

function readFromStorage(): SavedResearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedResearchItem[];
  } catch {
    return [];
  }
}

function writeToStorage(items: SavedResearchItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota or private browsing
  }
}

export const useSavedResearchStore = create<SavedResearchStore>()((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const stored = readFromStorage();
    set({ items: stored, hydrated: true });

    // sync across tabs
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        set({ items: readFromStorage() });
      }
    }
    window.addEventListener("storage", handleStorage);
  },

  save: (item) => {
    const { items } = get();
    if (items.some((existing) => existing.id === item.id)) return;
    const next = [{ ...item, savedAt: Date.now() }, ...items];
    set({ items: next });
    writeToStorage(next);
  },

  unsave: (id) => {
    const next = get().items.filter((item) => item.id !== id);
    set({ items: next });
    writeToStorage(next);
  },

  toggle: (item) => {
    if (get().isSaved(item.id)) {
      get().unsave(item.id);
    } else {
      get().save(item);
    }
  },

  clearAll: () => {
    set({ items: [] });
    writeToStorage([]);
  },

  isSaved: (id) => get().items.some((item) => item.id === id),
}));
