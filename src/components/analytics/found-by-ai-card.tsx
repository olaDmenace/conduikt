"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";

// "Found by AI answers" card for the Analytics page. Reads
// /api/projects/{id}/visibility (stored checks from the nightly job).
// Standalone; not wired in yet.

interface QuestionRow {
  question: string;
  engine: string;
  askedAt: string;
  mentioned: boolean;
  cited: boolean;
  competitors: string[];
  excerpt: string | null;
}

interface VisibilityResponse {
  configured: boolean;
  reason: string | null;
  days: number;
  checkedQuestions: number;
  mentionedCount: number;
  citedCount: number;
  lastCheckedAt: string | null;
  questions: QuestionRow[];
  topCompetitors: Array<{ domain: string; count: number }>;
}

const ENGINE_LABEL: Record<string, string> = {
  perplexity: "Perplexity",
  openai: "ChatGPT",
  gemini: "Gemini",
  claude: "Claude",
};

export function FoundByAiCard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<VisibilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/visibility?days=14`);
        const body = (await res.json().catch(() => ({}))) as VisibilityResponse & { error?: string };
        if (!res.ok) throw new Error(body.error || `Could not load answer checks (${res.status})`);
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load answer checks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading answer checks">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line rail:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 bg-surface p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title={`We couldn't load the answer checks: ${error}.`}
      />
    );
  }

  if (!data || !data.configured) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title="Not connected yet. Once an answer engine key is added, we ask the questions your customers ask every night and show whether you are in the answer."
      />
    );
  }

  if (data.checkedQuestions === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title={data.reason ?? "No checks yet. The first run happens overnight."}
      />
    );
  }

  const lost = data.questions.filter((q) => !q.mentioned && !q.cited);
  const won = data.questions.filter((q) => q.mentioned || q.cited);

  return (
    <div>
      <p className="mb-4 text-caption text-text-3">
        Last {data.days} days
        {data.lastCheckedAt && <> &middot; last checked {new Date(data.lastCheckedAt).toLocaleDateString()}</>}
      </p>

      <KpiStrip
        className="mb-4 animate-in rail:grid-cols-3"
        cells={[
          { label: "Questions checked", value: String(data.checkedQuestions) },
          {
            label: "Name you",
            value: `${data.mentionedCount} of ${data.checkedQuestions}`,
          },
          {
            label: "Link to your site",
            value: `${data.citedCount} of ${data.checkedQuestions}`,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-in overflow-hidden p-0 md:p-0">
          <div className="flex items-center justify-between p-4 md:px-6">
            <h3 className="flex items-center gap-2 text-title text-text">
              <Sparkles className="h-4 w-4 text-text-3" />
              Questions you are missing from
            </h3>
            <Badge variant={lost.length > 0 ? "warning" : "success"}>{lost.length}</Badge>
          </div>
          {lost.length === 0 ? (
            <p className="border-t border-line px-6 py-6 text-body-s text-text-3">
              You are in every answer we checked.
            </p>
          ) : (
            <ul className="border-t border-line">
              {lost.slice(0, 8).map((q) => (
                <li key={`${q.engine}-${q.question}`} className="border-b border-line px-6 py-3 last:border-0">
                  <p className="text-body-s text-text">{q.question}</p>
                  <p className="text-caption text-text-3">
                    {ENGINE_LABEL[q.engine] ?? q.engine}
                    {q.competitors.length > 0 && <> &middot; answered with {q.competitors.slice(0, 3).join(", ")}</>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="animate-in overflow-hidden p-0 md:p-0" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between p-4 md:px-6">
            <h3 className="text-title text-text">Questions you already win</h3>
            <Badge variant="success">{won.length}</Badge>
          </div>
          {won.length === 0 ? (
            <p className="border-t border-line px-6 py-6 text-body-s text-text-3">
              None yet. Pages written for the questions on the left change this.
            </p>
          ) : (
            <ul className="border-t border-line">
              {won.slice(0, 8).map((q) => (
                <li key={`${q.engine}-${q.question}`} className="border-b border-line px-6 py-3 last:border-0">
                  <p className="text-body-s text-text">{q.question}</p>
                  <p className="text-caption text-text-3">
                    {ENGINE_LABEL[q.engine] ?? q.engine} &middot; {q.cited ? "links to your site" : "names you"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {data.topCompetitors.length > 0 && (
            <p className="border-t border-line px-6 py-4 text-caption text-text-3">
              Named instead of you most often:{" "}
              {data.topCompetitors.map((c) => `${c.domain} (${c.count})`).join(", ")}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
