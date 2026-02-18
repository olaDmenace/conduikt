"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Hash,
  Star,
  Clock,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";

interface Generation {
  id: string;
  skill_used: string;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  duration_ms: number | null;
  created_at: string;
}

const skillLabels: Record<string, string> = {
  "seo-audit": "SEO Audit",
  "page-cro": "Page CRO",
  copywriting: "Copywriting",
  "social-content": "Social Content",
  "email-sequence": "Email Sequence",
  "content-strategy": "Content Strategy",
  "competitor-analysis": "Competitor Analysis",
};

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGenerations() {
      const res = await fetch(`/api/projects/${id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setGenerations(data);
      }
      setLoading(false);
    }
    fetchGenerations();
  }, [id]);

  // Compute stats
  const totalGenerations = generations.length;
  const totalTokens = generations.reduce(
    (sum, g) => sum + (g.input_tokens ?? 0) + (g.output_tokens ?? 0),
    0
  );

  const skillCounts: Record<string, number> = {};
  for (const g of generations) {
    skillCounts[g.skill_used] = (skillCounts[g.skill_used] ?? 0) + 1;
  }
  const mostUsedSkill =
    Object.entries(skillCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="AI generation history and usage"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
            <Card className="animate-in">
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-caption text-text-tertiary">
                    Total Generations
                  </p>
                  <p className="mt-1 text-2xl font-semibold font-mono text-text-primary">
                    {totalGenerations}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="animate-in" style={{ animationDelay: "60ms" }}>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-caption text-text-tertiary">
                    Total Tokens Used
                  </p>
                  <p className="mt-1 text-2xl font-semibold font-mono text-text-primary">
                    {totalTokens.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <Hash className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="animate-in" style={{ animationDelay: "120ms" }}>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-caption text-text-tertiary">
                    Most-Used Skill
                  </p>
                  <p className="mt-1 text-2xl font-semibold font-mono text-text-primary">
                    {mostUsedSkill
                      ? skillLabels[mostUsedSkill] ?? mostUsedSkill
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <Star className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generations Table */}
          {generations.length === 0 ? (
            <Card className="animate-in" style={{ animationDelay: "180ms" }}>
              <CardContent>
                <div className="flex flex-col items-center py-16 text-center">
                  <BarChart3 className="h-10 w-10 text-text-tertiary mb-4" />
                  <p className="text-body text-text-secondary">
                    No AI generations yet
                  </p>
                  <p className="text-small text-text-tertiary mt-1">
                    Use the Content Studio or run an audit to see generation
                    history here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="animate-in" style={{ animationDelay: "180ms" }}>
              <CardHeader>
                <CardTitle>Generation History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium">
                          Skill
                        </th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium">
                          Model
                        </th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                          Tokens
                        </th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-caption text-text-tertiary font-medium text-right">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {generations.map((gen) => {
                        const tokens =
                          (gen.input_tokens ?? 0) + (gen.output_tokens ?? 0);
                        return (
                          <tr
                            key={gen.id}
                            className="border-b border-border-subtle last:border-0 hover:bg-surface-1/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <Badge variant="secondary">
                                {skillLabels[gen.skill_used] ?? gen.skill_used}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-small text-text-secondary font-mono">
                              {gen.model
                                ? gen.model.replace("claude-", "").slice(0, 20)
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-small text-text-secondary font-mono text-right">
                              {tokens.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-small text-text-secondary text-right">
                              {gen.duration_ms
                                ? `${(gen.duration_ms / 1000).toFixed(1)}s`
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-small text-text-tertiary text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {new Date(gen.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
