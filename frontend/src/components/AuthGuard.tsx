"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

/**
 * Wraps dashboard pages. Redirects to /login if no token is found.
 *
 * Single loading gate: we show the spinner until the Zustand store has
 * hydrated AND we know whether a token exists. This prevents the brief
 * double-spinner that occurred when both states rendered in sequence.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token);
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, token, router, pathname]);

  // Single unified loading state — covers both pre-hydration and unauthenticated phases.
  if (!hydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {!hydrated ? "Loading..." : "Redirecting to login..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
