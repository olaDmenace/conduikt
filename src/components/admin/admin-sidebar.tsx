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
} from "@/src/components/ui/lucide-icons";
import { IconButton } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/projects", icon: FolderOpen, label: "Projects" },
  { href: "/admin/generations", icon: Zap, label: "Pieces of content" },
  { href: "/admin/usage", icon: DollarSign, label: "Usage and costs" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/admin/finance", icon: Wallet, label: "Finance" },
  { href: "/admin/referrals", icon: Share2, label: "Referrals" },
  { href: "/admin/x-playbook", icon: Twitter, label: "X playbook" },
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
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        aria-label="Admin"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-line bg-ground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
          // Mobile: slide off-screen unless open. Desktop: always visible.
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
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
            <span className="border-l border-line pl-2 text-label text-accent">
              Admin
            </span>
          </Link>
          {/* Close button — only visible on mobile when the menu is open. */}
          <IconButton label="Close admin menu" onClick={onClose} className="md:hidden">
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Admin sections">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)]",
                  isActive
                    ? "bg-ink text-ink-text"
                    : "text-text-2 hover:bg-surface-2 hover:text-text"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="shrink-0 border-t border-line p-2">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-text-2 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:bg-surface-2 hover:text-text"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>Back to app</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
