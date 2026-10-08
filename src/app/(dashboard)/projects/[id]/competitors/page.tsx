"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  RefreshCw,
  Trash2,
  Globe,
  Target,
  Search,
  TrendingUp,
} from "@/src/components/ui/lucide-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button, IconButton } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";

interface Snapshot {
  id: string;
  keyword_overlap: number | null;
  content_gaps: string[] | null;
  estimated_da: number | null;
  top_keywords: string[] | null;
  created_at: string;
}

interface Tracker {
  id: string;
  competitor_url: string;
  competitor_name: string | null;
  last_checked_at: string | null;
  created_at: string;
  competitor_snapshots: Snapshot[];
}

export default function CompetitorsPage() {
  const { id } = useParams<{ id: string }>();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  async function fetchTrackers() {
    const res = await fetch(`/api/projects/${id}/competitors`);
    if (res.ok) {
      const data = await res.json();
      setTrackers(data.trackers);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTrackers();
  }, [id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch(`/api/projects/${id}/competitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitor_url: url, competitor_name: name }),
    });
    if (res.ok) {
      toast("Competitor added", "success");
      setUrl("");
      setName("");
      setShowForm(false);
      fetchTrackers();
    } else {
      const err = await res.json();
      toast(err.error || "Couldn't add that competitor. Try again.", "error");
    }
    setAdding(false);
  }

  async function handleCheck(trackerId: string) {
    setChecking(trackerId);
    const res = await fetch(
      `/api/projects/${id}/competitors/${trackerId}`,
      { method: "POST" }
    );
    if (res.ok) {
      toast("Check done", "success");
      fetchTrackers();
    } else {
      toast("The check failed. Try again.", "error");
    }
    setChecking(null);
  }

  async function handleDelete(trackerId: string) {
    const res = await fetch(`/api/projects/${id}/competitors/${trackerId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Couldn't remove that competitor. Try again.", "error");
      return;
    }
    setTrackers((prev) => prev.filter((t) => t.id !== trackerId));
    toast("Competitor removed", "success");
  }

  return (
    <div>
      <PageHeader
        title="Competitor Watch"
        description="Sees what rivals are doing, and what they cover that you don't."
      >
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add competitor
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="animate-in mb-6">
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Input
                  label="Their website"
                  type="url"
                  placeholder="https://competitor.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="w-48">
                <Input
                  label="Name (optional)"
                  placeholder="Try: Acme"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={adding}>
                {adding ? "Adding…" : "Add"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : trackers.length === 0 ? (
        <EmptyState
          className="animate-in"
          icon={<Target className="h-6 w-6" />}
          title="No competitors yet. Add one to see what they rank for on Google and what they write about."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Add competitor
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {trackers.map((tracker, i) => {
            const latest = tracker.competitor_snapshots?.[0];
            const prev = tracker.competitor_snapshots?.[1];
            const overlapDelta =
              latest && prev && latest.keyword_overlap && prev.keyword_overlap
                ? latest.keyword_overlap - prev.keyword_overlap
                : null;

            return (
              <Card
                key={tracker.id}
                className="animate-in"
                style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="h-4 w-4 shrink-0 text-text-3" />
                    <div className="min-w-0">
                      <CardTitle className="truncate">
                        {tracker.competitor_name ||
                          tracker.competitor_url.replace(/^https?:\/\//, "")}
                      </CardTitle>
                      <p className="text-caption text-text-3 truncate">
                        {tracker.competitor_url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheck(tracker.id)}
                      disabled={checking === tracker.id}
                    >
                      {checking !== tracker.id && (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {checking === tracker.id ? "Checking…" : "Check now"}
                    </Button>
                    <IconButton
                      label="Remove competitor"
                      size="sm"
                      onClick={() => handleDelete(tracker.id)}
                      className="hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </CardHeader>
                <CardContent>
                  {latest ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-label text-text-3">
                          Searches you both show up for
                        </p>
                        <p className="mt-1.5 text-numeric text-2xl text-text">
                          {latest.keyword_overlap ?? "Not measured"}
                          {overlapDelta !== null && overlapDelta !== 0 && (
                            <span
                              className={`ml-1 font-mono text-body-s ${
                                overlapDelta > 0
                                  ? "text-warning"
                                  : "text-teal"
                              }`}
                            >
                              {overlapDelta > 0 ? "+" : ""}
                              {overlapDelta}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-label text-text-3">
                          How much Google trusts them
                        </p>
                        <p className="mt-1.5 text-numeric text-2xl text-text">
                          {latest.estimated_da != null
                            ? `${latest.estimated_da} out of 100`
                            : "Not measured"}
                        </p>
                      </div>
                      <div>
                        <p className="text-label text-text-3">
                          Topics they cover, you don&apos;t
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(latest.content_gaps ?? []).slice(0, 3).map((g) => (
                            <Badge key={g} variant="secondary">
                              {g}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-label text-text-3">
                          Last checked
                        </p>
                        <p className="mt-1.5 font-mono text-body-s text-text-2">
                          {tracker.last_checked_at
                            ? new Date(
                                tracker.last_checked_at
                              ).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-body-s text-text-3">
                      <Search className="h-4 w-4" />
                      Press &ldquo;Check now&rdquo; to run the first check.
                    </div>
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
