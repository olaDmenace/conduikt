"use client";

import { useState, use, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Zap,
  Target,
  BarChart3,
  TrendingUp,
  Mail,
  Globe,
  Hash,
  ArrowUpRight,
  CheckSquare,
  Save,
  ChevronDown,
  ChevronUp,
  Check,
  Download,
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
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";

import { useToast } from "@/src/components/ui/toast";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";

// ---------- types ----------

interface PlaybookAction {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  description: string;
  conduikt_tool: string;
  conduikt_route: string;
  success_metric: string;
}

interface PlaybookPhase {
  phase: number;
  name: string;
  timeline: string;
  theme: string;
  actions: PlaybookAction[];
  phase_kpi: string;
}

interface GrowthLever {
  lever: string;
  current_state: string;
  target_state: string;
  key_actions: string[];
}

interface GrowthPlaybook {
  title: string;
  executive_summary: string;
  phases: PlaybookPhase[];
  growth_levers: GrowthLever[];
  week_1_checklist: string[];
}

// ---------- helpers ----------

const categoryConfig: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  seo:        { label: "SEO",        icon: Globe,     color: "text-info bg-info/10 border-info/20"              },
  content:    { label: "Content",    icon: Hash,      color: "text-accent bg-accent-muted border-accent/20"     },
  social:     { label: "Social",     icon: TrendingUp, color: "text-accent-secondary bg-accent-secondary/10 border-accent-secondary/20" },
  email:      { label: "Email",      icon: Mail,      color: "text-warning bg-warning/10 border-warning/20"     },
  conversion: { label: "Conversion", icon: Target,    color: "text-success bg-success/10 border-success/20"    },
  analytics:  { label: "Analytics",  icon: BarChart3, color: "text-text-secondary bg-surface-2 border-border-default" },
};

const priorityDot: Record<string, string> = {
  critical: "bg-error",
  high: "bg-warning",
  medium: "bg-info",
};

const effortImpactColor: Record<string, string> = {
  low:    "text-success",
  medium: "text-warning",
  high:   "text-error",
};

function ActionCard({
  action,
  projectId,
  checked,
  onCheck,
}: {
  action: PlaybookAction;
  projectId: string;
  checked: boolean;
  onCheck: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryConfig[action.category] ?? categoryConfig.content;
  const CatIcon = cat.icon;

  return (
    <div
      className={`rounded-lg border bg-surface-1 transition-colors ${
        checked ? "border-success/30 opacity-70" : "border-border-default"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={onCheck}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            checked
              ? "border-success bg-success/20 text-success"
              : "border-border-strong hover:border-accent"
          }`}
        >
          {checked && <Check className="h-3 w-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-caption ${cat.color}`}>
                  <CatIcon className="h-3 w-3" />
                  {cat.label}
                </span>
                <span className="inline-flex items-center gap-1.5 text-caption text-text-tertiary">
                  <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[action.priority]}`} />
                  {action.priority}
                </span>
                <span className="text-caption text-text-tertiary">
                  Effort: <span className={effortImpactColor[action.effort]}>{action.effort}</span>
                </span>
                <span className="text-caption text-text-tertiary">
                  Impact: <span className={effortImpactColor[action.impact] === "text-error" ? "text-success" : effortImpactColor[action.impact]}>{action.impact}</span>
                </span>
              </div>
              <p className={`text-body font-medium ${checked ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                {action.title}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/projects/${projectId}/${action.conduikt_route}`}
                className="flex items-center gap-1 rounded-md border border-border-default bg-surface-0 px-2.5 py-1 text-caption text-text-secondary hover:border-accent/40 hover:text-accent transition-colors whitespace-nowrap"
              >
                {action.conduikt_tool}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-small text-text-secondary">{action.description}</p>
              <div className="flex items-start gap-1.5 rounded-md bg-surface-0 border border-border-subtle px-3 py-2">
                <Target className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-tertiary" />
                <p className="text-small text-text-tertiary">
                  <span className="text-text-secondary font-medium">Success metric:</span> {action.success_metric}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- component ----------

function GrowthPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [primaryGoal, setPrimaryGoal] = useState("");
  const [challenge, setChallenge] = useState("");

  const [generating, setGenerating] = useState(false);
  const [rawText, setRawText] = useState("");
  const [playbook, setPlaybook] = useState<GrowthPlaybook | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");

  // Track checked actions
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  // Fetch user plan for save gating
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => setUserPlan(p?.plan ?? "free"))
      .catch(() => {});
  }, []);

  // Load saved playbook from ?assetId= param
  useEffect(() => {
    const assetId = searchParams.get("assetId");
    if (!assetId) return;
    setLoadingAsset(true);
    fetch(`/api/projects/${projectId}/assets/${assetId}`)
      .then((r) => r.json())
      .then((asset) => {
        const parsed = asset?.content?.parsed as GrowthPlaybook | undefined;
        if (parsed?.phases) {
          setPlaybook(parsed);
          setSavedId(assetId);
          setExpandedPhase(1);
        }
      })
      .catch(() => toast("Could not load saved playbook", "error"))
      .finally(() => setLoadingAsset(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setRawText("");
    setPlaybook(null);
    setChecked(new Set());
    setSavedId(null);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "growth-playbook",
          projectId,
          input: {
            primaryGoal: primaryGoal || undefined,
            challenge: challenge || undefined,
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

      try {
        const parsed = parseJsonResponse(fullText) as GrowthPlaybook;
        setPlaybook(parsed);
        setExpandedPhase(1);
        toast("Growth playbook ready!", "success");
      } catch (parseErr) {
        console.warn("[playbook] parse failed:", parseErr, "raw head:", fullText.slice(0, 300));
        toast("Playbook generated but formatting looked off. Try regenerating.", "warning");
      }
    } catch (err) {
      toast(String(err), "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!playbook) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "growth_playbook",
        channel: "web",
        title: playbook.title,
        content: { skill: "growth-playbook", parsed: playbook },
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setSavedId(saved.id);
      toast("Playbook saved!", "success");
    } else {
      toast("Failed to save", "error");
    }
    setSaving(false);
  }

  const totalActions = playbook?.phases.reduce((sum, p) => sum + p.actions.length, 0) ?? 0;
  const completedActions = checked.size;

  return (
    <div>
      <PageHeader
        title="Growth Playbook"
        description="AI-generated 90-day growth plan with prioritised actions across SEO, content, and conversion"
      />


      <ExpectationBanner
        storageKey="conduikt-expect-growth"
        message="This is a 90-day plan for a reason — real growth compounds over time, not overnight. Treat this as a roadmap, not a quick fix."
        details={[
          "Start with Phase 1 actions. Don't skip ahead — each phase builds on the last.",
          "Check off actions as you complete them to track your momentum.",
          "Re-generate the playbook in a few weeks to get updated recommendations based on progress.",
        ]}
      />

      {/* Input form */}
      {!playbook && (
        <Card className="mb-8 animate-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Generate Your 90-Day Playbook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-small text-text-secondary block mb-1.5">
                  Primary Growth Goal
                </label>
                <input
                  type="text"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  placeholder="e.g. Increase organic traffic by 50% in 90 days"
                  className="w-full rounded-lg border border-border-default bg-surface-1 px-4 py-2.5 text-body text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                />
              </div>
              <div>
                <label className="text-small text-text-secondary block mb-1.5">
                  Biggest Challenge (optional)
                </label>
                <input
                  type="text"
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  placeholder="e.g. Low domain authority, no content published yet"
                  className="w-full rounded-lg border border-border-default bg-surface-1 px-4 py-2.5 text-body text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                />
              </div>
              <Button type="submit" disabled={generating} className="w-full sm:w-auto">
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Building playbook…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate Playbook</>
                )}
              </Button>
            </form>

            {generating && rawText && (
              <div className="mt-4 rounded-lg bg-surface-0 border border-border-default p-3 max-h-24 overflow-hidden">
                <p className="text-small font-mono text-text-tertiary line-clamp-3">{rawText}</p>
              </div>
            )}

            {!generating && !playbook && rawText && (
              <div className="mt-4 rounded-lg bg-surface-0 border border-warning/30 p-4 space-y-2">
                <p className="text-small text-text-primary font-medium">
                  We got a response but couldn&apos;t format it into a playbook. You can retry below.
                </p>
                <details className="text-small">
                  <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
                    Show raw output
                  </summary>
                  <pre className="mt-2 font-mono text-xs text-text-tertiary whitespace-pre-wrap max-h-48 overflow-auto">{rawText}</pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Playbook output */}
      {playbook && (
        <div className="space-y-6">
          {/* Header bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 animate-in">
            <div>
              <h2 className="text-h2 text-text-primary">{playbook.title}</h2>
              <p className="text-small text-text-tertiary mt-0.5">
                {completedActions}/{totalActions} actions completed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setPlaybook(null); setRawText(""); }}
              >
                Regenerate
              </Button>
              {userPlan === "free" ? (
                <Link href="/settings/billing">
                  <Button size="sm" variant="secondary">
                    <TrendingUp className="h-4 w-4" />
                    Upgrade to Save
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !!savedId}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedId ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {savedId ? "Saved" : "Save Playbook"}
                  </Button>
                  {savedId && (
                    <PdfDownloadButton
                      href={`/api/projects/${projectId}/assets/${savedId}/pdf`}
                      filename="growth-playbook.pdf"
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden animate-in">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: totalActions ? `${(completedActions / totalActions) * 100}%` : "0%" }}
            />
          </div>

          {/* Executive summary */}
          <Card className="animate-in" style={{ animationDelay: "60ms" }}>
            <CardContent className="py-4">
              <p className="text-body text-text-secondary leading-relaxed">{playbook.executive_summary}</p>
            </CardContent>
          </Card>

          {/* Week 1 checklist */}
          {playbook.week_1_checklist?.length > 0 && (
            <Card className="border-accent/30 animate-in" style={{ animationDelay: "120ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-h3">
                  <CheckSquare className="h-5 w-5 text-accent" />
                  Week 1 — Start Here
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {playbook.week_1_checklist.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-body text-text-secondary animate-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-caption font-bold text-accent mt-0.5">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Phases */}
          {playbook.phases.map((phase, pi) => (
            <Card
              key={phase.phase}
              className="animate-in"
              style={{ animationDelay: `${(pi + 3) * 60}ms` }}
            >
              <CardHeader
                className="cursor-pointer pb-3"
                onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-small">
                      {phase.phase}
                    </div>
                    <div>
                      <CardTitle className="text-h3">{phase.name}</CardTitle>
                      <p className="text-caption text-text-tertiary">{phase.timeline} · {phase.theme}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{phase.actions.length} actions</Badge>
                    <span className="text-text-tertiary">
                      {expandedPhase === phase.phase ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </div>
                </div>
              </CardHeader>

              {expandedPhase === phase.phase && (
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-start gap-2 rounded-lg bg-surface-0 border border-border-subtle px-3 py-2 mb-4">
                    <Target className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-tertiary" />
                    <p className="text-small text-text-secondary">
                      <span className="font-medium text-text-primary">Phase KPI:</span> {phase.phase_kpi}
                    </p>
                  </div>
                  {phase.actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      projectId={projectId}
                      checked={checked.has(action.id)}
                      onCheck={() => toggleCheck(action.id)}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          ))}

          {/* Growth levers */}
          {playbook.growth_levers?.length > 0 && (
            <Card className="animate-in">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-h3">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Growth Levers
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {playbook.growth_levers.map((lever, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border-default bg-surface-0 p-4 animate-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <h4 className="text-body font-semibold text-text-primary mb-2">{lever.lever}</h4>
                    <div className="space-y-1.5 text-small">
                      <p className="text-text-tertiary">
                        <span className="text-error font-medium">Now:</span> {lever.current_state}
                      </p>
                      <p className="text-text-tertiary">
                        <span className="text-success font-medium">Goal:</span> {lever.target_state}
                      </p>
                    </div>
                    {lever.key_actions?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {lever.key_actions.map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-small text-text-secondary">
                            <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading saved asset */}
      {loadingAsset && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!playbook && !generating && !loadingAsset && (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted">
              <TrendingUp className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-h3 text-text-primary mb-2">Your 90-day growth roadmap</h3>
            <p className="text-body text-text-secondary max-w-md">
              Fill in your goal above and generate a personalised playbook with prioritised actions across SEO, content, social, email, and conversion.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GrowthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-accent animate-spin" /></div>}>
      <GrowthPageInner params={params} />
    </Suspense>
  );
}
