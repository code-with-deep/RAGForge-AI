"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        latestQuery: state.latestQuery,
        evaluation: state.evaluation,
        sidebarOpen: state.sidebarOpen,
        darkMode: state.darkMode
      })
    }
  )
);
