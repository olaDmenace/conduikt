"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-0">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      {/* Mobile-only top bar — gives users a way to open the sidebar
          since the sidebar itself is off-screen below md breakpoint. */}
      <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-subtle bg-surface-0/90 backdrop-blur px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-accent">
          Admin
        </span>
      </header>
      <main className="md:ml-[260px] px-4 md:px-6 py-6 md:py-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
