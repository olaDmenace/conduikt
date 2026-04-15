"use client";

import { Sidebar } from "@/src/components/layout/sidebar";
import { Header } from "@/src/components/layout/header";
import { CommandPalette } from "@/src/components/search/command-palette";
import { UsageLimitProvider } from "@/src/components/usage/limit-modal";
import { useUIStore } from "@/src/stores/ui-store";
import { cn } from "@/src/lib/utils/cn";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <UsageLimitProvider>
    <div className="min-h-screen bg-surface-0">
      <Sidebar />
      <Header />
      <CommandPalette />
      <main
        className={cn(
          "transition-all duration-300 px-4 md:px-6 py-6 md:py-8",
          // No left margin on mobile; sidebar margin on desktop
          "ml-0",
          sidebarCollapsed ? "md:ml-16" : "md:ml-[260px]"
        )}
      >
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
    </UsageLimitProvider>
  );
}
