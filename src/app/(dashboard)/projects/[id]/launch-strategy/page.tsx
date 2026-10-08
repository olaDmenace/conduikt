"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  Sparkles,
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
} from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
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
  const searchParams = useSearchParams();

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
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
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

  // Load a saved launch plan from ?assetId= param.
  useEffect(() => {
    const assetId = searchParams.get("assetId");
    if (!assetId) return;
    setLoadingAsset(true);
    fetch(`/api/projects/${projectId}/assets/${assetId}`)
      .then((r) => r.json())
      .then((asset) => {
        const saved = asset?.content?.plan as LaunchResult | undefined;
        if (saved?.positioning && saved?.phases) {
          setResult(saved);
          setSavedId(assetId);
        } else {
          toast("That asset doesn't look like a launch plan.", "warning");
        }
      })
      .catch(() => toast("Could not load saved launch plan", "error"))
      .finally(() => setLoadingAsset(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          toast("The plan came back in the wrong shape. Try again.", "warning");
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
      if (res.ok) {
        const saved = await res.json();
        setSavedId(saved.id);
        toast("Launch plan saved to library", "success");
      } else toast("Failed to save", "error");
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
      <div className="space-y-6" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div>
        <PageHeader
          title="Launch Plan"
          description="A day-by-day launch plan: before launch, launch day and the first 30 days"
        />
        <div className="rounded-lg border border-line bg-surface p-10 text-center animate-in">
          <Lock className="mx-auto mb-4 h-6 w-6 text-text-3" />
          <h3 className="text-heading text-text mb-2">
            Upgrade to use Launch Plan
          </h3>
          <p className="text-body text-text-2 max-w-md mx-auto mb-6">
            Get a launch plan with clear tasks and owners, built around your audience and goals.
            Available on Pro, Growth, and Agency plans.
          </p>
          <Button asChild>
            <Link href="/settings/billing">
              Upgrade plan <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Launch Plan"
        description="A day-by-day launch plan: before launch, launch day and the first 30 days"
      />

      <ExpectationBanner
        storageKey="conduikt-expect-launch"
        message="We write the plan; you carry it out. Give every task an owner and a date on your calendar before launch day."
        details={[
          "The riskiest guess is the one thing to test cheaply before you launch.",
          "If a channel isn't in the plan, it's probably not worth spreading yourself thin on it.",
          "Check your numbers on day 7. If early signs are flat, change tactics, not targets.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Form */}
        <div className="rounded-lg border border-line bg-surface p-6 animate-in h-fit">
          <div className="flex items-center gap-3 mb-5">
            <Rocket className="h-4 w-4 shrink-0 text-text-3" />
            <div>
              <p className="text-title text-text">Brief</p>
              <p className="text-caption text-text-3">
                Leave blank to use what we know about your project
              </p>
            </div>
          </div>

          <FormField label="Product / what you&apos;re launching">
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. 'AI blog agent'"
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </FormField>

          <FormField label="Launch date (optional)">
            <input
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </FormField>

          <FormField label="Team size">
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </FormField>

          <FormField label="Preferred channels (optional)">
            <input
              value={channels}
              onChange={(e) => setChannels(e.target.value)}
              placeholder="e.g. 'Product Hunt, X, Indie Hackers'"
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </FormField>

          <FormField label="Launch goals (optional)">
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. '500 signups, 50 paid, 3 press mentions'"
              rows={2}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
            />
          </FormField>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full mt-2"
          >
            {!generating && <Sparkles className="h-4 w-4" />}
            {generating ? "Building plan…" : "Make my launch plan"}
          </Button>
        </div>

        {/* Output */}
        <div className="min-w-0">
          {!result && !generating && loadingAsset && (
            <div className="space-y-4" role="status" aria-label="Loading saved launch plan">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {!result && !generating && !loadingAsset && (
            <div className="rounded-lg border border-dashed border-line py-20 px-6 text-center animate-in">
              <Rocket className="mx-auto mb-4 h-8 w-8 text-text-3" />
              <p className="text-body text-text-2 max-w-sm mx-auto">
                No plan yet. Fill in the brief (every field is optional) and make your plan.
              </p>
            </div>
          )}

          {generating && !result && (
            <div className="rounded-lg border border-line bg-surface p-10 animate-in text-center">
              <p className="flex items-center justify-center gap-2 text-title text-text">
                <span className="live-dot" aria-hidden />
                Building your launch plan…
              </p>
              <p className="text-body-s text-text-3 mt-2 max-w-sm mx-auto">
                We&apos;re working out how to pitch it, what to prepare, the launch-day schedule and your 30-day targets.
              </p>
            </div>
          )}

          {!generating && !result && rawText && (
            <div className="rounded-lg border border-accent bg-surface p-6 animate-in space-y-2">
              <p className="text-body-s text-text font-medium">
                We got an answer but couldn&apos;t turn it into a launch plan.
              </p>
              <Button size="sm" variant="outline" onClick={handleGenerate}>
                Try again
              </Button>
              <details className="text-body-s">
                <summary className="cursor-pointer text-text-3 hover:text-text">
                  Show raw output
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-caption text-text-2 font-mono break-words max-h-[320px] overflow-y-auto">
                  {rawText}
                </pre>
              </details>
            </div>
          )}

          {result && (
            <div className="space-y-5 animate-in">
              {/* Thesis + actions */}
              <div className="rounded-lg bg-ink p-5 text-ink-text">
                <p className="text-label text-ink-text-3 mb-2">The big idea</p>
                <p className="text-body text-ink-text leading-relaxed mb-4">
                  {result.launch_thesis}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline-ink"
                    onClick={savePlan}
                    disabled={!!savedId}
                  >
                    {savedId ? (
                      <Check className="h-3.5 w-3.5 text-ink-teal" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {savedId ? "Saved to library" : "Save to library"}
                  </Button>
                  <Button size="sm" variant="outline-ink" onClick={copyPlan}>
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-ink-teal" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy plan
                  </Button>
                </div>
              </div>

              {/* Positioning */}
              <SectionCard title="How to pitch it" icon={Target}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <KeyValue label="One-liner" value={result.positioning.one_liner} />
                  <KeyValue label="Category" value={result.positioning.category} />
                  <KeyValue label="Up against" value={result.positioning.against} />
                </div>
              </SectionCard>

              {/* Riskiest assumption */}
              <SectionCard title="Riskiest guess" icon={AlertTriangle} accent="warning">
                <p className="text-body text-text mb-2">
                  {result.riskiest_assumption.assumption}
                </p>
                <div className="rounded-md border border-line bg-ground p-3">
                  <p className="text-label text-text-3 mb-1.5">Cheap way to test it</p>
                  <p className="text-body-s text-text-2">
                    {result.riskiest_assumption.cheap_test}
                  </p>
                </div>
              </SectionCard>

              {/* Audience targeting */}
              <SectionCard title="Who to reach" icon={Users}>
                <KeyValue
                  label="Ideal customer"
                  value={result.audience_targeting.primary_icp}
                />
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-label text-text-3 mb-1.5">
                      Main channels
                    </p>
                    <ul className="space-y-1">
                      {result.audience_targeting.primary_channels.map((c) => (
                        <li key={c} className="text-body-s text-text-2 flex items-start gap-1.5">
                          <span className="text-text-3 shrink-0">·</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {result.audience_targeting.where_not_to_post.length > 0 && (
                    <div>
                      <p className="text-label text-text-3 mb-1.5">
                        Skip these
                      </p>
                      <ul className="space-y-1">
                        {result.audience_targeting.where_not_to_post.map((c) => (
                          <li key={c} className="text-body-s text-text-3 flex items-start gap-1.5">
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
                title={`Before launch (${result.phases.pre_launch.duration_days} days)`}
                icon={Calendar}
              >
                <div className="mb-3">
                  <p className="text-label text-text-3 mb-1.5">Goals</p>
                  <ul className="space-y-0.5">
                    {result.phases.pre_launch.goals.map((g, i) => (
                      <li key={i} className="text-body-s text-text-2 flex items-start gap-1.5">
                        <span className="text-text-3 shrink-0">·</span>{g}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  {result.phases.pre_launch.milestones.map((m, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-line bg-ground p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <Badge variant="secondary">
                          {m.day}
                        </Badge>
                        <div className="flex items-center gap-2 text-caption text-text-3">
                          <span className="capitalize">{m.owner}</span>
                          <span>·</span>
                          <span className="font-mono">{m.effort_hours}h</span>
                        </div>
                      </div>
                      <p className="text-title text-text mb-1">
                        {m.task}
                      </p>
                      <p className="text-body-s text-text-2">
                        You end up with: {m.deliverable}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Launch day */}
              <SectionCard title="Launch day, hour by hour" icon={Clock}>
                <div className="space-y-2">
                  {result.phases.launch_day.hour_by_hour.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-md border border-line bg-ground p-3"
                    >
                      <Badge
                        variant="secondary"
                        className="shrink-0"
                      >
                        {h.time}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-title text-text">
                          {h.action}
                        </p>
                        <p className="text-caption text-text-3 mt-0.5">
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
                      className="rounded-md border border-line bg-ground p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          Week {w.week}
                        </Badge>
                        <p className="text-title text-text">
                          {w.theme}
                        </p>
                      </div>
                      <ul className="space-y-0.5 mb-2">
                        {w.activities.map((a, i) => (
                          <li key={i} className="text-body-s text-text-2 flex items-start gap-1.5">
                            <span className="text-text-3 shrink-0">·</span>{a}
                          </li>
                        ))}
                      </ul>
                      <p className="text-caption text-text-3">
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
                        className="rounded-md border border-line bg-ground p-3"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <p className="text-title text-text">
                            {a.asset}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {a.deadline}
                            </Badge>
                            {a.linked_skill && (
                              <Badge variant="info">
                                {a.linked_skill}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-body-s text-text-2">{a.purpose}</p>
                        <p className="text-caption text-text-3 mt-1 capitalize">
                          Owner: {a.owner}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Channel plays */}
              {result.channel_plays.length > 0 && (
                <SectionCard title="What to do on each channel">
                  <div className="space-y-2">
                    {result.channel_plays.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-line bg-ground p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <p className="text-title text-text">
                            {c.channel}
                          </p>
                          <Badge
                            variant={
                              c.effort === "low"
                                ? "success"
                                : c.effort === "high"
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {c.effort} effort
                          </Badge>
                        </div>
                        <p className="text-body-s text-text-2 mb-1">
                          {c.play}
                        </p>
                        <p className="text-caption text-text-3">
                          Expected: {c.expected_outcome}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Success metrics */}
              <SectionCard title="How you'll measure it" icon={TrendingUp} accent="success">
                <div className="rounded-md border border-accent bg-surface p-3 mb-3">
                  <p className="text-label text-text-3 mb-1.5">The one number that matters</p>
                  <p className="text-title text-text">
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
                <SectionCard title="What we didn't know" icon={AlertTriangle} accent="warning">
                  <p className="text-body-s text-text-2 mb-2">
                    Fill these in and run it again for a stronger plan:
                  </p>
                  <ul className="space-y-1">
                    {result.gaps.map((g, i) => (
                      <li
                        key={i}
                        className="text-body-s text-text-2 flex items-start gap-1.5"
                      >
                        <span className="text-text-3 shrink-0">·</span>{g}
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
      <label className="text-body-s font-medium text-text-2 mb-1.5 block">
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
      ? "text-accent"
      : accent === "success"
        ? "text-teal"
        : "text-text-3";
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
        <h3 className="text-heading text-text">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-label text-text-3 mb-1.5">{label}</p>
      <p className="text-body text-text">{value}</p>
    </div>
  );
}

function MetricCol({ label, targets }: { label: string; targets: MetricTarget[] }) {
  return (
    <div className="rounded-md border border-line bg-ground p-3">
      <p className="text-label text-text-3 mb-2">{label}</p>
      <ul className="space-y-1.5">
        {targets.map((t, i) => (
          <li key={i} className="text-body-s">
            <p className="text-text-2">{t.metric}</p>
            <p className="text-text font-mono text-caption">{t.target}</p>
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
