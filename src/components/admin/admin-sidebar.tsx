"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Zap,
  CreditCard,
  Settings,
  ArrowLeft,
  Shield,
  DollarSign,
} from "lucide-react";
import { cn } from "@/src/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/projects", icon: FolderOpen, label: "Projects" },
  { href: "/admin/generations", icon: Zap, label: "Generations" },
  { href: "/admin/usage", icon: DollarSign, label: "Usage & Costs" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-border-default bg-surface-0">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border-subtle px-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]">
          <Shield className="h-4 w-4 text-surface-0" />
        </div>
        <div>
          <span className="font-display text-lg text-text-primary">Admin</span>
          <span className="ml-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-accent">
            Panel
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium transition-all duration-150",
                isActive
                  ? "border-l-2 border-accent bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="border-t border-border-subtle p-3 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
          <span>Back to app</span>
        </Link>
      </div>
    </aside>
  );
}
