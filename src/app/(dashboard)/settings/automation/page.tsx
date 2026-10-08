"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ListChecks } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

type Mode = "off" | "review" | "auto";

interface Settings {
  x_mode: Mode;
  linkedin_mode: Mode;
  review_hold_hours: number;
}

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  off: "Opens the editor with a draft filled in. You publish it yourself.",
  review:
    "Writes the post and holds it in the queue for a while. It publishes unless you cancel it.",
  auto: "Writes the post and publishes it within about 5 minutes. No time to review.",
};

const MODE_LABEL: Record<Mode, string> = {
  off: "Off",
  review: "Review first",
  auto: "Auto",
};

export default function AutomationSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/automation/settings");
      if (res.ok) setSettings(await res.json());
      setLoading(false);
    })();
  }, []);

  async function update(partial: Partial<Settings>) {
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/automation/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      toast("Saved", "success");
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Could not save", "error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading automation settings">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <div className="max-w-2xl space-y-4 pt-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="flex flex-col items-start gap-3" role="alert">
        <p className="text-body text-danger">We couldn&apos;t load your automation settings.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Automation"
        description="Decide how much of the Growth Plan Conduikt can run on its own. You can change this any time."
      >
        <Button variant="ghost" asChild>
          <Link href="/automation/queue">
            <ListChecks className="h-4 w-4" />
            View queue
          </Link>
        </Button>
      </PageHeader>

      <div className="max-w-2xl space-y-4">
        <ChannelCard
          title="X (Twitter)"
          description="Lots of short posts, lower stakes. A good fit for Auto."
          mode={settings.x_mode}
          onChange={(mode) => update({ x_mode: mode })}
          saving={saving}
        />
        <ChannelCard
          title="LinkedIn"
          description="Your professional audience. Review first is the default so nothing off-tone slips through."
          mode={settings.linkedin_mode}
          onChange={(mode) => update({ linkedin_mode: mode })}
          saving={saving}
        />

        <Card>
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-text-3" aria-hidden />
              <h3 className="text-title text-text">
                Review window
              </h3>
            </div>
            <p className="mb-4 text-body-s text-text-2">
              How long a queued post waits before it publishes in Review first mode.
              Shorter means faster posting and less time to catch problems.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-24">
              <Input
                label="Review window in hours"
                hideLabel
                type="number"
                min={1}
                max={168}
                value={settings.review_hold_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    review_hold_hours: Number(e.target.value),
                  })
                }
                onBlur={() =>
                  update({ review_hold_hours: settings.review_hold_hours })
                }
                className="font-mono"
              />
              </div>
              <span className="text-body-s text-text-3">
                hours (1–168)
              </span>
            </div>
        </Card>

        <p className="px-1 text-caption text-text-3">
          Email broadcasts and blog posts always stay manual. They go through
          their own send steps.
        </p>
      </div>
    </div>
  );
}

function ChannelCard({
  title,
  description,
  mode,
  onChange,
  saving,
}: {
  title: string;
  description: string;
  mode: Mode;
  onChange: (m: Mode) => void;
  saving: boolean;
}) {
  return (
    <Card>
        <h3 className="mb-1 text-title text-text">{title}</h3>
        <p className="mb-4 text-body-s text-text-2">{description}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(["off", "review", "auto"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onChange(m)}
                disabled={saving}
                aria-pressed={active}
                className={`rounded-md border p-3 text-left transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:bg-ground"
                } ${saving ? "cursor-wait opacity-50" : ""}`}
              >
                <p className="mb-1 text-title text-text">
                  {MODE_LABEL[m]}
                </p>
                <p className="text-caption text-text-2">
                  {MODE_DESCRIPTIONS[m]}
                </p>
              </button>
            );
          })}
        </div>
    </Card>
  );
}
