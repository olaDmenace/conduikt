"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  X as XIcon,
  Send,
  Settings as SettingsIcon,
  ListChecks,
  Pencil,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
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

  async function getItems(): Promise<QueueItem[] | null> {
    const res = await fetch("/api/automation/queue", { cache: "no-store" });
    return res.ok ? await res.json() : null;
  }

  function applyItems(data: QueueItem[] | null) {
    if (data) setItems(data);
    setLoading(false);
  }

  async function load() {
    setLoading(true);
    applyItems(await getItems());
  }

  useEffect(() => {
    // loading starts true, so the first fetch only needs to apply the result.
    getItems().then(applyItems);
  }, []);

  async function act(id: string, action: "cancel" | "publish_now") {
    const res = await fetch(`/api/automation/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast(
        action === "cancel" ? "Cancelled. It won't publish." : "Publishing in the next minute or so",
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
        title="Automation queue"
        description="Posts the Growth Plan is about to publish for you. Cancel them, or publish one now."
      >
        <Button variant="ghost" asChild>
          <Link href="/settings/automation">
            <SettingsIcon className="h-4 w-4" />
            Automation settings
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading the queue">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-line bg-surface p-4 md:p-6">
              <div className="flex gap-2">
                <Skeleton className="h-[22px] w-16" />
                <Skeleton className="h-[22px] w-20" />
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="Nothing is waiting to publish. Posts land here when you auto-run a Growth Plan step and your settings hold it for review."
          action={
            <Button asChild>
              <Link href="/settings/automation">Open automation settings</Link>
            </Button>
          }
        />
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
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.channel && (
                      <Badge variant="secondary">{item.channel}</Badge>
                    )}
                    <Badge variant="warning">{item.status}</Badge>
                    <span className="flex items-center gap-1 font-mono text-caption text-text-3">
                      <Clock className="h-3 w-3" aria-hidden />
                      Publishes {formatRelative(item.scheduled_for)}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {projectId && item.asset && (
                      <Button size="sm" variant="quiet" asChild>
                        <Link
                          href={`/projects/${projectId}/assets/${item.asset.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => act(item.id, "publish_now")}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Publish now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => act(item.id, "cancel")}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
                {item.asset?.title && (
                  <p className="mb-2 text-title text-text">
                    {item.asset.title}
                  </p>
                )}
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line bg-ground p-3 font-sans text-body text-text">
                  {text}
                </pre>
                {item.last_error && (
                  <p className="mt-2 text-caption text-danger">
                    Last error: {item.last_error}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
