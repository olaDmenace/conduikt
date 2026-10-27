"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  CreditCard,
  Zap,
  Users,
  Mail,
  Palette,
  Bot,
  Webhook,
  Megaphone,
} from "@/src/components/ui/lucide-icons";
import { cn } from "@/src/lib/utils/cn";

// One list of settings tabs for every page under /settings (and the
// marketing kit at /share). Pages used to carry their own copy and drifted
// apart; this is the only place to add or rename a tab.
export const SETTINGS_TABS = [
  { name: "Profile", href: "/settings", icon: User },
  { name: "Billing", href: "/settings/billing", icon: CreditCard },
  { name: "Connected accounts", href: "/settings/integrations", icon: Zap },
  { name: "Team", href: "/settings/team", icon: Users },
  { name: "Sending domain", href: "/settings/email-domain", icon: Mail },
  { name: "Brand kit", href: "/settings/brand", icon: Palette },
  { name: "Automation", href: "/settings/automation", icon: Bot },
  { name: "Webhooks", href: "/settings/integrations/webhooks", icon: Webhook },
  { name: "Marketing kit", href: "/share", icon: Megaphone },
] as const;

/** The tab whose href is the longest prefix of the path (so /settings/integrations/webhooks picks Webhooks, not Connected accounts). */
export function activeSettingsTab(pathname: string): string | null {
  let best: { href: string } | null = null;
  for (const tab of SETTINGS_TABS) {
    const hit = pathname === tab.href || pathname.startsWith(tab.href + "/");
    if (hit && (!best || tab.href.length > best.href.length)) best = tab;
  }
  return best?.href ?? null;
}

export function SettingsTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = activeSettingsTab(pathname ?? "");

  return (
    <nav aria-label="Settings" className={cn("mb-8 -mx-1 overflow-x-auto px-1", className)}>
      <div className="flex gap-1">
        {SETTINGS_TABS.map((tab) => {
          const current = tab.href === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)]",
                current ? "bg-ink text-ink-text" : "text-text-2 hover:bg-surface-2 hover:text-text"
              )}
            >
              <tab.icon className="h-4 w-4" aria-hidden />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
