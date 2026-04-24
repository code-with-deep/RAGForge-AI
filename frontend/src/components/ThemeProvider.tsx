"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/** Syncs the `dark` class on <html> from Zustand persisted state. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useAppStore((s) => s.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  return <>{children}</>;
}
