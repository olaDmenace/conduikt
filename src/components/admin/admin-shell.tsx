"use client";

import { useState } from "react";
import { Menu } from "@/src/components/ui/lucide-icons";
import { IconButton } from "@/src/components/ui/button";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ground">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      {/* Mobile-only top bar — gives users a way to open the sidebar
          since the sidebar itself is off-screen below md breakpoint. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-ground px-4 md:hidden">
        <IconButton label="Open admin menu" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </IconButton>
        <span className="text-label text-accent">
          Admin
        </span>
      </header>
      <main className="px-4 py-6 md:ml-[260px] md:px-6 md:py-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
