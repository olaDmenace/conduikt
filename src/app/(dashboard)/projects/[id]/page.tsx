"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Globe,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { ProjectNav } from "@/src/components/layout/project-nav";
import { useToast } from "@/src/components/ui/toast";

interface Audit {
  id: string;
  type: string;
  url: string;
  score: number | null;
  findings: unknown;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  value_proposition: string | null;
  audits: Audit[];
  assets: Array<{ id: string; type: string; title: string | null; status: string }>;
  campaigns: Array<{ id: string; name: string; type: string; status: string }>;
}

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
    }
    setLoading(false);
  }

  async function handleRunAudit() {
    if (!project?.website_url) {
      toast("No website URL set for this project.", "warning");
      return;
    }
    setRunningAudit(true);
    const res = await fetch("/api/ai/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id, url: project.website_url }),
    });
    if (res.ok) {
      toast("SEO audit complete!", "success");
      fetchProject();
    } else {
      const err = await res.json();
      toast(err.error || "Audit failed", "error");
    }
    setRunningAudit(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-h2 text-text-primary">Project not found</h2>
        <Button className="mt-4" asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  const latestAudit = project.audits?.[0];
  const seoScore = latestAudit?.score;
  const findings = (latestAudit?.findings ?? []) as Array<{
    severity: string;
    title: string;
    detail: string;
    category: string;
  }>;
  const criticalCount = findings.filter(
    (f) => f.severity === "critical"
  ).length;

  return (
    <div>
      <PageHeader
        title={project.name}
        description={
          project.website_url || "Your marketing command center"
        }
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRunAudit}
          disabled={runningAudit}
        >
          {runningAudit ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {runningAudit ? "Running..." : "Run Audit"}
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/projects">All Projects</Link>
        </Button>
      </PageHeader>

      <ProjectNav projectId={id} />

      {/* Score Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card className="animate-in">
          <CardContent className="text-center py-6">
            <div
              className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                seoScore != null
                  ? seoScore >= 80
                    ? "bg-success/10 border-success/30"
                    : seoScore >= 50
                    ? "bg-warning/10 border-warning/30"
                    : "bg-error/10 border-error/30"
                  : "bg-surface-2 border-border-default"
              }`}
            >
              <span
                className={`text-2xl font-mono font-bold ${
                  seoScore != null
                    ? seoScore >= 80
                      ? "text-success"
                      : seoScore >= 50
                      ? "text-warning"
                      : "text-error"
                    : "text-text-tertiary"
                }`}
              >
                {seoScore ?? "—"}
              </span>
            </div>
            <p className="text-caption text-text-tertiary">SEO Score</p>
            {findings.length > 0 && (
              <p className="text-small text-text-secondary mt-1">
                {findings.length} issues found
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="animate-in" style={{ animationDelay: "60ms" }}>
          <CardContent className="text-center py-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border-2 border-accent/30">
              <span className="text-2xl font-mono font-bold text-accent">
                {project.assets?.length ?? 0}
              </span>
            </div>
            <p className="text-caption text-text-tertiary">Assets Created</p>
          </CardContent>
        </Card>
        <Card className="animate-in" style={{ animationDelay: "120ms" }}>
          <CardContent className="text-center py-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-info/10 border-2 border-info/30">
              <span className="text-2xl font-mono font-bold text-info">
                {project.campaigns?.length ?? 0}
              </span>
            </div>
            <p className="text-caption text-text-tertiary">Campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Findings or Empty State */}
      {findings.length > 0 ? (
        <Card className="mb-8 animate-in" style={{ animationDelay: "180ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-error" />
              Top Findings
              {criticalCount > 0 && (
                <Badge variant="error">{criticalCount} critical</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.slice(0, 5).map((finding, i) => (
              <div
                key={i}
                className="flex items-start justify-between rounded-lg border border-border-default bg-surface-0 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      finding.severity === "critical"
                        ? "text-error"
                        : finding.severity === "warning"
                        ? "text-warning"
                        : "text-info"
                    }`}
                  />
                  <div>
                    <p className="text-body font-medium text-text-primary">
                      {finding.title}
                    </p>
                    <p className="text-small text-text-secondary">
                      {finding.detail}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    finding.severity === "critical"
                      ? "error"
                      : finding.severity === "warning"
                      ? "warning"
                      : "info"
                  }
                >
                  {finding.severity}
                </Badge>
              </div>
            ))}
            {findings.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/projects/${id}/audit`}>
                    View all {findings.length} findings
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card
          className="mb-8 animate-in border-dashed border-border-strong"
          style={{ animationDelay: "180ms" }}
        >
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Globe className="h-10 w-10 text-text-tertiary mb-4" />
            <h3 className="text-h3 text-text-primary">No audit yet</h3>
            <p className="mt-2 text-body text-text-secondary max-w-md">
              {project.website_url
                ? "Run your first SEO audit to get actionable insights."
                : "Add a website URL in project settings, then run an audit."}
            </p>
            {project.website_url && (
              <Button
                className="mt-4"
                onClick={handleRunAudit}
                disabled={runningAudit}
              >
                {runningAudit ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Run SEO Audit
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="animate-in" style={{ animationDelay: "240ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Your Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              label: "View full audit report",
              href: `/projects/${id}/audit`,
              show: findings.length > 0,
            },
            {
              label: "Write a Blog Post",
              description: "SEO-optimized long-form content with meta tags and social snippets",
              href: `/projects/${id}/blog`,
              show: true,
            },
            {
              label: "Research Keywords",
              description: "Discover keyword clusters, long-tail opportunities, and content gaps",
              href: `/projects/${id}/keywords`,
              show: true,
            },
            {
              label: "Generate Growth Playbook",
              description: "AI-powered 90-day action plan across SEO, content, and conversion",
              href: `/projects/${id}/growth`,
              show: true,
            },
            {
              label: "Content Studio",
              description: "Social posts, email sequences, copywriting and more",
              href: `/projects/${id}/content`,
              show: true,
            },
            {
              label: "View Analytics",
              description: "Track your AI generation usage and audit score trends",
              href: `/projects/${id}/analytics`,
              show: true,
            },
          ]
            .filter((a) => a.show)
            .map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className="flex items-center justify-between rounded-lg border border-border-default bg-surface-0 p-4 hover:bg-surface-2 transition-colors group"
              >
                <div>
                  <p className="text-body text-text-primary font-medium">{action.label}</p>
                  {"description" in action && action.description && (
                    <p className="text-small text-text-tertiary mt-0.5">{action.description}</p>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 text-text-tertiary shrink-0 group-hover:text-accent transition-colors" />
              </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
