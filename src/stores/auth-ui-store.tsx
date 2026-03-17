"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from "react";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";

type AuthUiState = {
  isAuthDialogOpen: boolean;
  pendingVerificationEmail: string | null;
};

type AuthUiActions = {
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  setPendingVerificationEmail: (email: string | null) => void;
};

type AuthUiStore = AuthUiState & AuthUiActions;

function createAuthUiStore() {
  return createStore<AuthUiStore>()((set) => ({
    isAuthDialogOpen: false,
    pendingVerificationEmail: null,
    openAuthDialog: () => set({ isAuthDialogOpen: true }),
    closeAuthDialog: () => set({ isAuthDialogOpen: false }),
    setPendingVerificationEmail: (email) =>
      set({ pendingVerificationEmail: email }),
  }));
}

const AuthUiStoreContext = createContext<StoreApi<AuthUiStore> | null>(null);

export function AuthUiStoreProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createAuthUiStore());

  return (
    <AuthUiStoreContext.Provider value={store}>{children}</AuthUiStoreContext.Provider>
  );
}

export function useAuthUiStore<T>(selector: (state: AuthUiStore) => T) {
  const store = useContext(AuthUiStoreContext);

  if (!store) {
    throw new Error("useAuthUiStore must be used within AuthUiStoreProvider.");
  }

  return useStore(store, selector);
}
