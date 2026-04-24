"use client";

import { useAppStore } from "@/store/useAppStore";
import { Moon, Sun, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";

export default function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Profile</PanelTitle>
        </PanelHeader>
        <div className="flex items-start gap-6">
          <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <User className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</div>
              <div className="mt-0.5 text-sm text-foreground">{user?.email ?? "Not logged in"}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">User ID</div>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">{user?.id ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Member since</div>
              <div className="mt-0.5 text-sm text-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
              </div>
            </div>
            <Badge tone="default">Pro Plan</Badge>
          </div>
        </div>
      </Panel>

      {/* Appearance */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Appearance</PanelTitle>
        </PanelHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Dark Mode</div>
            <div className="text-xs text-muted-foreground">Toggle between light and dark theme</div>
          </div>
          <Button variant="outline" size="sm" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-4 w-4 mr-1" /> : <Moon className="h-4 w-4 mr-1" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </Panel>

      {/* API Configuration */}
      <Panel>
        <PanelHeader>
          <PanelTitle>API Configuration</PanelTitle>
        </PanelHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div>
              <div className="text-sm font-medium text-foreground">Backend URL</div>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}</div>
            </div>
            <Badge tone="good">Connected</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div>
              <div className="text-sm font-medium text-foreground">Authentication</div>
              <div className="mt-0.5 text-xs text-muted-foreground">JWT Bearer Token</div>
            </div>
            <Badge tone={user ? "good" : "bad"}>{user ? "Active" : "Inactive"}</Badge>
          </div>
        </div>
      </Panel>
    </div>
  );
}
