import Link from "next/link";
import { Github, Twitter, Linkedin, Zap } from "lucide-react";

const product = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/dashboard", label: "Dashboard" }
];

const resources = [
  { href: "https://github.com", label: "GitHub" },
  { href: "/features", label: "Documentation" },
  { href: "/about", label: "API Reference" },
  { href: "/contact", label: "Support" }
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-white text-sm font-bold">
                RF
              </span>
              RAGForge<span className="text-primary"> AI</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Production-grade Advanced RAG platform for accurate, transparent, and measurable AI retrieval.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="https://github.com" className="text-muted-foreground transition-colors hover:text-foreground">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" className="text-muted-foreground transition-colors hover:text-foreground">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" className="text-muted-foreground transition-colors hover:text-foreground">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</h4>
            <ul className="space-y-3">
              {product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</h4>
            <ul className="space-y-3">
              {resources.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stay Updated</h4>
            <p className="text-sm text-muted-foreground">Get the latest updates on RAGForge AI features.</p>
            <div className="mt-4 flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
              />
              <button className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg gradient-primary text-white transition-transform hover:scale-105">
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RAGForge AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
