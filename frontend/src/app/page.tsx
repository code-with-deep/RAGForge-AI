"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Database,
  FileSearch,
  GitCompare,
  Layers,
  Search,
  Shield,
  Sparkles,
  Upload,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/LandingNavbar";
import { LandingFooter } from "@/components/LandingFooter";

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const features = [
  { icon: Search, title: "Hybrid Search", description: "Combines semantic vector embeddings with BM25 keyword search using Reciprocal Rank Fusion for maximum recall." },
  { icon: Layers, title: "Smart Chunking", description: "Four chunking strategies — recursive, semantic, parent-child, and section-based — each optimized for different document types." },
  { icon: Brain, title: "Query Intelligence", description: "Multi-query expansion, HyDE, query decomposition, and step-back prompting for complex question handling." },
  { icon: Shield, title: "Cross-Encoder Reranking", description: "Top 20 candidates re-scored by a cross-encoder model to select the 5 most relevant chunks for generation." },
  { icon: BarChart3, title: "Measurable Evaluation", description: "Built-in evaluation with faithfulness, relevancy, precision, and recall metrics across all 7 strategies." },
  { icon: GitCompare, title: "A/B Comparison", description: "Side-by-side strategy comparison with diff viewer, overlap analysis, and metric benchmarks." }
];

const steps = [
  { icon: Upload, title: "Upload", description: "Drop your PDF, DOCX, TXT, or Markdown files" },
  { icon: Database, title: "Index", description: "Multi-strategy chunking + vector embedding" },
  { icon: FileSearch, title: "Retrieve", description: "Hybrid search + reranking finds the best context" },
  { icon: Sparkles, title: "Answer", description: "LLM generates grounded, cited answers" }
];

const testimonials = [
  { name: "Dr. Sarah Chen", role: "ML Research Lead", company: "TechCorp AI", quote: "RAGForge's hybrid search cut our hallucination rate by 60%. The evaluation dashboard made it measurable." },
  { name: "Raj Patel", role: "Senior Engineer", company: "DataFlow Inc.", quote: "The parent-child chunking strategy alone justified the switch. Context quality improved dramatically." },
  { name: "Emily Zhang", role: "Product Manager", company: "NeuraTech", quote: "Finally a RAG platform that lets us compare strategies objectively. The leaderboard is a game-changer." }
];

const stats = [
  { value: "7", label: "Retrieval Strategies" },
  { value: "4", label: "Chunking Modes" },
  { value: "20+", label: "Eval Questions" },
  { value: "<3s", label: "Avg. Latency" }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-secondary/5 blur-[120px]" />
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mx-auto max-w-5xl px-6 text-center"
        >
          <motion.div variants={fade} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Production-Grade RAG Platform
          </motion.div>

          <motion.h1
            variants={fade}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Retrieval That&apos;s{" "}
            <span className="gradient-text">Accurate,</span>
            <br />
            <span className="gradient-text">Transparent,</span> and{" "}
            <span className="gradient-text">Measurable</span>
          </motion.h1>

          <motion.p
            variants={fade}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            RAGForge AI combines hybrid search, cross-encoder reranking, and advanced query
            transformations to deliver enterprise-grade retrieval-augmented generation — with built-in
            evaluation to prove it works.
          </motion.p>

          <motion.div variants={fade} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild variant="gradient" size="lg">
              <Link href="/signup">
                <Zap className="h-5 w-5" />
                Get Started Free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/features">
                Explore Features
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats bar ──────────────────────────────── */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-3xl font-extrabold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features grid ──────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2 variants={fade} className="text-3xl font-bold sm:text-4xl">
              Everything You Need for{" "}
              <span className="gradient-text">Advanced RAG</span>
            </motion.h2>
            <motion.p variants={fade} className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Seven retrieval strategies, four chunking modes, and built-in evaluation — all in one platform.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fade}
                  className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────── */}
      <section className="border-y border-border bg-card/30 py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2 variants={fade} className="text-3xl font-bold sm:text-4xl">
              How <span className="gradient-text">RAGForge</span> Works
            </motion.h2>
            <motion.p variants={fade} className="mx-auto mt-4 max-w-xl text-muted-foreground">
              From document upload to grounded answers in four simple steps.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.title} variants={fade} className="relative text-center">
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card text-primary">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Step {i + 1}</div>
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-bold sm:text-4xl"
          >
            Trusted by <span className="gradient-text">AI Engineers</span>
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-16 grid gap-6 md:grid-cols-3"
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={fade}
                className="rounded-xl border border-border bg-card p-6"
              >
                <p className="text-sm leading-relaxed text-muted-foreground italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}, {t.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-primary/20 bg-card p-12"
          >
            <h2 className="text-3xl font-bold">
              Ready to Build <span className="gradient-text">Better RAG?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Start with hybrid search, measure with built-in evaluation, and iterate with confidence.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild variant="gradient" size="lg">
                <Link href="/signup">
                  <Zap className="h-5 w-5" />
                  Start Building Free
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">
                  Contact Us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
