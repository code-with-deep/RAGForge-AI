"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BatchEvaluationResponse, DocumentOut, QueryResponse, StrategyInfo, UserOut } from "@/lib/types";

type AppState = {
  token: string | null;
  user: UserOut | null;
  strategies: StrategyInfo[];
  documents: DocumentOut[];
  latestQuery: QueryResponse | null;
  evaluation: BatchEvaluationResponse | null;
  sidebarOpen: boolean;
  darkMode: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: UserOut | null) => void;
  setStrategies: (strategies: StrategyInfo[]) => void;
  setDocuments: (documents: DocumentOut[]) => void;
  setLatestQuery: (query: QueryResponse | null) => void;
  setEvaluation: (evaluation: BatchEvaluationResponse | null) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
};

// localStorage can be full, blocked or absent (private mode, SSR); persistence is best-effort.
const safeStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* quota exceeded or unavailable — skip */
    }
  },
  removeItem: (name: string) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  }
}));

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      strategies: [],
      documents: [],
      latestQuery: null,
      evaluation: null,
      sidebarOpen: true,
      darkMode: true,
      setToken: (token) => {
        if (typeof window !== "undefined") {
          if (token) window.localStorage.setItem("ragforge-token", token);
          else window.localStorage.removeItem("ragforge-token");
        }
        set({ token });
      },
      setUser: (user) => set({ user }),
      setStrategies: (strategies) => set({ strategies }),
      setDocuments: (documents) => set({ documents }),
      setLatestQuery: (latestQuery) => set({ latestQuery }),
      setEvaluation: (evaluation) => set({ evaluation }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode }))
    }),
    {
      name: "ragforge-store",
      storage: safeStorage,
      partialize: (state) => ({
        user: state.user,
        // Drop the bulky candidate list; the selected chunks are what the UI shows.
        latestQuery: state.latestQuery ? { ...state.latestQuery, retrieved_chunks: [] } : null,
        // Keep the leaderboard but not every per-question run.
        evaluation: state.evaluation ? { ...state.evaluation, results: state.evaluation.results.slice(0, 40) } : null,
        sidebarOpen: state.sidebarOpen,
        darkMode: state.darkMode
      })
    }
  )
);
