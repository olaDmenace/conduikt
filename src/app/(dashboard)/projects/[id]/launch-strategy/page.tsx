"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Rocket,
  Sparkles,
  Loader2,
  Target,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  Save,
  Copy,
  Check,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";
import { useToast } from "@/src/components/ui/toast";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";

interface LaunchMilestone {
  day: string;
  task: string;
  owner: string;
  deliverable: string;
  effort_hours: number;
}

interface LaunchHour {
  time: string;
  action: string;
  channel: string;
  asset_needed: string;
}

interface WeeklyFocus {
  week: number;
  theme: string;
  activities: string[];
  leading_indicator: string;
}

interface LaunchAsset {
  asset: string;
  purpose: string;
  owner: string;
  deadline: string;
  linked_skill: string;
}

interface ChannelPlay {
  channel: string;
  play: string;
  expected_outcome: string;
  effort: "low" | "medium" | "high";
}

interface MetricTarget {
  metric: string;
  target: string;
}

interface LaunchResult {
  launch_thesis: string;
  riskiest_assumption: { assumption: string; cheap_test: string };
  positioning: { one_liner: string; category: string; against: string };
  audience_targeting: {
    primary_icp: string;
    primary_channels: string[];
    where_not_to_post: string[];
  };
  phases: {
    pre_launch: {
      duration_days: number;
      goals: string[];
      milestones: LaunchMilestone[];
    };
    launch_day: { hour_by_hour: LaunchHour[] };
    first_30_days: { weekly_focus: WeeklyFocus[] };
  };
  assets_to_create: LaunchAsset[];
  channel_plays: ChannelPlay[];
  success_metrics: {
    north_star: string;
    day_1_targets: MetricTarget[];
    day_7_targets: MetricTarget[];
    day_30_targets: MetricTarget[];
  };
  gaps: string[];
}

const PLAN_TIERS = ["pro", "growth", "agency"];

export default function LaunchStrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();

  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const [product, setProduct] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [teamSize, setTeamSize] = useState("solo founder");
  const [budget, setBudget] = useState("");
  const [channels, setChannels] = useState("");
  const [goals, setGoals] = useState("");
  const [generating, setGenerating] = useState(false);
  const [rawText, setRawText] = useState("");

  const [result, setResult] = useState<LaunchResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setPlan(data.plan ?? "free");
        }
      } catch {
        setPlan("free");
      } finally {
        setPlanLoading(false);
      }
    }
    loadPlan();
  }, []);

  const isLocked = plan !== null && !PLAN_TIERS.includes(plan);

  async function handleGenerate() {
    setGenerating(true);
    setResult(null);
    setRawText("");

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "launch-strategy",
          projectId,
          input: {
            product: product || undefined,
            launchDate: launchDate || undefined,
            teamSize,
            budget: budget || undefined,
            channels: channels || undefined,
            goals: goals || undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Generation failed", "error");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        toast("Streaming not supported", "error");
        setGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            fullText += data.text;
            setRawText(fullText);
          }
        }
      }

      if (fullText) {
        try {
          const parsed = parseJsonResponse(fullText) as LaunchResult;
          setResult(parsed);
          toast("Launch plan generated", "success");
        } catch {
          toast("Output formatting was off. Check raw text.", "warning");
        }
      }
    } catch (err) {
      toast(String(err), "error");
    } finally {
      setGenerating(false);
    }
  }

  async function savePlan() {
    if (!result) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "launch_plan",
          title: `Launch plan — ${result.positioning.one_liner}`,
          content: {
            plan: result,
            skill: "launch-strategy",
          },
          status: "draft",
        }),
      });
      if (res.ok) toast("Launch plan saved to library", "success");
      else toast("Failed to save", "error");
    } catch {
      toast("Failed to save", "error");
    }
  }

  function copyPlan() {
    if (!result) return;
    navigator.clipboard.writeText(formatLaunchPlanAsMarkdown(result));
    setCopied(true);
    toast("Plan copied", "info");
    setTimeout(() => setCopied(false), 2000);
  }

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div>
        <PageHeader
          title="Launch Strategy"
          description="A concrete day-by-day launch plan — pre-launch, launch day, first 30 days"
        />
        <div className="rounded-xl border border-border-default bg-surface-1 p-10 text-center animate-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
            <Lock className="h-7 w-7 text-text-tertiary" />
          </div>
          <h3 className="text-h3 text-text-primary mb-2">
            Upgrade to unlock Launch Strategy
          </h3>
          <p className="text-body text-text-secondary max-w-md mx-auto mb-6">
            Generate specific, assignable launch plans tied to your audience and goals.
            Available on Pro, Growth, and Agency plans.
          </p>
          <Button asChild>
            <Link href="/settings/billing">
              Upgrade Plan <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Launch Strategy"
        description="A concrete day-by-day launch plan — pre-launch, launch day, first 30 days"
      />

      <ExpectationBanner
        storageKey="conduikt-expect-launch"
        message="The AI gives you the plan — you execute it. Every task should have an owner and a deadline on your calendar before launch day."
        details={[
          "The riskiest assumption is the one thing to test cheaply BEFORE you ship.",
          "If a channel isn't in the plan, it's probably not worth spreading thin on it.",
          "Revisit success metrics at day 7 — if leading indicators are flat, change tactics, not targets.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Form */}
        <div className="rounded-xl border border-border-default bg-surface-1 p-6 animate-in h-fit">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-body font-semibold text-text-primary">Brief</p>
              <p className="text-caption text-text-tertiary">
                Leave blank to use project context
              </p>
            </div>
          </div>

          <FormField label="Product / what you&apos;re launching">
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. 'AI blog agent'"
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </FormField>

          <FormField label="Launch date (optional)">
            <input
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </FormField>

          <FormField label="Team size">
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            >
              <option>solo founder</option>
              <option>2-person team</option>
              <option>3-5 person team</option>
              <option>6+ person team</option>
            </select>
          </FormField>

          <FormField label="Budget (optional)">
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. '$2k paid', 'bootstrap only'"
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </FormField>

          <FormField label="Preferred channels (optional)">
            <input
              value={channels}
              onChange={(e) => setChannels(e.target.value)}
              placeholder="e.g. 'Product Hunt, X, Indie Hackers'"
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
          </FormField>

          <FormField label="Launch goals (optional)">
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. '500 signups, 50 paid, 3 press mentions'"
              rows={2}
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
            />
          </FormField>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full mt-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generating ? "Building plan..." : "Generate Launch Plan"}
          </Button>
        </div>

        {/* Output */}
        <div className="min-w-0">
          {!result && !generating && (
            <div className="rounded-xl border border-border-default bg-surface-1 py-20 px-6 text-center animate-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
                <Rocket className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="text-body font-medium text-text-secondary mb-1">
                No plan yet
              </p>
              <p className="text-small text-text-tertiary max-w-sm mx-auto">
                Fill in the brief (all fields optional) and hit generate.
              </p>
            </div>
          )}

          {generating && !result && (
            <div className="rounded-xl border border-border-default bg-surface-1 p-10 animate-in text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted mb-4">
                <Loader2 className="h-6 w-6 text-accent animate-spin" />
              </div>
              <p className="text-body font-semibold text-text-primary">
                Building your launch plan...
              </p>
              <p className="text-small text-text-tertiary mt-2 max-w-sm mx-auto">
                We&apos;re mapping positioning, pre-launch prep, launch-day runbook, and 30-day targets.
              </p>
            </div>
          )}

          {!generating && !result && rawText && (
            <div className="rounded-xl border border-warning/30 bg-surface-1 p-6 animate-in space-y-2">
              <p className="text-small text-text-primary font-medium">
                We got a response but couldn&apos;t format it into a launch plan. Try regenerating.
              </p>
              <details className="text-small">
                <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
                  Show raw output
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-caption text-text-secondary font-mono break-words max-h-[320px] overflow-y-auto">
                  {rawText}
                </pre>
              </details>
            </div>
          )}

          {result && (
            <div className="space-y-5 animate-in">
              {/* Thesis + actions */}
              <div className="rounded-xl border border-accent/30 bg-accent-muted p-5">
                <p className="text-caption text-text-tertiary mb-1">Launch thesis</p>
                <p className="text-body text-text-primary leading-relaxed mb-4">
                  {result.launch_thesis}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={savePlan}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save to library
                  </Button>
                  <Button size="sm" variant="secondary" onClick={copyPlan}>
                    {copied ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copy plan
                  </Button>
                </div>
              </div>

              {/* Positioning */}
              <SectionCard title="Positioning" icon={Target}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <KeyValue label="One-liner" value={result.positioning.one_liner} />
                  <KeyValue label="Category" value={result.positioning.category} />
                  <KeyValue label="Against" value={result.positioning.against} />
                </div>
              </SectionCard>

              {/* Riskiest assumption */}
              <SectionCard title="Riskiest assumption" icon={AlertTriangle} accent="warning">
                <p className="text-body text-text-primary mb-2">
                  {result.riskiest_assumption.assumption}
                </p>
                <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
                  <p className="text-caption text-text-tertiary mb-1">Cheap test</p>
                  <p className="text-small text-text-secondary">
                    {result.riskiest_assumption.cheap_test}
                  </p>
                </div>
              </SectionCard>

              {/* Audience targeting */}
              <SectionCard title="Audience targeting" icon={Users}>
                <KeyValue
                  label="Primary ICP"
                  value={result.audience_targeting.primary_icp}
                />
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-caption text-text-tertiary mb-1.5">
                      Primary channels
                    </p>
                    <ul className="space-y-1">
                      {result.audience_targeting.primary_channels.map((c) => (
                        <li key={c} className="text-small text-text-secondary flex items-start gap-1.5">
                          <span className="text-accent shrink-0">·</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {result.audience_targeting.where_not_to_post.length > 0 && (
                    <div>
                      <p className="text-caption text-text-tertiary mb-1.5">
                        Skip these
                      </p>
                      <ul className="space-y-1">
                        {result.audience_targeting.where_not_to_post.map((c) => (
                          <li key={c} className="text-small text-text-tertiary flex items-start gap-1.5">
                            <span className="shrink-0">·</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Pre-launch milestones */}
              <SectionCard
                title={`Pre-launch (${result.phases.pre_launch.duration_days} days)`}
                icon={Calendar}
              >
                <div className="mb-3">
                  <p className="text-caption text-text-tertiary mb-1.5">Goals</p>
                  <ul className="space-y-0.5">
                    {result.phases.pre_launch.goals.map((g, i) => (
                      <li key={i} className="text-small text-text-secondary flex items-start gap-1.5">
                        <span className="text-accent shrink-0">·</span>{g}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  {result.phases.pre_launch.milestones.map((m, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border-subtle bg-surface-0 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {m.day}
                        </Badge>
                        <div className="flex items-center gap-2 text-caption text-text-tertiary">
                          <span className="capitalize">{m.owner}</span>
                          <span>·</span>
                          <span>{m.effort_hours}h</span>
                        </div>
                      </div>
                      <p className="text-body text-text-primary font-medium mb-1">
                        {m.task}
                      </p>
                      <p className="text-small text-text-secondary">
                        Deliverable: {m.deliverable}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Launch day */}
              <SectionCard title="Launch day — hour by hour" icon={Clock}>
                <div className="space-y-2">
                  {result.phases.launch_day.hour_by_hour.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-0 p-3"
                    >
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] shrink-0"
                      >
                        {h.time}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-text-primary font-medium">
                          {h.action}
                        </p>
                        <p className="text-caption text-text-tertiary mt-0.5">
                          {h.channel} · needs: {h.asset_needed}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* First 30 days */}
              <SectionCard title="First 30 days" icon={TrendingUp}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.phases.first_30_days.weekly_focus.map((w) => (
                    <div
                      key={w.week}
                      className="rounded-lg border border-border-subtle bg-surface-0 p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-[10px]">
                          Week {w.week}
                        </Badge>
                        <p className="text-body font-semibold text-text-primary">
                          {w.theme}
                        </p>
                      </div>
                      <ul className="space-y-0.5 mb-2">
                        {w.activities.map((a, i) => (
                          <li key={i} className="text-small text-text-secondary flex items-start gap-1.5">
                            <span className="text-accent shrink-0">·</span>{a}
                          </li>
                        ))}
                      </ul>
                      <p className="text-caption text-text-tertiary italic">
                        Watch: {w.leading_indicator}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Assets */}
              {result.assets_to_create.length > 0 && (
                <SectionCard title="Assets to create" icon={FileText}>
                  <div className="space-y-2">
                    {result.assets_to_create.map((a, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border-subtle bg-surface-0 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <p className="text-body font-medium text-text-primary">
                            {a.asset}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {a.deadline}
                            </Badge>
                            {a.linked_skill && (
                              <Badge variant="secondary" className="text-[10px]">
                                {a.linked_skill}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-small text-text-secondary">{a.purpose}</p>
                        <p className="text-caption text-text-tertiary mt-1 capitalize">
                          Owner: {a.owner}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Channel plays */}
              {result.channel_plays.length > 0 && (
                <SectionCard title="Channel plays">
                  <div className="space-y-2">
                    {result.channel_plays.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border-subtle bg-surface-0 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <p className="text-body font-semibold text-text-primary">
                            {c.channel}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] capitalize ${
                              c.effort === "low"
                                ? "text-success"
                                : c.effort === "high"
                                  ? "text-warning"
                                  : ""
                            }`}
                          >
                            {c.effort} effort
                          </Badge>
                        </div>
                        <p className="text-small text-text-secondary mb-1">
                          {c.play}
                        </p>
                        <p className="text-caption text-text-tertiary">
                          Expected: {c.expected_outcome}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Success metrics */}
              <SectionCard title="Success metrics" icon={TrendingUp} accent="success">
                <div className="rounded-lg border border-accent/30 bg-accent-muted p-3 mb-3">
                  <p className="text-caption text-text-tertiary mb-0.5">North star</p>
                  <p className="text-body font-semibold text-text-primary">
                    {result.success_metrics.north_star}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <MetricCol
                    label="Day 1"
                    targets={result.success_metrics.day_1_targets}
                  />
                  <MetricCol
                    label="Day 7"
                    targets={result.success_metrics.day_7_targets}
                  />
                  <MetricCol
                    label="Day 30"
                    targets={result.success_metrics.day_30_targets}
                  />
                </div>
              </SectionCard>

              {/* Gaps */}
              {result.gaps.length > 0 && (
                <SectionCard title="Context gaps" icon={AlertTriangle} accent="warning">
                  <p className="text-small text-text-secondary mb-2">
                    Fill these in and re-run for a stronger plan:
                  </p>
                  <ul className="space-y-1">
                    {result.gaps.map((g, i) => (
                      <li
                        key={i}
                        className="text-small text-text-secondary flex items-start gap-1.5"
                      >
                        <span className="text-warning shrink-0">·</span>{g}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-small font-medium text-text-secondary mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  accent?: "warning" | "success";
  children: React.ReactNode;
}) {
  const iconColor =
    accent === "warning"
      ? "text-warning"
      : accent === "success"
        ? "text-success"
        : "text-accent";
  return (
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
        <h3 className="text-body font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-text-tertiary mb-0.5">{label}</p>
      <p className="text-body text-text-primary">{value}</p>
    </div>
  );
}

function MetricCol({ label, targets }: { label: string; targets: MetricTarget[] }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
      <p className="text-caption text-text-tertiary mb-2 font-semibold">{label}</p>
      <ul className="space-y-1.5">
        {targets.map((t, i) => (
          <li key={i} className="text-small">
            <p className="text-text-secondary">{t.metric}</p>
            <p className="text-text-primary font-mono text-caption">{t.target}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatLaunchPlanAsMarkdown(r: LaunchResult): string {
  const lines: string[] = [];
  lines.push(`# Launch Plan`);
  lines.push("");
  lines.push(`## Thesis`);
  lines.push(r.launch_thesis);
  lines.push("");
  lines.push(`## Positioning`);
  lines.push(`- One-liner: ${r.positioning.one_liner}`);
  lines.push(`- Category: ${r.positioning.category}`);
  lines.push(`- Against: ${r.positioning.against}`);
  lines.push("");
  lines.push(`## Riskiest assumption`);
  lines.push(r.riskiest_assumption.assumption);
  lines.push(`Cheap test: ${r.riskiest_assumption.cheap_test}`);
  lines.push("");
  lines.push(`## Audience targeting`);
  lines.push(`- Primary ICP: ${r.audience_targeting.primary_icp}`);
  lines.push(`- Primary channels: ${r.audience_targeting.primary_channels.join(", ")}`);
  if (r.audience_targeting.where_not_to_post?.length) {
    lines.push(`- Where not to post: ${r.audience_targeting.where_not_to_post.join(", ")}`);
  }
  lines.push("");
  lines.push(`## Pre-launch (${r.phases.pre_launch.duration_days} days)`);
  if (r.phases.pre_launch.goals?.length) {
    lines.push(`Goals:`);
    r.phases.pre_launch.goals.forEach((g) => lines.push(`- ${g}`));
  }
  if (r.phases.pre_launch.milestones?.length) {
    lines.push(`Milestones:`);
    r.phases.pre_launch.milestones.forEach((m) =>
      lines.push(`- ${m.day}: ${m.task} (owner: ${m.owner}, ${m.effort_hours}h) → ${m.deliverable}`)
    );
  }
  lines.push("");
  lines.push(`## Launch day (hour by hour)`);
  r.phases.launch_day.hour_by_hour.forEach((h) =>
    lines.push(`- ${h.time}: ${h.action} (${h.channel})${h.asset_needed ? ` — asset: ${h.asset_needed}` : ""}`)
  );
  lines.push("");
  lines.push(`## First 30 days`);
  r.phases.first_30_days.weekly_focus.forEach((w) => {
    lines.push(`**Week ${w.week}:** ${w.theme}`);
    w.activities?.forEach((p) => lines.push(`- ${p}`));
    if (w.leading_indicator) lines.push(`Leading indicator: ${w.leading_indicator}`);
  });
  lines.push("");
  lines.push(`## Assets to create`);
  r.assets_to_create.forEach((a) =>
    lines.push(`- ${a.asset} (owner: ${a.owner}, by ${a.deadline}): ${a.purpose}`)
  );
  lines.push("");
  lines.push(`## Channel plays`);
  r.channel_plays.forEach((c) =>
    lines.push(`- ${c.channel} (${c.effort}): ${c.play} → ${c.expected_outcome}`)
  );
  lines.push("");
  lines.push(`## Success metrics`);
  lines.push(`**North star:** ${r.success_metrics.north_star}`);
  const renderTargets = (label: string, targets: MetricTarget[]) => {
    if (!targets?.length) return;
    lines.push(`**${label}:**`);
    targets.forEach((t) => lines.push(`- ${t.metric} → ${t.target}`));
  };
  renderTargets("Day 1", r.success_metrics.day_1_targets);
  renderTargets("Day 7", r.success_metrics.day_7_targets);
  renderTargets("Day 30", r.success_metrics.day_30_targets);
  if (r.gaps?.length) {
    lines.push("");
    lines.push(`## Gaps`);
    r.gaps.forEach((g) => lines.push(`- ${g}`));
  }
  return lines.join("\n");
}
