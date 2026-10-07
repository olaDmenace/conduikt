"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HamburgerButton, Close } from "@/src/components/ui/icons";
import { Button, IconButton } from "@/src/components/ui/button";

// docs/DESIGN.md §Marketing site structure · band 0. One nav component on
// every marketing page (Compare included). Sand ground, six links, Sign
// in (outline) and Start free (primary). Under 1000px the links move into
// a sheet; both buttons stay visible down to 375px.
const LINKS = [
  { href: "/#loop", label: "How it works" },
  { href: "/#agents", label: "What it does" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#stories", label: "Customers" },
  { href: "/#faq", label: "Questions" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-ground">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-6 px-4 md:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Conduikt home">
          <Image src="/conduikt-icon.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="font-display text-lg font-medium tracking-tight text-text">Conduikt</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 min-[1000px]:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-text-2 transition-colors duration-[var(--duration-fast)] hover:text-text"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-[38px] px-4 text-sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="h-[38px] px-4 text-sm">
            <Link href="/signup">Start free</Link>
          </Button>
          <IconButton
            label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="marketing-sheet"
            onClick={() => setOpen((v) => !v)}
            className="min-[1000px]:hidden"
          >
            {open ? <Close size={20} fill="currentColor" /> : <HamburgerButton size={20} fill="currentColor" />}
          </IconButton>
        </div>
      </div>

      {open && (
        <nav
          id="marketing-sheet"
          aria-label="Primary"
          className="border-t border-line bg-ground px-4 pb-6 pt-2 min-[1000px]:hidden"
        >
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center border-b border-line text-base text-text"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
