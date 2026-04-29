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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);
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
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-[260px]" : "w-[68px]",
          "hidden lg:flex"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg gradient-primary text-white text-sm font-bold">
            RF
          </span>
          {sidebarOpen && (
            <span className="text-base font-bold text-foreground whitespace-nowrap">
              RAGForge<span className="text-primary"> AI</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary glow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        <div className="border-t border-border p-3 space-y-2">
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
          <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-border bg-card animate-slide-down">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-base font-bold text-foreground">
                RAGForge<span className="text-primary"> AI</span>
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
      <div className={cn("flex flex-1 flex-col transition-all duration-300", sidebarOpen ? "lg:pl-[260px]" : "lg:pl-[68px]")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-lg px-4 lg:px-6">
          <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Dark mode toggle (mobile) */}
          <button
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
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
