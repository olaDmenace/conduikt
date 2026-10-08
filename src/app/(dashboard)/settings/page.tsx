"use client";

import { useEffect, useState } from "react";
import { User, CreditCard, Zap, Users, Webhook, Palette, Mail, Bot } from "@/src/components/ui/lucide-icons";
import Link from "next/link";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";
import { GENERATION_LIMITS, normalizePlan, isUnlimited } from "@/src/lib/plans";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  plan: string;
  generation_count: number;
  generation_reset_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

const settingsNav = [
  { name: "Profile", href: "/settings", icon: User, active: true },
  {
    name: "Billing",
    href: "/settings/billing",
    icon: CreditCard,
    active: false,
  },
  {
    name: "Integrations",
    href: "/settings/integrations",
    icon: Zap,
    active: false,
  },
  { name: "Team", href: "/settings/team", icon: Users, active: false },
  {
    name: "Sending domain",
    href: "/settings/email-domain",
    icon: Mail,
    active: false,
  },
  {
    name: "Brand kit",
    href: "/settings/brand",
    icon: Palette,
    active: false,
  },
  {
    name: "Automation",
    href: "/settings/automation",
    icon: Bot,
    active: false,
  },
  {
    name: "Webhooks",
    href: "/settings/integrations/webhooks",
    icon: Webhook,
    active: false,
  },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFullName(data.full_name || "");
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast("Name cannot be empty.", "warning");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });

    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      toast("Profile updated", "success");
    } else {
      const err = await res.json();
      toast(err.error || "We couldn't update your profile. Try again.", "error");
    }
    setSaving(false);
  }

  const planLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    growth: "Growth",
    agency: "Agency",
  };

  const tier = normalizePlan(profile?.plan);
  const limit = GENERATION_LIMITS[tier];
  const unlimited = isUnlimited(limit);

  return (
    <div>
      <PageHeader title="Settings" description="Your profile, plan and account." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Settings nav */}
        <nav className="lg:col-span-1" aria-label="Settings">
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {settingsNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                  item.active
                    ? "bg-ink text-ink-text"
                    : "text-text-2 hover:bg-surface-2 hover:text-text"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Profile settings */}
        <div className="space-y-6 lg:col-span-3">
          {loading ? (
            <div className="space-y-6" role="status" aria-label="Loading your settings">
              <div className="space-y-4 rounded-lg border border-line bg-surface p-4 md:p-6">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-4 rounded-lg border border-line bg-surface p-4 md:p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : (
            <>
              <Card className="animate-in space-y-4">
                <h2 className="text-heading text-text">Profile</h2>
                <form onSubmit={handleSave} className="space-y-4">
                  <Input
                    label="Full name"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Plan & usage */}
              <Card className="animate-in space-y-4" style={{ animationDelay: "60ms" }}>
                <h2 className="text-heading text-text">Plan and usage</h2>
                <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-ground p-4">
                  <div>
                    <p className="text-title text-text">
                      Current plan
                    </p>
                    <p className="mt-0.5 text-body-s text-text-2">
                      {profile?.plan === "free"
                        ? "Upgrade for more pieces of content each month"
                        : "You have access to all features"}
                    </p>
                  </div>
                  <Badge variant={tier}>
                    {planLabels[profile?.plan || "free"]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-ground p-4">
                  <div>
                    <p className="text-title text-text">
                      Pieces of content
                    </p>
                    <p className="mt-0.5 text-body-s text-text-2">
                      {unlimited
                        ? `${profile?.generation_count ?? 0} used this period`
                        : `${profile?.generation_count ?? 0} of ${limit} used this period`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-numeric text-[32px] text-text">
                      {unlimited ? "∞" : Math.max(0, limit - (profile?.generation_count ?? 0))}
                    </p>
                    <p className="mt-1 text-label text-text-3">left</p>
                  </div>
                </div>

                {/* Usage bar */}
                {!unlimited && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-label text-text-3">Usage</span>
                      <span className="font-mono text-caption text-text-3">
                        {profile?.generation_count ?? 0}/{limit}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-teal transition-[width] duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            ((profile?.generation_count ?? 0) / limit) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {profile?.plan === "free" && (
                  <div className="flex justify-end">
                    <Button asChild>
                      <Link href="/settings/billing">Upgrade plan</Link>
                    </Button>
                  </div>
                )}
              </Card>

              {/* Account info */}
              <Card className="animate-in space-y-3" style={{ animationDelay: "120ms" }}>
                <h2 className="text-heading text-text">Account</h2>
                <div className="flex items-center justify-between border-t border-line pt-3 text-body-s">
                  <span className="text-text-2">Member since</span>
                  <span className="text-text">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "Not available"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-3 text-body-s">
                  <span className="text-text-2">Account ID</span>
                  <span className="font-mono text-body-s text-text-3">
                    {profile?.id?.slice(0, 8)}...
                  </span>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
