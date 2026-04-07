"use client";

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
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search projects, campaigns..."
            className="w-48 md:w-80 rounded-lg border border-border-default bg-surface-1 py-2 pl-10 pr-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
          />
        </div>
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
