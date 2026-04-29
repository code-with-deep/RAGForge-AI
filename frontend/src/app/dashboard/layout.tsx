import type { ReactNode } from "react";
import { DashboardShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
