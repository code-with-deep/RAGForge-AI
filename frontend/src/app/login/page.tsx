"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { KeyRound, Loader2, Zap } from "lucide-react";
import { login } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuccessToast } from "@/components/SuccessToast";

const TOAST_DURATION = 2000;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setToken = useAppStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await login(email, password);
      setToken(response.access_token);
      setShowSuccess(true);
      const redirect = searchParams.get("redirect") || "/dashboard";
      // Redirect after toast finishes
      setTimeout(() => router.push(redirect), TOAST_DURATION);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showSuccess && (
        <SuccessToast
          title="Welcome back!"
          subtitle="Login successful — taking you to your dashboard…"
          duration={TOAST_DURATION}
        />
      )}

      <div className="flex min-h-screen">
        {/* Left branding panel */}
        <div className="hidden w-1/2 items-center justify-center bg-card lg:flex">
          <div className="max-w-md px-12">
            <div className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
              <span className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-white text-base font-bold">RF</span>
              RAGForge<span className="text-primary"> AI</span>
            </div>
            <h2 className="mt-8 text-3xl font-bold text-foreground">
              Welcome back to <span className="gradient-text">smarter retrieval</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Access your dashboard, run queries across 7 strategies, and measure quality with built-in evaluation.
            </p>
            <div className="mt-8 flex gap-4">
              {["Hybrid Search", "Reranking", "Evaluation"].map((tag) => (
                <span key={tag} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-2.5 text-xl font-bold text-foreground lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-white text-sm font-bold">RF</span>
              RAGForge<span className="text-primary"> AI</span>
            </div>

            <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">Create one</Link>
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} variant="gradient" size="lg" className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Sign In
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
