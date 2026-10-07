"use client";

import { Sidebar } from "@/src/components/layout/sidebar";
import { Header } from "@/src/components/layout/header";
import { CommandPalette } from "@/src/components/search/command-palette";
import { AgentPicker } from "@/src/components/agents/agent-picker";
import { UsageLimitProvider } from "@/src/components/usage/limit-modal";
import { SessionGuard } from "@/src/components/auth/session-guard";
import { ToastProvider } from "@/src/components/ui/toast";
import { useUIStore } from "@/src/stores/ui-store";
import { cn } from "@/src/lib/utils/cn";
import { railOffset } from "@/src/components/layout/rail";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <ToastProvider>
      <UsageLimitProvider>
        <SessionGuard />
        <div className="min-h-screen bg-ground">
          <Sidebar />
          <Header />
          <CommandPalette />
          <AgentPicker />
          <main
            id="main"
            className={cn(
              "px-4 py-6 transition-[margin] duration-[var(--duration-base)] md:px-6 md:py-8",
              railOffset(collapsed)
            )}
          >
            <div className="mx-auto max-w-[1200px]">{children}</div>
          </main>
        </div>
      </UsageLimitProvider>
    </ToastProvider>
  );
}
