"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Brain, Database, FileSearch, GitCompare, Layers, Search, Shield, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/LandingNavbar";
import { LandingFooter } from "@/components/LandingFooter";

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const strategies = [
  { icon: Search, title: "Basic Vector Search", description: "Dense vector similarity search over Chroma chunks. Best for general-purpose semantic retrieval.", tags: ["Semantic", "Chroma"] },
  { icon: Database, title: "Hybrid Search", description: "Combines semantic vector search with BM25 keyword search using Reciprocal Rank Fusion (k=60) with configurable weights.", tags: ["BM25", "RRF", "Weighted"] },
  { icon: Shield, title: "Hybrid + Re-Rank", description: "Retrieves top 20 hybrid candidates, then re-scores with a cross-encoder model to select the top 5 most relevant chunks.", tags: ["Cross-Encoder", "Top-5"] },
  { icon: Layers, title: "Parent-Child", description: "Retrieves small 200-token child chunks for precision, then sends their larger 1000-token parent chunks to the LLM for richer context.", tags: ["200 / 1000 tokens", "Context Expansion"] },
  { icon: Brain, title: "Multi-Query", description: "Generates 3 query variants via LLM, retrieves independently, and fuses results for broader recall on ambiguous questions.", tags: ["LLM-Generated", "Fusion"] },
  { icon: Sparkles, title: "HyDE", description: "Generates a hypothetical answer passage, then retrieves documents most similar to that passage rather than the original query.", tags: ["Hypothetical", "Passage-Based"] },
  { icon: FileSearch, title: "Query Decomposition", description: "Splits complex multi-part questions into atomic sub-queries, retrieves for each, and fuses all evidence before generation.", tags: ["Sub-Queries", "Atomic"] }
];

const chunkingStrategies = [
  { title: "Recursive Chunking", description: "500-token chunks with 50-token overlap, split at natural boundaries (paragraphs, sentences)." },
  { title: "Semantic Chunking", description: "Groups sentences while embedding similarity remains high. Starts a new chunk when similarity drops below threshold." },
  { title: "Parent-Child Chunking", description: "Creates 200-token child chunks for retrieval and 1000-token parent chunks for LLM context." },
  { title: "Section-Based Chunking", description: "Splits at H1/H2 headers, preserving section hierarchy and metadata for structured documents." }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold sm:text-5xl"
          >
            Seven Strategies. <span className="gradient-text">One Platform.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
          >
            Every retrieval approach from basic vector search to HyDE, compared objectively with built-in evaluation.
          </motion.p>
        </div>
      </section>

      {/* Retrieval Strategies */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {strategies.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  variants={fade}
                  className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.tags.map((tag) => (
                      <span key={tag} className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Chunking Strategies */}
      <section className="border-y border-border bg-card/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center text-3xl font-bold">
            Intelligent <span className="gradient-text">Chunking</span>
          </motion.h2>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="mt-12 grid gap-6 sm:grid-cols-2">
            {chunkingStrategies.map((cs) => (
              <motion.div key={cs.title} variants={fade} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-base font-semibold text-foreground">{cs.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{cs.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Evaluation */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold">
            Built-in <span className="gradient-text">Evaluation</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} viewport={{ once: true }} className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Measure every strategy with four RAGAS-inspired metrics and compare on a leaderboard.
          </motion.p>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {["Faithfulness", "Answer Relevancy", "Context Precision", "Context Recall"].map((metric) => (
              <motion.div key={metric} variants={fade} className="rounded-xl border border-border bg-card p-5">
                <BarChart3 className="mx-auto mb-3 h-8 w-8 text-primary" />
                <div className="font-semibold text-foreground">{metric}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="rounded-2xl border border-primary/20 bg-card p-12">
            <h2 className="text-2xl font-bold">Ready to try all 7 strategies?</h2>
            <div className="mt-6 flex justify-center gap-4">
              <Button asChild variant="gradient" size="lg">
                <Link href="/signup"><Zap className="h-5 w-5" /> Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">Contact Sales <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
