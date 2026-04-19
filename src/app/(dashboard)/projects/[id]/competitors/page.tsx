"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Globe,
  Target,
  Search,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
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
      toast("Competitor added!", "success");
      setUrl("");
      setName("");
      setShowForm(false);
      fetchTrackers();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to add", "error");
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
      toast("Analysis complete!", "success");
      fetchTrackers();
    } else {
      toast("Analysis failed", "error");
    }
    setChecking(null);
  }

  async function handleDelete(trackerId: string) {
    const res = await fetch(`/api/projects/${id}/competitors/${trackerId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Failed to remove competitor", "error");
      return;
    }
    setTrackers((prev) => prev.filter((t) => t.id !== trackerId));
    toast("Competitor removed", "success");
  }

  return (
    <div>
      <PageHeader
        title="Competitors"
        description="Track and analyze your competition"
      >
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Competitor
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="animate-in mb-6">
          <CardContent className="p-5">
            <form onSubmit={handleAdd} className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  label="Competitor URL"
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
                  placeholder="Competitor name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={adding} size="sm">
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : trackers.length === 0 ? (
        <Card className="animate-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Target className="h-10 w-10 text-text-tertiary mb-4" />
            <p className="text-body text-text-secondary">
              No competitors tracked yet
            </p>
            <p className="text-small text-text-tertiary mt-1">
              Add a competitor to start monitoring their SEO strategy
            </p>
          </CardContent>
        </Card>
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
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-surface-2 p-2 shrink-0">
                      <Globe className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-body truncate">
                        {tracker.competitor_name ||
                          tracker.competitor_url.replace(/^https?:\/\//, "")}
                      </CardTitle>
                      <p className="text-caption text-text-tertiary truncate">
                        {tracker.competitor_url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCheck(tracker.id)}
                      disabled={checking === tracker.id}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1 ${
                          checking === tracker.id ? "animate-spin" : ""
                        }`}
                      />
                      {checking === tracker.id ? "Analyzing..." : "Check Now"}
                    </Button>
                    <button
                      onClick={() => handleDelete(tracker.id)}
                      className="rounded-lg p-2 text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {latest ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-caption text-text-tertiary">
                          Keyword Overlap
                        </p>
                        <p className="text-h3 font-mono text-text-primary">
                          {latest.keyword_overlap ?? "—"}
                          {overlapDelta !== null && overlapDelta !== 0 && (
                            <span
                              className={`ml-1 text-small ${
                                overlapDelta > 0
                                  ? "text-warning"
                                  : "text-success"
                              }`}
                            >
                              {overlapDelta > 0 ? "+" : ""}
                              {overlapDelta}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-caption text-text-tertiary">
                          Est. Domain Authority
                        </p>
                        <p className="text-h3 font-mono text-text-primary">
                          {latest.estimated_da ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-caption text-text-tertiary">
                          Content Gaps
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(latest.content_gaps ?? []).slice(0, 3).map((g) => (
                            <Badge key={g} variant="secondary">
                              {g}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-caption text-text-tertiary">
                          Last Checked
                        </p>
                        <p className="text-small text-text-secondary">
                          {tracker.last_checked_at
                            ? new Date(
                                tracker.last_checked_at
                              ).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-small text-text-tertiary">
                      <Search className="h-4 w-4" />
                      Click &ldquo;Check Now&rdquo; to run your first analysis
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
