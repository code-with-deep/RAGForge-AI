"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, UserPlus, Zap } from "lucide-react";
import { signup } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuccessToast } from "@/components/SuccessToast";

const TOAST_DURATION = 2200;

export default function SignupPage() {
  const router = useRouter();
  const setToken = useAppStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending redirect if the component unmounts before the timer fires
  useEffect(() => () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); }, []);

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColors = ["", "bg-destructive", "bg-accent", "bg-primary"];
  const strengthLabels = ["", "Weak", "Good", "Strong"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await signup(email, password);
      // Auto-authenticate — no second login required
      setToken(response.access_token);
      setShowSuccess(true);
      // Redirect to dashboard after the toast finishes — stored in ref so it can be cancelled on unmount
      redirectTimer.current = setTimeout(() => router.push("/dashboard"), TOAST_DURATION);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showSuccess && (
        <SuccessToast
          title="Account created successfully!"
          subtitle="Welcome to RAGForge AI — taking you to your dashboard…"
          duration={TOAST_DURATION}
        />
      )}

      <div className="flex min-h-screen">
        {/* Left branding */}
        <div className="hidden w-1/2 items-center justify-center bg-card lg:flex">
          <div className="max-w-md px-12">
            <div className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
              <span className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-white text-base font-bold">RF</span>
              RAGForge<span className="text-primary"> AI</span>
            </div>
            <h2 className="mt-8 text-3xl font-bold text-foreground">
              Start building <span className="gradient-text">production RAG</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Create your account to upload documents, query with advanced strategies, and evaluate your retrieval pipeline.
            </p>
            <div className="mt-8 space-y-3">
              {["7 retrieval strategies", "Built-in evaluation", "Full pipeline transparency"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-2.5 text-xl font-bold text-foreground lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-white text-sm font-bold">RF</span>
              RAGForge<span className="text-primary"> AI</span>
            </div>

            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
                {password.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${strength >= level ? strengthColors[strength] : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{strengthLabels[strength]}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} variant="gradient" size="lg" className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Create Account
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

