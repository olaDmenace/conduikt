"use client";

import Image from "next/image";
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
  DollarSign,
  Share2,
  Wallet,
  Twitter,
  X,
} from "lucide-react";
import { cn } from "@/src/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/projects", icon: FolderOpen, label: "Projects" },
  { href: "/admin/generations", icon: Zap, label: "Generations" },
  { href: "/admin/usage", icon: DollarSign, label: "Usage & Costs" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/admin/finance", icon: Wallet, label: "Finance" },
  { href: "/admin/referrals", icon: Share2, label: "Referrals" },
  { href: "/admin/x-playbook", icon: Twitter, label: "X Playbook" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ mobileOpen, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop — taps close the menu. Hidden on desktop. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-border-default bg-surface-0 transition-transform duration-300",
          // Mobile: slide off-screen unless open. Desktop: always visible.
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4 shrink-0">
          <Link
            href="/admin"
            className="flex items-center gap-2"
            onClick={onClose}
          >
            <Image
              src="/conduikt-horizontal.png"
              alt="Conduikt"
              width={176}
              height={40}
              priority
              className="h-10 w-auto"
            />
            <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-accent border-l border-border-subtle pl-2">
              Admin
            </span>
          </Link>
          {/* Close button — only visible on mobile when the menu is open. */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors md:hidden"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
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
                onClick={onClose}
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
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
            <span>Back to app</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
