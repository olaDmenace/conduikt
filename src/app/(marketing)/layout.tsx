import Image from "next/image";
import Link from "next/link";
import { Facebook, Twitter } from "lucide-react";
import { MarketingNav } from "@/src/components/marketing/marketing-nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-0">
      <MarketingNav />

      {/* Content — top padding matches the nav height (72px per spec). */}
      <main className="pt-[72px]">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-6 sm:gap-4 lg:flex-row lg:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/conduikt-horizontal.png"
              alt="Conduikt"
              width={144}
              height={36}
              className="h-9 w-auto opacity-90"
            />
            <span className="text-small text-text-tertiary">
              by Technicity Digital
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-small text-text-tertiary">
            <Link href="/compare" className="hover:text-text-secondary transition-colors">
              Compare
            </Link>
            <Link href="/blog" className="hover:text-text-secondary transition-colors">
              Blog
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
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-small text-text-tertiary">
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
