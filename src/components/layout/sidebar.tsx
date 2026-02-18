"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/src/lib/utils/cn";
import { useUIStore } from "@/src/stores/ui-store";
import { createClient } from "@/src/lib/supabase/client";
import { useToast } from "@/src/components/ui/toast";

const navigation = [
  {
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Projects", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { name: "Playground", href: "/playground", icon: Sparkles },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Integrations", href: "/settings/integrations", icon: Zap, comingSoon: true },
    ],
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } =
    useUIStore();
  const supabase = createClient();
  const { toast } = useToast();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast("Signed out successfully.", "info");
    setMobileMenuOpen(false);
    router.push("/login");
    router.refresh();
  }

  function handleNavClick() {
    // Close mobile menu on navigation
    setMobileMenuOpen(false);
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border-default bg-surface-0 transition-all duration-300",
          // Mobile: off-screen by default, slide in when open
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          // Desktop: collapse width
          sidebarCollapsed ? "md:w-16" : "md:w-[260px]",
          // Mobile: always full sidebar width
          "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4">
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              onClick={handleNavClick}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]">
                <span className="text-sm font-bold text-surface-0">C</span>
              </div>
              <span className="font-display text-lg text-text-primary">
                Conduikt
              </span>
            </Link>
          )}
          {sidebarCollapsed && !mobileMenuOpen && (
            <Link
              href="/dashboard"
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]"
            >
              <span className="text-sm font-bold text-surface-0">C</span>
            </Link>
          )}
          {/* Mobile close button */}
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navigation.map((section) => (
            <div key={section.label} className="mb-6">
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <p className="text-caption mb-2 px-3 text-text-tertiary">
                  {section.label}
                </p>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isComingSoon = "comingSoon" in item && item.comingSoon;
                  const isActive =
                    !isComingSoon &&
                    (pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href)));
                  const showLabel = !sidebarCollapsed || mobileMenuOpen;

                  if (isComingSoon) {
                    return (
                      <li key={item.name}>
                        <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium text-text-tertiary/50 cursor-not-allowed">
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {showLabel && (
                            <>
                              <span>{item.name}</span>
                              <span className="ml-auto text-[0.625rem] uppercase tracking-wider opacity-60">
                                Soon
                              </span>
                            </>
                          )}
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium transition-all duration-150",
                          isActive
                            ? "border-l-2 border-accent bg-accent-muted text-accent"
                            : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {showLabel && <span>{item.name}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom: Logout + Collapse */}
        <div className="border-t border-border-subtle p-3 space-y-1">
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium text-text-secondary hover:bg-error/10 hover:text-error transition-colors",
              sidebarCollapsed && !mobileMenuOpen && "justify-center"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {(!sidebarCollapsed || mobileMenuOpen) && <span>Sign out</span>}
          </button>
          {/* Desktop-only collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex w-full items-center justify-center rounded-lg p-2 text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
