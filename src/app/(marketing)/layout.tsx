import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { ArrowRight, Facebook, Twitter } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-0">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border-subtle bg-surface-0/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]">
              <span className="text-sm font-bold text-surface-0">C</span>
            </div>
            <span className="font-display text-lg text-text-primary">
              Conduikt
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/features"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/compare"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              vs Competitors
            </Link>
            <Link
              href="/guides"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Marketing Guides
            </Link>
            <Link
              href="/launch"
              className="text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              Product Launch
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-accent to-[#C88550]">
              <span className="text-[0.625rem] font-bold text-surface-0">C</span>
            </div>
            <span className="text-small text-text-secondary">
              Conduikt by Technicity Digital
            </span>
          </div>
          <div className="flex items-center gap-6 text-small text-text-tertiary">
            <Link href="/compare" className="hover:text-text-secondary transition-colors">
              Compare
            </Link>
            <Link href="/guides" className="hover:text-text-secondary transition-colors">
              Guides
            </Link>
            <Link href="/launch" className="hover:text-text-secondary transition-colors">
              Launch
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/conduikt"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Conduikt on X"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-border-strong transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://www.facebook.com/conduikt"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Conduikt on Facebook"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-border-strong transition-colors"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
          <div className="flex items-center gap-4 text-small text-text-tertiary">
            <Link href="/privacy" className="hover:text-text-secondary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-text-secondary transition-colors">
              Terms
            </Link>
            <Link href="/data-deletion" className="hover:text-text-secondary transition-colors">
              Data Deletion
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
