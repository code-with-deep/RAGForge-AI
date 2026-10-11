"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  Clock,
  Files,
  GitCompare,
  LogOut,
  Menu,
  Moon,
  Route,
  Search,
  Settings,
  Sun,
  User,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchMe } from "@/lib/api";

const sidebarNav = [
  { href: "/dashboard", label: "Query", icon: Search },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Route },
  { href: "/dashboard/compare", label: "Compare", icon: GitCompare },
  { href: "/dashboard/evaluate", label: "Evaluate", icon: BarChart3 },
  { href: "/dashboard/documents", label: "Documents", icon: Files },
  { href: "/dashboard/history", label: "History", icon: Clock },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);
  const setDocuments = useAppStore((s) => s.setDocuments);
  const setStrategies = useAppStore((s) => s.setStrategies);
  const setLatestQuery = useAppStore((s) => s.setLatestQuery);
  const setEvaluation = useAppStore((s) => s.setEvaluation);
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (token && !user) {
      fetchMe().then(setUser).catch(() => undefined);
    }
  }, [token, user, setUser]);

  function logout() {
    setToken(null);
    setUser(null);
    setDocuments([]);
    setStrategies([]);
    setLatestQuery(null);
    setEvaluation(null);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-200 ease-out",
          sidebarOpen ? "w-[248px]" : "w-[68px]",
          "hidden lg:flex"
        )}
      >
        {/* Logo */}
        <div className="flex h-[68px] items-center gap-3 border-b border-border px-4">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md gradient-primary text-white text-[11px] font-bold tracking-tight">
            RF
          </span>
          {sidebarOpen && (
              <span className="text-[15px] font-semibold tracking-tight text-foreground whitespace-nowrap">
              RAGForge<span className="ml-1 font-normal text-muted-foreground">workspace</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-6">
          {sidebarOpen && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground/75">Workspace</p>}
          <div className="space-y-1">
            {sidebarNav.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors duration-150",
                    active
                      ? "bg-primary/[.09] text-primary before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:rounded-full before:bg-primary"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-1">
          <button
            onClick={toggleDarkMode}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 flex-shrink-0" /> : <Moon className="h-4.5 w-4.5 flex-shrink-0" />}
            {sidebarOpen && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={toggleSidebar}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className={cn("h-4.5 w-4.5 flex-shrink-0 transition-transform", !sidebarOpen && "rotate-180")} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(280px,calc(100vw-1.5rem))] border-r border-border bg-card animate-slide-down">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                RAGForge<span className="ml-1 font-normal text-muted-foreground">workspace</span>
              </span>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {sidebarNav.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className={cn("flex flex-1 flex-col transition-all duration-200", sidebarOpen ? "lg:pl-[248px]" : "lg:pl-[68px]")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b border-border bg-background/95 px-4 lg:px-8">
          <button aria-label="Open navigation menu" className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Dark mode toggle (mobile) */}
          <button
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleDarkMode}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user?.email ?? "User"}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground">
                  {user.email.split("@")[1]}
                </p>
              )}
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 px-3 py-6 sm:px-5 lg:px-9 lg:py-9">
          <div className="mx-auto max-w-[1360px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
