"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/theme/theme-toggle";

// Sticky marketing nav per DESIGN_SYSTEM.md spec:
//   - 72px tall (h-18 ≈ 72px; Tailwind doesn't have h-18 natively so we
//     use h-[72px]).
//   - backdrop-filter: blur(16px) over a translucent surface.
//   - Border-bottom only appears after scrollY > 8.
//   - Items in this exact order: Features, Pricing, vs Competitors, Blog,
//     Guides, Product Launch.
//   - Theme toggle as a 40px circular button to the LEFT of "Sign in".
//   - Right-side actions: Sign in (ghost), Get Started (primary).

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "vs Competitors" },
  { href: "/blog", label: "Blog" },
  { href: "/guides", label: "Guides" },
  { href: "/launch", label: "Product Launch" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A nav link is active when the current pathname starts with its
  // href (so /blog/[slug] keeps "Blog" active, /pricing keeps "Pricing"
  // active, etc.). Home (/) only matches exactly.
  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-colors duration-200 ${
        scrolled ? "border-b border-border-default" : "border-b border-transparent"
      }`}
      style={{
        // Tailwind v4 doesn't ship a backdrop-blur-16 utility by default;
        // inline style keeps the spec value exact regardless of how the
        // theme tokens evolve.
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        // ~78% surface-0 so background bleeds through (per spec).
        background:
          "color-mix(in srgb, var(--surface-0) 78%, transparent)",
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center"
          aria-label="Conduikt home"
        >
          <Image
            src="/conduikt-horizontal.png"
            alt="Conduikt"
            width={192}
            height={48}
            priority
            className="h-12 w-auto"
          />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative text-small transition-colors duration-[var(--duration-base)] ${
                  active
                    ? "text-accent font-medium"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
                {/* Underline tick for the active link — sits a bit
                    below the text so it reads as "you are here"
                    without taking the visual weight of a full pill. */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-0 right-0 mx-auto h-0.5 w-6 rounded-full bg-accent"
                  />
                )}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
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
  );
}
