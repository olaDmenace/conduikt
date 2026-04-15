"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Lock,
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

import { useToast } from "@/src/components/ui/toast";
import { useUsageLimitModal } from "@/src/components/usage/limit-modal";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";
import {
  PageSpeedPanel,
  type PageSpeedData,
} from "@/src/components/audit/pagespeed-panel";

interface Finding {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  fix: string;
  impact: "high" | "medium" | "low";
  gated?: boolean;
  gateCTA?: string;
}

interface Audit {
  id: string;
  type: string;
  url: string;
  score: number | null;
  findings: Finding[];
  metadata: { pageSpeed?: PageSpeedData } | null;
  created_at: string;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-error",
    badge: "error" as const,
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    badge: "warning" as const,
  },
  info: { icon: Info, color: "text-info", badge: "info" as const },
};

export default function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "critical" | "warning" | "info"
  >("all");
  const { toast } = useToast();
  const { showLimitModal } = useUsageLimitModal();

  useEffect(() => {
    fetchAudits();
  }, [id]);

  async function fetchAudits() {
    const res = await fetch(`/api/projects/${id}/audits`);
    if (res.ok) {
      const data = await res.json();
      setAudits(data);
    }
    setLoading(false);
  }

  async function handleRerun() {
    // Get project URL first
    const projectRes = await fetch(`/api/projects/${id}`);
    if (!projectRes.ok) return;
    const project = await projectRes.json();
    if (!project.website_url) {
      toast("No website URL set for this project.", "warning");
      return;
    }

    setRerunning(true);
    const res = await fetch("/api/ai/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id, url: project.website_url }),
    });

    if (res.ok) {
      toast("Audit complete! Results updated.", "success");
      fetchAudits();
    } else {
      const err = await res.json();
      if (res.status === 429) {
        showLimitModal();
      } else {
        toast(err.error || "Audit failed", "error");
      }
    }
    setRerunning(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  const latestAudit = audits[0];

  if (!latestAudit) {
    return (
      <div>
        <PageHeader title="SEO Audit" description="Technical and on-page analysis">
          <Button size="sm" onClick={handleRerun} disabled={rerunning}>
            {rerunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {rerunning ? "Running..." : "Run First Audit"}
          </Button>
        </PageHeader>
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-text-tertiary mb-4" />
            <h3 className="text-h2 text-text-primary">No audits yet</h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Run your first SEO audit to get a detailed analysis of your
              website&apos;s search optimization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const findings = latestAudit.findings ?? [];
  const score = latestAudit.score ?? 0;
  const filtered =
    filter === "all"
      ? findings
      : findings.filter((f) => f.severity === filter);

  const scoreColor =
    score >= 80 ? "success" : score >= 50 ? "warning" : "error";
  const scoreLabel =
    score >= 80 ? "Good" : score >= 50 ? "Needs Improvement" : "Poor";

  return (
    <div>
      <PageHeader title="SEO Audit" description={`Last run: ${new Date(latestAudit.created_at).toLocaleDateString()} — ${latestAudit.url}`}>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const res = await fetch(
                `/api/projects/${id}/audits/${latestAudit.id}/pdf`
              );
              if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `conduikt-audit-${latestAudit.id.slice(0, 8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } else {
                toast("Failed to generate PDF", "error");
              }
            }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRerun}
            disabled={rerunning}
          >
            {rerunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {rerunning ? "Running..." : "Re-run Audit"}
          </Button>
        </div>
      </PageHeader>


      <ExpectationBanner
        storageKey="conduikt-expect-audit"
        message="SEO improvements take 2-8 weeks to reflect in search rankings. Implement fixes gradually, starting with critical issues, and re-run audits regularly to track progress."
        details={[
          "A score of 80+ means your site is well optimized — that's the goal.",
          "50-79 is a solid foundation with room to grow. Focus on the red items first.",
          "Below 50 needs work, but every fix moves the needle. Start small, stay consistent.",
        ]}
      />

      {/* PageSpeed Panel */}
      {latestAudit.metadata?.pageSpeed && (
        <PageSpeedPanel data={latestAudit.metadata.pageSpeed} />
      )}

      {/* Score Gauge */}
      <Card className="mb-8 animate-in">
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 py-8">
          <div className="relative flex h-28 w-28 items-center justify-center shrink-0">
            <svg className="absolute inset-0" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--border-default)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={`var(--${scoreColor})`}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 327} 327`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                className="transition-all duration-1000"
              />
            </svg>
            <span className="text-3xl font-mono font-bold text-text-primary">
              {score}
            </span>
          </div>
          <div>
            <h2 className="text-h2 text-text-primary">{scoreLabel}</h2>
            <p className="text-body text-text-secondary mt-1">
              Found {findings.length} issues:{" "}
              {findings.filter((f) => f.severity === "critical").length}{" "}
              critical,{" "}
              {findings.filter((f) => f.severity === "warning").length}{" "}
              warnings,{" "}
              {findings.filter((f) => f.severity === "info").length} info
            </p>
            {audits.length > 1 && (
              <p className="text-small text-text-tertiary mt-2">
                {audits.length} audits total — showing latest
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-small font-medium transition-colors ${
              filter === f
                ? "bg-surface-2 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-1.5 text-text-tertiary">
                ({findings.filter((finding) => finding.severity === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filtered.map((finding, i) => {
          const config = severityConfig[finding.severity] ?? severityConfig.info;
          const Icon = config.icon;
          return (
            <Card
              key={i}
              className="animate-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent className="flex items-start justify-between">
                <div className="flex items-start gap-3 w-full">
                  <Icon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${config.color}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-body font-medium text-text-primary">
                        {finding.title}
                      </h3>
                      <Badge variant={config.badge}>{finding.severity}</Badge>
                      {finding.category && (
                        <Badge variant="secondary">{finding.category}</Badge>
                      )}
                      {finding.gated && (
                        <Badge variant="secondary">
                          <Lock className="h-3 w-3" />
                          Pro
                        </Badge>
                      )}
                    </div>
                    {finding.gated ? (
                      <div className="relative mt-2 rounded-lg border border-dashed border-accent/40 bg-accent-muted/20 p-4">
                        <div
                          aria-hidden
                          className="select-none pointer-events-none blur-sm text-small text-text-tertiary space-y-2"
                        >
                          <p>
                            Lorem ipsum dolor sit amet, consectetur adipiscing
                            elit. Suspendisse ac risus nec libero lacinia.
                          </p>
                          <p>
                            Pellentesque habitant morbi tristique senectus et
                            netus et malesuada fames ac turpis egestas.
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-small text-text-secondary">
                            {finding.gateCTA ??
                              "Upgrade to Pro to see this critical issue and how to fix it"}
                          </p>
                          <Button size="sm" asChild>
                            <Link href="/settings/billing">
                              Upgrade
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-small text-text-secondary">
                          {finding.detail}
                        </p>
                        {finding.fix && (
                          <div className="mt-3 rounded-lg bg-surface-0 border border-border-default p-3">
                            <p className="text-caption text-text-tertiary mb-1">
                              Suggested Fix
                            </p>
                            <code className="text-data text-accent-secondary break-all">
                              {finding.fix}
                            </code>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-body text-text-secondary">
                No {filter} findings.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
