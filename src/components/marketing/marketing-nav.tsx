"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/theme/theme-toggle";

// Sticky marketing nav per DESIGN_SYSTEM.md spec:
//   - 72px tall.
//   - backdrop-filter: blur(16px) over a translucent surface.
//   - Border-bottom only appears after scrollY > 8.
//   - Items in this exact order: Features, Pricing, vs Competitors, Blog,
//     Guides, Product Launch.
//   - Theme toggle as a 40px circular button.
//   - Right-side actions: Sign in (ghost), Get Started (primary).
//
// Mobile (<md): nav links collapse behind a hamburger that opens a
// full-screen drawer with the same links + theme toggle + CTAs.

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't move during an in-drawer touch scroll.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close on Escape so keyboard users can dismiss without hunting for
  // the X button.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <nav
        className={`fixed top-0 z-50 w-full transition-colors duration-200 ${
          scrolled ? "border-b border-border-default" : "border-b border-transparent"
        }`}
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background:
            "color-mix(in srgb, var(--surface-0) 78%, transparent)",
        }}
      >
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center shrink-0"
            aria-label="Conduikt home"
          >
            <Image
              src="/conduikt-horizontal.png"
              alt="Conduikt"
              width={192}
              height={48}
              priority
              className="h-10 w-auto sm:h-12"
            />
          </Link>
          {/* Desktop nav links */}
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
          {/* Desktop right-side actions */}
          <div className="hidden items-center gap-3 md:flex">
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
          {/* Mobile-only: theme toggle + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((p) => !p)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-1 text-text-secondary hover:border-accent/40 hover:text-accent transition-colors"
            >
              {mobileOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer. Sits below the nav (top-[72px]) and fills the
          rest of the viewport. Slides in via opacity + translate so
          there's no hard pop. Background uses surface-0 (opaque) so
          underlying content stays visually quiet behind it. */}
      <div
        id="mobile-nav-drawer"
        className={`fixed inset-x-0 top-[72px] bottom-0 z-40 md:hidden bg-surface-0 transition-all duration-300 ease-[var(--ease-out-soft)] ${
          mobileOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex flex-col h-full px-6 pt-8 pb-10 overflow-y-auto">
          <div className="flex flex-col gap-1 mb-8">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 text-body font-medium transition-colors ${
                    active
                      ? "bg-accent-muted text-accent"
                      : "text-text-primary hover:bg-surface-2"
                  }`}
                >
                  <span>{link.label}</span>
                  {active && (
                    <span className="h-2 w-2 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-border-subtle">
            <Button variant="secondary" size="lg" asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="lg" asChild className="w-full">
              <Link href="/signup">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
