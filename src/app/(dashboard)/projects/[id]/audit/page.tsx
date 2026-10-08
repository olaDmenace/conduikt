"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  ArrowUpRight,
  Sparkles,
  Lock,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
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

// Plain labels for the three importance levels the audit API returns.
const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-danger",
    label: "Fix first",
    hint: "these hurt how Google sees your site most",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-accent",
    label: "Fix next",
    hint: "worth fixing once the first list is done",
  },
  info: {
    icon: Info,
    color: "text-text-3",
    label: "Nice to have",
    hint: "small wins when you have time",
  },
};

function severityOf(f: Finding): keyof typeof severityConfig {
  return f.severity in severityConfig ? f.severity : "info";
}

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
      toast("Add your website address in project settings first.", "warning");
      return;
    }

    setRerunning(true);
    const res = await fetch("/api/ai/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id, url: project.website_url }),
    });

    if (res.ok) {
      toast("Site check done. Results updated.", "success");
      fetchAudits();
    } else {
      const err = await res.json();
      if (res.status === 429) {
        showLimitModal();
      } else {
        toast(err.error || "The site check failed. Try again.", "error");
      }
    }
    setRerunning(false);
  }

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-36" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const latestAudit = audits[0];

  if (!latestAudit) {
    return (
      <div>
        <PageHeader title="Site Audit" description="Finds what to fix on your website">
          <Button size="sm" onClick={handleRerun} disabled={rerunning}>
            {!rerunning && <Sparkles className="h-4 w-4" />}
            {rerunning ? "Checking your site…" : "Check my site"}
          </Button>
        </PageHeader>
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No site check yet. Run one to see your site score and what to fix first."
        />
      </div>
    );
  }

  const findings = latestAudit.findings ?? [];
  const score = latestAudit.score ?? 0;
  const filtered =
    filter === "all"
      ? findings
      : findings.filter((f) => severityOf(f) === filter);

  const scoreStroke =
    score >= 80 ? "var(--teal)" : score >= 50 ? "var(--accent)" : "var(--danger)";
  const scoreLabel =
    score >= 80 ? "Good" : score >= 50 ? "Needs work" : "Poor";
  const scoreLabelClass =
    score >= 80 ? "text-teal" : score >= 50 ? "text-accent" : "text-danger";

  const countBy = (s: Finding["severity"]) =>
    findings.filter((f) => severityOf(f) === s).length;

  return (
    <div>
      <PageHeader
        title="Site Audit"
        description={`Last checked ${new Date(latestAudit.created_at).toLocaleDateString()} · ${latestAudit.url}`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
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
                toast("Couldn't make the PDF. Try again.", "error");
              }
            }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerun}
            disabled={rerunning}
          >
            {!rerunning && <RefreshCw className="h-4 w-4" />}
            {rerunning ? "Checking…" : "Check again"}
          </Button>
        </div>
      </PageHeader>

      <ExpectationBanner
        storageKey="conduikt-expect-audit"
        message="Fixes take 2 to 8 weeks to show up in Google results. Start with the 'Fix first' items and check your site again every few weeks."
        details={[
          "80 out of 100 or more means your site is in good shape. That's the goal.",
          "50 to 79 is a solid start with room to grow. Work through the 'Fix first' items.",
          "Below 50 needs work, but every fix helps. Start small and keep going.",
        ]}
      />

      {/* Score */}
      <Card className="mb-8 animate-in">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg className="absolute inset-0" viewBox="0 0 120 120" aria-hidden>
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={scoreStroke}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
                className="transition-all duration-1000"
              />
            </svg>
            <span className="text-numeric text-4xl text-text">{score}</span>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-label text-text-3">Site score</p>
            <p className="mt-2 text-heading text-text">
              {score} out of 100 ·{" "}
              <span className={scoreLabelClass}>{scoreLabel}</span>
            </p>
            <p className="mt-1 text-body text-text-2">
              {findings.length === 0
                ? "We found nothing to fix."
                : `We found ${findings.length} ${findings.length === 1 ? "thing" : "things"} to fix: ${countBy("critical")} to fix first, ${countBy("warning")} to fix next, ${countBy("info")} nice to have.`}
            </p>
            {audits.length > 1 && (
              <p className="mt-2 text-caption text-text-3">
                {audits.length} checks so far. Showing the latest.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Page speed */}
      {latestAudit.metadata?.pageSpeed && (
        <PageSpeedPanel data={latestAudit.metadata.pageSpeed} />
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Show">
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-md border px-3 py-1.5 text-body-s font-medium transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
              filter === f
                ? "border-line-strong bg-surface text-text"
                : "border-line text-text-2 hover:bg-surface-2 hover:text-text"
            }`}
          >
            {f === "all" ? "Everything" : severityConfig[f].label}
            <span className="ml-1.5 font-mono text-text-3">
              {f === "all" ? findings.length : countBy(f)}
            </span>
          </button>
        ))}
      </div>

      {/* Fixes, grouped by importance */}
      <div className="space-y-8">
        {(["critical", "warning", "info"] as const).map((sev) => {
          const group = filtered.filter((f) => severityOf(f) === sev);
          if (group.length === 0) return null;
          const config = severityConfig[sev];
          const Icon = config.icon;
          return (
            <section key={sev} aria-labelledby={`audit-group-${sev}`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2
                  id={`audit-group-${sev}`}
                  className="flex items-center gap-2 text-heading text-text"
                >
                  <Icon className={`h-5 w-5 ${config.color}`} aria-hidden />
                  {config.label}
                </h2>
                <span className="text-body-s text-text-3">
                  {group.length} · {config.hint}
                </span>
              </div>
              <div className="space-y-3">
                {group.map((finding, i) => (
                  <Card
                    key={`${sev}-${i}`}
                    className="animate-in"
                    style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-title text-text">{finding.title}</h3>
                      {finding.category && (
                        <Badge variant="secondary">{finding.category}</Badge>
                      )}
                      {finding.gated && (
                        <Badge variant="pro">
                          <Lock className="h-3 w-3" />
                          Pro
                        </Badge>
                      )}
                    </div>
                    {finding.gated ? (
                      <div className="mt-3 rounded-md border border-dashed border-line bg-ground p-4">
                        <div aria-hidden className="space-y-2">
                          <div className="h-3 w-11/12 rounded-sm bg-surface-2" />
                          <div className="h-3 w-4/5 rounded-sm bg-surface-2" />
                          <div className="h-3 w-2/3 rounded-sm bg-surface-2" />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-body-s text-text-2">
                            {finding.gateCTA ??
                              "Upgrade to Pro to see this issue and how to fix it."}
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
                        <p className="text-body-s text-text-2">{finding.detail}</p>
                        {finding.fix && (
                          <div className="mt-3 rounded-md border border-line bg-ground p-3">
                            <p className="mb-1.5 text-label text-text-3">How to fix it</p>
                            <p className="break-words font-mono text-body-s text-text">
                              {finding.fix}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            title={
              filter === "all"
                ? "Nothing to fix. Your site passed every check."
                : `Nothing under "${severityConfig[filter].label}".`
            }
          />
        )}
      </div>
    </div>
  );
}
