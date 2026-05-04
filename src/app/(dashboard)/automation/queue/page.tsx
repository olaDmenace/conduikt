"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Clock,
  X as XIcon,
  Send,
  Settings as SettingsIcon,
  ListChecks,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface Asset {
  id: string;
  title: string | null;
  content: { scheduled_text?: string; raw?: string } | null;
}

interface QueueItem {
  id: string;
  status: string;
  attempts: number;
  scheduled_for: string;
  last_error: string | null;
  created_at: string;
  channel: string | null;
  asset: Asset | null;
  payload?: { projectId?: string };
}

function formatRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const sign = ms < 0 ? "ago" : "from now";
  if (abs < 60_000) return `<1 min ${sign}`;
  if (abs < 3600_000) return `${Math.round(abs / 60_000)} min ${sign}`;
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)} h ${sign}`;
  return `${Math.round(abs / 86_400_000)} d ${sign}`;
}

export default function AutomationQueuePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/automation/queue", { cache: "no-store" });
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "cancel" | "publish_now") {
    const res = await fetch(`/api/automation/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast(
        action === "cancel" ? "Queued action cancelled" : "Will publish on next tick",
        "success"
      );
      await load();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Could not update", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Automation Queue"
        description="Items the Growth Playbook auto-execute is about to publish. Cancel or push them through manually here."
      >
        <Button variant="ghost" asChild>
          <Link href="/settings/automation">
            <SettingsIcon className="h-4 w-4 mr-1.5" />
            Automation settings
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ListChecks className="h-12 w-12 text-text-tertiary mb-4" />
            <h3 className="text-h3 text-text-primary">Queue is empty</h3>
            <p className="mt-2 text-body text-text-secondary max-w-md">
              Items show up here when you click "Auto-execute" on a Growth
              Playbook action and your settings include a review hold.
            </p>
            <Button asChild className="mt-6" variant="ghost">
              <Link href="/settings/automation">Open automation settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => {
            const text =
              item.asset?.content?.scheduled_text ||
              item.asset?.content?.raw ||
              "(no content)";
            const projectId = item.payload?.projectId;
            return (
              <Card
                key={item.id}
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.channel && (
                        <Badge variant="secondary">{item.channel}</Badge>
                      )}
                      <Badge variant="warning">{item.status}</Badge>
                      <span className="flex items-center gap-1 text-caption text-text-tertiary">
                        <Clock className="h-3 w-3" />
                        Publishes {formatRelative(item.scheduled_for)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {projectId && item.asset && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link
                            href={`/projects/${projectId}/assets/${item.asset.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act(item.id, "publish_now")}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Publish now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act(item.id, "cancel")}
                      >
                        <XIcon className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                  {item.asset?.title && (
                    <p className="text-small text-text-secondary mb-2">
                      {item.asset.title}
                    </p>
                  )}
                  <pre className="rounded-lg bg-surface-2 p-3 text-small font-mono text-text-primary whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {text}
                  </pre>
                  {item.last_error && (
                    <p className="text-caption text-error mt-2">
                      Last error: {item.last_error}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
