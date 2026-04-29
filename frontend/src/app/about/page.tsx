"use client";

import { motion } from "framer-motion";
import { Brain, Code2, Database, Globe, Layers, Server, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/LandingNavbar";
import { LandingFooter } from "@/components/LandingFooter";

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const stack = [
  { icon: Server, name: "FastAPI", description: "High-performance async Python backend" },
  { icon: Brain, name: "LangChain LCEL", description: "Composable chains for retrieval and generation" },
  { icon: Database, name: "ChromaDB", description: "Vector store for semantic embeddings" },
  { icon: Layers, name: "BM25 + RRF", description: "Keyword search with Reciprocal Rank Fusion" },
  { icon: Code2, name: "Next.js 14", description: "React framework with App Router" },
  { icon: Globe, name: "Tailwind CSS", description: "Utility-first responsive styling" }
];

const values = [
  { title: "Accuracy First", description: "Every design decision optimizes retrieval quality. Hybrid search, reranking, and evaluation are core — not afterthoughts." },
  { title: "Full Transparency", description: "Every query produces a complete pipeline trace: transformed queries, retrieval scores, selected chunks, and the final prompt." },
  { title: "Measurable Quality", description: "Built-in evaluation with 20 Q&A pairs, four RAGAS-inspired metrics, and a strategy leaderboard. No guessing." },
  { title: "Developer Experience", description: "Clean API, typed schemas, modular architecture. Every component is reusable and extensible." }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold sm:text-5xl"
          >
            Built for <span className="gradient-text">Production RAG</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
          >
            RAGForge AI is a full-stack, production-grade Retrieval-Augmented Generation platform designed to maximize retrieval accuracy, ensure context relevance, and provide measurable evaluation.
          </motion.p>
        </div>
      </section>

      {/* Mission */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid gap-6 sm:grid-cols-2">
            {values.map((v) => (
              <motion.div key={v.title} variants={fade} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-y border-border bg-card/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-bold"
          >
            Powered by <span className="gradient-text">Modern Tech</span>
          </motion.h2>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stack.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.name} variants={fade} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{s.name}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{s.description}</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-bold"
          >
            System <span className="gradient-text">Architecture</span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 overflow-hidden rounded-xl border border-border bg-card p-8 font-mono text-sm leading-relaxed text-muted-foreground"
          >
            <pre className="whitespace-pre-wrap">
{`User Query
  → Query Transform (multi-query | HyDE | decomposition | step-back)
  → Retrieval (Chroma vector search + BM25 keyword search)
  → Reciprocal Rank Fusion (k=60, weighted)
  → Cross-Encoder Re-Ranking (top 20 → top 5)
  → Context Assembly
  → LangChain LCEL (Prompt | LLM | StrOutputParser)
  → Answer + Citations + Pipeline Trace

Documents
  → LangChain Loaders (PDF, DOCX, TXT, MD)
  → Metadata Enrichment
  → Multi-Strategy Chunking (recursive, semantic, parent-child, section)
  → Chroma Vectors + SQLite Metadata`}
            </pre>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="rounded-2xl border border-primary/20 bg-card p-12">
            <h2 className="text-2xl font-bold">Want to Contribute?</h2>
            <p className="mt-3 text-muted-foreground">RAGForge AI is open-source and community-driven.</p>
            <div className="mt-6 flex justify-center gap-4">
              <Button asChild variant="gradient" size="lg">
                <Link href="/signup"><Zap className="h-5 w-5" /> Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
