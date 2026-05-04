"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Zap, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

type Mode = "off" | "review" | "auto";

interface Settings {
  x_mode: Mode;
  linkedin_mode: Mode;
  review_hold_hours: number;
}

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  off: "Open the editor with a draft pre-filled — you publish manually.",
  review:
    "Auto-generate, drop in a queue with a hold window. Publishes unless you cancel from the queue.",
  auto: "Auto-generate and publish on the next scheduler tick (within 5 minutes). No review window.",
};

const MODE_LABEL: Record<Mode, string> = {
  off: "Off",
  review: "Review-first",
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
      toast("Updated", "success");
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Could not save", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }
  if (!settings) {
    return <p className="text-text-secondary">Could not load settings.</p>;
  }

  return (
    <div>
      <PageHeader
        title="Automation"
        description="Decide how much of the Growth Playbook the system can run on its own. You can change these any time."
      >
        <Button variant="ghost" asChild>
          <Link href="/automation/queue">
            <ListChecks className="h-4 w-4 mr-1.5" />
            View queue
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-4 max-w-2xl">
        <ChannelCard
          title="X (Twitter)"
          description="High-volume, lower-stakes channel — good fit for auto with small posts."
          mode={settings.x_mode}
          onChange={(mode) => update({ x_mode: mode })}
          saving={saving}
        />
        <ChannelCard
          title="LinkedIn"
          description="Professional surface — review-first by default so off-tone posts don't slip through."
          mode={settings.linkedin_mode}
          onChange={(mode) => update({ linkedin_mode: mode })}
          saving={saving}
        />

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-accent" />
              <h3 className="text-body font-medium text-text-primary">
                Review window
              </h3>
            </div>
            <p className="text-small text-text-secondary mb-4">
              How long queued items wait before publishing in review-first mode.
              Lower = faster turnaround, less time to catch issues.
            </p>
            <div className="flex items-center gap-3">
              <input
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
                className="w-24 rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-body text-text-primary font-mono"
              />
              <span className="text-small text-text-tertiary">
                hours (1–168)
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="text-caption text-text-tertiary px-1">
          Email broadcasts and blog posts always stay manual — they go through
          their own send flows.
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
      <CardContent className="p-5">
        <h3 className="text-body font-medium text-text-primary mb-1">{title}</h3>
        <p className="text-small text-text-secondary mb-4">{description}</p>
        <div className="grid grid-cols-3 gap-2">
          {(["off", "review", "auto"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onChange(m)}
                disabled={saving}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-accent bg-accent/5"
                    : "border-border-default hover:border-border-strong"
                } ${saving ? "opacity-50 cursor-wait" : ""}`}
              >
                <p className="text-body font-medium text-text-primary mb-1">
                  {MODE_LABEL[m]}
                </p>
                <p className="text-caption text-text-tertiary leading-relaxed">
                  {MODE_DESCRIPTIONS[m]}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
