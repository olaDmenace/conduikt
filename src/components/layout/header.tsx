"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Menu } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "@/src/components/ui/theme-toggle";
import { NotificationPanel } from "@/src/components/notifications/notification-panel";
import { useUIStore } from "@/src/stores/ui-store";
import { cn } from "@/src/lib/utils/cn";

export function Header() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const openCommandPalette = useUIStore((s) => s.setCommandPaletteOpen);

  // Detect mac vs non-mac for the correct modifier glyph. Runs client-only.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPad|iPhone|iPod/.test(navigator.platform || navigator.userAgent)
    );
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-surface-0/80 backdrop-blur-md px-4 md:px-6 transition-all duration-300",
        // No left margin on mobile; sidebar margin on desktop
        "ml-0",
        sidebarCollapsed ? "md:ml-16" : "md:ml-[260px]"
      )}
    >
      {/* Left: Hamburger (mobile) + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => openCommandPalette(true)}
          className="group relative hidden sm:flex items-center gap-2 w-48 md:w-80 rounded-lg border border-border-default bg-surface-1 py-2 pl-3 pr-2 text-left text-[0.875rem] text-text-tertiary transition-colors hover:border-border-strong hover:text-text-secondary focus-visible:border-accent focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-glow)]"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            Search projects, agents, pages...
          </span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 shrink-0 rounded border border-border-default bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-mono text-text-tertiary group-hover:text-text-secondary">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="primary" size="sm" className="hidden sm:inline-flex" asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">New Project</span>
          </Link>
        </Button>
        <Button variant="primary" size="sm" className="sm:hidden" asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <NotificationPanel />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-[0.75rem] font-medium text-text-secondary">
          OA
        </div>
      </div>
    </header>
  );
}
