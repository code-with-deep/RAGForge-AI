"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Mail, MessageSquare, Send, Twitter } from "lucide-react";
import { submitContact } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LandingNavbar } from "@/components/LandingNavbar";
import { LandingFooter } from "@/components/LandingFooter";

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const faqs = [
  { q: "Is RAGForge AI free to use?", a: "Yes, the core platform is free. Upload your documents, query with any strategy, and evaluate results at no cost." },
  { q: "What file types are supported?", a: "PDF (.pdf), Markdown (.md), and plain text (.txt) files. We handle text extraction, metadata enrichment, and multi-strategy chunking automatically." },
  { q: "Which LLM providers work?", a: "Groq (default), OpenAI, and Google Gemini. You can also run fully offline with the fallback generator for testing." },
  { q: "How is evaluation calculated?", a: "We use four RAGAS-inspired metrics: faithfulness, answer relevancy, context precision, and context recall. Each strategy is scored and ranked on a leaderboard." }
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState("We'll get back to you within 24 hours.");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await submitContact({ name, email, subject, message });
      setDetail(response.detail || "We'll get back to you within 24 hours.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      <section className="pt-32 pb-20 lg:pt-40">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-extrabold sm:text-5xl">
              Get in <span className="gradient-text">Touch</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Have questions, feedback, or want to collaborate? We&apos;d love to hear from you.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_400px]">
            <motion.div initial="hidden" animate="show" variants={fade}>
              {sent ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-card p-12 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">Message Sent!</h3>
                  <p className="mt-2 text-muted-foreground">{detail}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="Your name"
                        required
                        minLength={2}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="How can we help?"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Tell us more..."
                      className="min-h-[140px]"
                      required
                      minLength={10}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </div>
                  {error ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}
                  <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                    <Send className="h-4 w-4" />
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              )}
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fade}
              className="space-y-6"
            >
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email</h3>
                <a href="mailto:hello@ragforge.ai" className="mt-2 flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                  hello@ragforge.ai
                </a>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Socials</h3>
                <div className="mt-3 flex gap-4">
                  <a href="https://github.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Github className="h-5 w-5" />
                  </a>
                  <a href="https://twitter.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a href="https://linkedin.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">FAQ</h3>
                <div className="mt-4 space-y-4">
                  {faqs.map((faq) => (
                    <details key={faq.q} className="group">
                      <summary className="cursor-pointer text-sm font-medium text-foreground">{faq.q}</summary>
                      <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
