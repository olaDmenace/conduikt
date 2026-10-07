"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, HamburgerButton } from "@/src/components/ui/icons";
import { IconButton } from "@/src/components/ui/button";
import { NotificationPanel } from "@/src/components/notifications/notification-panel";
import { useUIStore } from "@/src/stores/ui-store";
import { createClient } from "@/src/lib/supabase/client";
import { railOffset } from "@/src/components/layout/rail";
import { cn } from "@/src/lib/utils/cn";

// docs/DESIGN.md §Navigation: the header carries search (⌘K), alerts and
// the account avatar. No orange here — each page owns its one primary
// action. Adding a website lives in the rail's project switcher.
export function Header() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const openCommandPalette = useUIStore((s) => s.setCommandPaletteOpen);

  const [isMac, setIsMac] = useState(false);
  const [initials, setInitials] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setIsMac(/Mac|iPad|iPhone|iPod/.test(navigator.platform || navigator.userAgent));
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        const name: string = user.user_metadata?.full_name || user.email || "";
        setEmail(user.email ?? "");
        setInitials(
          name
            .split(/[\s@.]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("")
        );
      });
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-ground px-4 md:px-6",
        railOffset(collapsed)
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <IconButton label="Open menu" onClick={toggleMobileMenu} className="md:hidden">
          <HamburgerButton size={20} fill="currentColor" />
        </IconButton>
        <button
          type="button"
          onClick={() => openCommandPalette(true)}
          aria-label="Search projects, agents and pages"
          className="hidden h-9 w-56 items-center gap-2 rounded-md border border-line bg-surface px-3 text-left text-sm text-text-3 transition-colors duration-[var(--duration-fast)] hover:bg-surface-2 hover:text-text-2 sm:flex md:w-80"
        >
          <Search size={16} fill="currentColor" aria-hidden />
          <span className="flex-1 truncate">Search or ask an agent</span>
          <kbd className="hidden rounded-sm border border-line bg-ground px-1.5 py-0.5 font-mono text-[11px] text-text-3 md:inline">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
        <IconButton label="Search" onClick={() => openCommandPalette(true)} className="sm:hidden">
          <Search size={20} fill="currentColor" />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <NotificationPanel />
        <Link
          href="/settings"
          aria-label={email ? `Account settings for ${email}` : "Account settings"}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-ink font-mono text-xs font-medium text-ink-text"
        >
          {initials || "·"}
        </Link>
      </div>
    </header>
  );
}
