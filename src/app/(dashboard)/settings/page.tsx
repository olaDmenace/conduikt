"use client";

import { useEffect, useState } from "react";
import { User, CreditCard, Zap, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  plan: string;
  generation_count: number;
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
  { name: "Team", href: "/settings/team", icon: Users, active: false, comingSoon: true },
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
      toast("Profile updated!", "success");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to update profile", "error");
    }
    setSaving(false);
  }

  const planLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    growth: "Growth",
    agency: "Agency",
  };

  const limits: Record<string, number> = {
    free: 5,
    pro: 100,
    growth: 999999,
    agency: 999999,
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Nav */}
        <nav className="lg:col-span-1">
          <div className="space-y-1">
            {settingsNav.map((item) =>
              item.comingSoon ? (
                <span
                  key={item.name}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium text-text-tertiary/40 cursor-not-allowed"
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                  <span className="ml-auto text-[0.6rem] uppercase tracking-wider">Soon</span>
                </span>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium transition-colors ${
                    item.active
                      ? "bg-accent-muted text-accent"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            )}
          </div>
        </nav>

        {/* Profile Settings */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <Card>
              <CardContent className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 text-accent animate-spin" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="animate-in">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-h3 text-text-primary">Profile</h2>
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
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Plan & Usage */}
              <Card className="animate-in" style={{ animationDelay: "60ms" }}>
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-h3 text-text-primary">Plan & Usage</h2>
                  <div className="flex items-center justify-between rounded-lg border border-border-default p-4">
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        Current Plan
                      </p>
                      <p className="text-small text-text-secondary mt-0.5">
                        {profile?.plan === "free"
                          ? "Upgrade for more AI generations"
                          : "You have access to all features"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        profile?.plan === "free" ? "secondary" : "success"
                      }
                    >
                      {planLabels[profile?.plan || "free"]}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border-default p-4">
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        AI Generations
                      </p>
                      <p className="text-small text-text-secondary mt-0.5">
                        {profile?.generation_count ?? 0} of{" "}
                        {limits[profile?.plan || "free"]} used this period
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-h3 font-mono text-text-primary">
                        {Math.max(
                          0,
                          (limits[profile?.plan || "free"] ?? 5) -
                            (profile?.generation_count ?? 0)
                        )}
                      </p>
                      <p className="text-small text-text-tertiary">remaining</p>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex items-center justify-between text-small mb-1.5">
                      <span className="text-text-secondary">Usage</span>
                      <span className="text-text-tertiary">
                        {profile?.generation_count ?? 0}/
                        {limits[profile?.plan || "free"]}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            ((profile?.generation_count ?? 0) /
                              (limits[profile?.plan || "free"] ?? 5)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {profile?.plan === "free" && (
                    <div className="flex justify-end">
                      <Button size="sm" asChild>
                        <Link href="/settings/billing">Upgrade Plan</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card className="animate-in" style={{ animationDelay: "120ms" }}>
                <CardContent className="space-y-3 p-6">
                  <h2 className="text-h3 text-text-primary">Account</h2>
                  <div className="flex items-center justify-between text-small">
                    <span className="text-text-secondary">Member since</span>
                    <span className="text-text-primary">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-small">
                    <span className="text-text-secondary">Account ID</span>
                    <span className="text-text-tertiary font-mono text-data">
                      {profile?.id?.slice(0, 8)}...
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
