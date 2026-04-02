"use client";

import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-0">
      <AdminSidebar />
      <main className="ml-[260px] px-6 py-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
