"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HamburgerButton, Close } from "@/src/components/ui/icons";
import { Button, IconButton } from "@/src/components/ui/button";

// docs/DESIGN.md §Marketing site structure · band 0. One nav on every
// marketing page. At ≥1000px: links inline, Sign in + Start free on the
// right. Below that the links (and, on phones, both buttons) live in a
// full-screen sheet whose items animate in, staggered.
const LINKS = [
  { href: "/#loop", label: "How it works" },
  { href: "/#agents", label: "What it does" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#stories", label: "Customers" },
  { href: "/#faq", label: "Questions" },
];

const CLOSE_MS = 200;

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      toggleRef.current?.focus();
    }, CLOSE_MS);
  }, [open, closing]);

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
    setClosing(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onResize = () => window.innerWidth >= 1000 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-ground">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-6 px-4 md:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Conduikt home">
          <Image src="/conduikt-icon.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="font-display text-lg font-medium tracking-tight text-text">Conduikt</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 rail:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover-link text-sm text-text-2 hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* On phones these move into the menu sheet. */}
          <Button variant="outline" size="sm" asChild className="hidden h-[38px] px-4 text-sm md:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="hidden h-[38px] px-4 text-sm md:inline-flex">
            <Link href="/signup">Start free</Link>
          </Button>
          <IconButton
            ref={toggleRef}
            label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="marketing-sheet"
            onClick={() => (open ? close() : setOpen(true))}
            className="rail:hidden"
          >
            {open && !closing ? <Close size={22} fill="currentColor" /> : <HamburgerButton size={22} fill="currentColor" />}
          </IconButton>
        </div>
      </div>

      {open && (
        <div
          id="marketing-sheet"
          data-hide-chat
          data-state={closing ? "closing" : "open"}
          className="menu-sheet fixed inset-x-0 bottom-0 top-[72px] z-40 flex flex-col overflow-y-auto bg-ground px-4 pb-8 pt-4 md:px-10 rail:hidden"
        >
          <nav aria-label="Primary" className="flex-1">
            <ul className="flex flex-col">
              {LINKS.map((l, i) => (
                <li
                  key={l.href}
                  className="menu-item-left border-b border-line"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Link
                    href={l.href}
                    onClick={close}
                    className="hover-link flex h-16 items-center justify-between font-display text-2xl font-light tracking-tight text-text hover:text-accent-hover"
                  >
                    {l.label}
                    <span aria-hidden className="text-xl text-text-3">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 flex flex-col gap-3 md:hidden">
            <div className="menu-item-up" style={{ "--i": LINKS.length } as React.CSSProperties}>
              <Button size="lg" asChild className="w-full">
                <Link href="/signup" onClick={close}>Start free</Link>
              </Button>
            </div>
            <div className="menu-item-up" style={{ "--i": LINKS.length + 1 } as React.CSSProperties}>
              <Button variant="outline" size="lg" asChild className="w-full">
                <Link href="/login" onClick={close}>Sign in</Link>
              </Button>
            </div>
            <p
              className="menu-item-up text-center text-caption text-text-3"
              style={{ "--i": LINKS.length + 2 } as React.CSSProperties}
            >
              No card needed · Set up in 2 minutes
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
