"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, ListChecks, RefreshCw } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";

// "Get mentioned" card for the Analytics page (audit §5.9 item 5). The
// places an answer engine looks before it trusts a business, as a short
// list the owner ticks off. Reads and writes /api/projects/{id}/corroboration.

interface TaskRow {
  id: string;
  platform: string;
  title: string;
  url: string;
  status: "todo" | "done" | "skipped";
  mentioned: boolean | null;
  checked_at: string | null;
  why: string | null;
}

interface TasksResponse {
  tasks: TaskRow[];
  engineAvailable: boolean;
  lastCheckedAt: string | null;
}

export function GetMentionedCard({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<TasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const base = `/api/projects/${encodeURIComponent(projectId)}/corroboration`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(base);
      const body = (await res.json().catch(() => ({}))) as TasksResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || `Could not load the list (${res.status})`);
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the list");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  async function seed() {
    setBusy("seed");
    try {
      const res = await fetch(`${base}/seed`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not build the list");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not build the list", "error");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(task: TaskRow, status: TaskRow["status"]) {
    setBusy(task.id);
    const previous = data;
    setData((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) } : prev
    );
    try {
      const res = await fetch(`${base}/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not save that");
    } catch (err) {
      setData(previous);
      toast(err instanceof Error ? err.message : "Could not save that", "error");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setBusy("check");
    try {
      const res = await fetch(`${base}/check`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; mentioned?: string[] };
      if (!res.ok) throw new Error(body.error || "The check did not run");
      const n = body.mentioned?.length ?? 0;
      toast(n === 0 ? "Checked. No listing was cited yet." : `Checked. ${n} listing${n === 1 ? "" : "s"} cited.`, "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "The check did not run", "error");
    } finally {
      setBusy(null);
    }
  }

  const heading = (
    <h3 className="flex items-center gap-2 text-title text-text">
      <ListChecks className="h-4 w-4 text-text-3" />
      Get mentioned
    </h3>
  );

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading the get mentioned list">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={<ListChecks className="h-6 w-6" />} title={`We couldn't load the list: ${error}.`} />;
  }

  if (!data || data.tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-6 w-6" />}
        title="Answer engines trust a business they can find in more than one place. Build your list of places to be listed."
        action={
          <Button size="sm" onClick={seed} disabled={busy === "seed"}>
            {busy === "seed" ? "Building…" : "Build my list"}
          </Button>
        }
      />
    );
  }

  const done = data.tasks.filter((t) => t.status === "done").length;
  const open = data.tasks.filter((t) => t.status !== "skipped").length;

  return (
    <Card className="animate-in overflow-hidden p-0 md:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:px-6">
        <div className="flex items-center gap-3">
          {heading}
          <Badge variant={done === open && open > 0 ? "success" : "secondary"}>
            {done} of {open} done
          </Badge>
        </div>
        {data.engineAvailable && (
          <Button size="sm" variant="quiet" onClick={check} disabled={busy === "check"}>
            {busy !== "check" && <RefreshCw className="h-3.5 w-3.5" />}
            {busy === "check" ? "Checking…" : "Check who mentions you"}
          </Button>
        )}
      </div>
      <p className="border-t border-line px-4 pt-3 text-caption text-text-3 md:px-6">
        Places answer engines read before they trust a business.
        {data.lastCheckedAt && <> Last checked {new Date(data.lastCheckedAt).toLocaleDateString()}.</>}
      </p>
      <ul className="mt-3 border-t border-line">
        {data.tasks.map((t) => {
          const checkboxId = `task-${t.id}`;
          const skipped = t.status === "skipped";
          return (
            <li
              key={t.id}
              className={`flex items-start gap-3 border-b border-line px-4 py-3 last:border-0 md:px-6 ${skipped ? "opacity-60" : ""}`}
            >
              <input
                id={checkboxId}
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-accent"
                checked={t.status === "done"}
                disabled={busy === t.id}
                onChange={(e) => setStatus(t, e.target.checked ? "done" : "todo")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={checkboxId} className={`text-body-s text-text ${t.status === "done" ? "line-through" : ""}`}>
                    {t.title}
                  </label>
                  {t.mentioned === true && <Badge variant="success">Cited by answer engines</Badge>}
                  {t.mentioned === false && t.checked_at && <Badge variant="secondary">Not cited yet</Badge>}
                  {skipped && <Badge variant="secondary">Skipped</Badge>}
                </div>
                {t.why && <p className="mt-0.5 text-caption text-text-3">{t.why}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" asChild>
                  <a href={t.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === t.id}
                  onClick={() => setStatus(t, skipped ? "todo" : "skipped")}
                >
                  {skipped ? "Bring back" : "Skip"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
