"use client";

import { useState, use, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
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
} from "@/src/components/ui/lucide-icons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { PageHeader } from "@/src/components/layout/page-header";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";

import { useToast } from "@/src/components/ui/toast";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
import { SavedAssetsPanel } from "@/src/components/agents/saved-assets-panel";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";
import { buildPlaybookActionHref } from "@/src/lib/playbook-action-route";

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
  seo:        { label: "Search",     icon: Globe,      color: "text-text-2 bg-surface-2" },
  content:    { label: "Content",    icon: Hash,       color: "text-text-2 bg-surface-2" },
  social:     { label: "Social",     icon: TrendingUp, color: "text-text-2 bg-surface-2" },
  email:      { label: "Email",      icon: Mail,       color: "text-text-2 bg-surface-2" },
  conversion: { label: "Conversion", icon: Target,     color: "text-text-2 bg-surface-2" },
  analytics:  { label: "Analytics",  icon: BarChart3,  color: "text-text-2 bg-surface-2" },
};

const priorityDot: Record<string, string> = {
  critical: "bg-danger",
  high: "bg-accent",
  medium: "bg-text-3",
};

const effortImpactColor: Record<string, string> = {
  low:    "text-teal",
  medium: "text-accent",
  high:   "text-danger",
};

function ActionCard({
  action,
  projectId,
  checked,
  onCheck,
  onAutoExecute,
  autoBusyChannel,
}: {
  action: PlaybookAction;
  projectId: string;
  checked: boolean;
  onCheck: () => void;
  onAutoExecute: (action: PlaybookAction, channel: "x" | "linkedin") => void;
  autoBusyChannel: "x" | "linkedin" | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryConfig[action.category] ?? categoryConfig.content;
  const CatIcon = cat.icon;
  // Auto-execute is only wired for social actions for now — that's the
  // surface we have publish handlers for.
  const showAutoExecute = action.category === "social";

  return (
    <div
      className={`rounded-lg border bg-surface transition-colors ${
        checked ? "border-line opacity-70" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={onCheck}
          aria-label={checked ? `Mark "${action.title}" not done` : `Mark "${action.title}" done`}
          aria-pressed={checked}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] ${
            checked
              ? "border-teal bg-teal text-white"
              : "border-line-strong hover:border-accent"
          }`}
        >
          {checked && <Check className="h-3 w-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex h-[22px] items-center gap-1 rounded-sm px-2 font-mono text-[11px] uppercase tracking-wide ${cat.color}`}>
                  <CatIcon className="h-3 w-3" />
                  {cat.label}
                </span>
                <span className="inline-flex items-center gap-1.5 text-caption text-text-3">
                  <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[action.priority]}`} />
                  {action.priority}
                </span>
                <span className="text-caption text-text-3">
                  Effort: <span className={effortImpactColor[action.effort]}>{action.effort}</span>
                </span>
                <span className="text-caption text-text-3">
                  Impact: <span className={effortImpactColor[action.impact] === "text-danger" ? "text-teal" : effortImpactColor[action.impact]}>{action.impact}</span>
                </span>
              </div>
              <p className={`text-title ${checked ? "line-through text-text-3" : "text-text"}`}>
                {action.title}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={buildPlaybookActionHref(projectId, action)}
                className="flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-caption text-text-2 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:border-accent hover:text-text whitespace-nowrap"
              >
                {action.conduikt_tool}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "Hide details" : "Show details"}
                aria-expanded={expanded}
                className="p-1 text-text-3 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:text-text"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-body-s text-text-2">{action.description}</p>
              <div className="flex items-start gap-1.5 rounded-md bg-ground border border-line px-3 py-2">
                <Target className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-3" />
                <p className="text-body-s text-text-3">
                  <span className="text-text-2 font-medium">How you&apos;ll know it worked:</span> {action.success_metric}
                </p>
              </div>
              {showAutoExecute && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-caption text-text-3">
                    Do it for me:
                  </span>
                  <button
                    onClick={() => onAutoExecute(action, "x")}
                    disabled={autoBusyChannel !== null}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-caption text-text-2 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:border-accent hover:text-text disabled:opacity-50"
                  >
                    {autoBusyChannel !== "x" && <Zap className="h-3 w-3" />}
                    {autoBusyChannel === "x" ? "Writing…" : "Write for X"}
                  </button>
                  <button
                    onClick={() => onAutoExecute(action, "linkedin")}
                    disabled={autoBusyChannel !== null}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-caption text-text-2 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:border-accent hover:text-text disabled:opacity-50"
                  >
                    {autoBusyChannel !== "linkedin" && <Zap className="h-3 w-3" />}
                    {autoBusyChannel === "linkedin" ? "Writing…" : "Write for LinkedIn"}
                  </button>
                </div>
              )}
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
  // Auto-execute busy state — which action+channel is mid-flight, so we
  // can disable both buttons on that card and show a spinner.
  const [autoBusyAction, setAutoBusyAction] = useState<string | null>(null);
  const [autoBusyChannel, setAutoBusyChannel] = useState<"x" | "linkedin" | null>(
    null
  );

  async function handleAutoExecute(
    action: PlaybookAction,
    channel: "x" | "linkedin"
  ) {
    setAutoBusyAction(action.id);
    setAutoBusyChannel(channel);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/playbook/auto-execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionId: action.id,
            title: action.title,
            channel,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn't start that. Try again.", "error");
        return;
      }
      if (data.mode === "off") {
        toast(
          `Automatic posting is off for ${channel === "x" ? "X" : "LinkedIn"}. Turn it on in Settings → Automation.`,
          "info"
        );
        return;
      }
      toast(data.message || "Queued.", "success");
    } catch {
      toast("Couldn't reach the server. Try again.", "error");
    } finally {
      setAutoBusyAction(null);
      setAutoBusyChannel(null);
    }
  }

  // Fetch user plan for save gating
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => setUserPlan(p?.plan ?? "free"))
      .catch(() => {});
  }, []);

  // Load saved playbook from ?assetId= param. Also restores per-action
  // checkbox state from asset.content.completed_actions so reload doesn't
  // wipe progress.
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
          // Restore checkbox state if present.
          const completed = asset?.content?.completed_actions;
          if (Array.isArray(completed)) {
            setChecked(new Set(completed.filter((x) => typeof x === "string")));
          }
        }
      })
      .catch(() => toast("Could not load the saved plan", "error"))
      .finally(() => setLoadingAsset(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced persistence of checked-state to asset.content.completed_actions.
  // Only fires once the playbook is saved (savedId is set) — drafts in
  // memory keep their state in component state until the user explicitly
  // saves the playbook.
  useEffect(() => {
    if (!savedId) return;
    const handle = setTimeout(() => {
      // Re-fetch the existing content blob to merge our update without
      // clobbering the parsed playbook payload alongside it.
      fetch(`/api/projects/${projectId}/assets/${savedId}`)
        .then((r) => r.json())
        .then((asset) => {
          const nextContent = {
            ...(asset?.content ?? {}),
            completed_actions: Array.from(checked),
          };
          return fetch(`/api/projects/${projectId}/assets/${savedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: nextContent }),
          });
        })
        .catch(() => {
          // Don't toast on every flake — the next toggle will retry.
        });
    }, 800);
    return () => clearTimeout(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, savedId]);

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
      let streamError: string | null = null;

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
          } else if (data.type === "error") {
            streamError = data.error || "Generation failed";
          }
        }
      }

      if (streamError) {
        toast(streamError, "error");
        return;
      }

      try {
        const parsed = parseJsonResponse(fullText) as GrowthPlaybook;
        setPlaybook(parsed);
        setExpandedPhase(1);
        toast("Growth plan ready", "success");
      } catch (parseErr) {
        console.warn("[playbook] parse failed:", parseErr, "raw head:", fullText.slice(0, 300));
        toast("The plan came back in the wrong shape. Try again.", "warning");
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
      toast("Plan saved", "success");
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
        title="Growth Plan"
        description="A 90-day plan with the most useful actions first, across search, content and conversion"
      />


      <ExpectationBanner
        storageKey="conduikt-expect-growth"
        message="This is a 90-day plan for a reason. Real growth builds up over time. Treat it as a roadmap, not a quick fix."
        details={[
          "Start with phase 1. Don't skip ahead; each phase builds on the last.",
          "Check off actions as you complete them to track your momentum.",
          "Make a fresh plan in a few weeks to get advice based on your progress.",
        ]}
      />

      <div className="mb-6">
        <SavedAssetsPanel
          projectId={projectId}
          assetType="growth_playbook"
          title="Your saved plans"
          linkBuilder={(assetId) => `/projects/${projectId}/growth?assetId=${assetId}`}
          libraryHref={`/projects/${projectId}/library`}
          currentAssetId={savedId ?? undefined}
          emptyHint="Saved plans show here. Save a plan below to keep it for later."
        />
      </div>

      {/* Input form */}
      {!playbook && (
        <Card className="mb-8 animate-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-text-3" />
              Make your 90-day plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-body-s text-text-2 block mb-1.5">
                  Main goal
                </label>
                <input
                  type="text"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  placeholder="e.g. Increase organic traffic by 50% in 90 days"
                  className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </div>
              <div>
                <label className="text-body-s text-text-2 block mb-1.5">
                  Biggest challenge (optional)
                </label>
                <input
                  type="text"
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  placeholder="e.g. Low domain authority, no content published yet"
                  className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </div>
              <Button type="submit" disabled={generating} className="w-full sm:w-auto">
                {generating ? (
                  "Building your plan…"
                ) : (
                  <><Sparkles className="h-4 w-4" /> Make my plan</>
                )}
              </Button>
            </form>

            {generating && rawText && (
              <div className="mt-4 rounded-md bg-ground border border-line p-3 max-h-24 overflow-hidden">
                <p className="text-body-s font-mono text-text-3 line-clamp-3">{rawText}</p>
              </div>
            )}

            {!generating && !playbook && rawText && (
              <div className="mt-4 rounded-md bg-ground border border-accent p-4 space-y-2">
                <p className="text-body-s text-text font-medium">
                  We got an answer but couldn&apos;t turn it into a plan. Press Make my plan to try again.
                </p>
                <details className="text-body-s">
                  <summary className="cursor-pointer text-text-3 hover:text-text">
                    Show raw output
                  </summary>
                  <pre className="mt-2 font-mono text-caption text-text-3 whitespace-pre-wrap max-h-48 overflow-auto">{rawText}</pre>
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
              <h2 className="text-heading text-text">{playbook.title}</h2>
              <p className="text-body-s text-text-3 mt-0.5">
                <span className="font-mono">{completedActions} of {totalActions}</span> actions done
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPlaybook(null); setRawText(""); }}
              >
                Start over
              </Button>
              {userPlan === "free" ? (
                <Link href="/settings/billing">
                  <Button size="sm" variant="outline">
                    <TrendingUp className="h-4 w-4" />
                    Upgrade to save
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !!savedId}
                  >
                    {saving ? null : savedId ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving…" : savedId ? "Saved" : "Save plan"}
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
              className="h-full rounded-full bg-teal transition-all duration-500"
              style={{ width: totalActions ? `${(completedActions / totalActions) * 100}%` : "0%" }}
            />
          </div>

          {/* Executive summary */}
          <Card className="animate-in" style={{ animationDelay: "60ms" }}>
            <CardContent>
              <p className="text-body text-text-2 leading-relaxed">{playbook.executive_summary}</p>
            </CardContent>
          </Card>

          {/* Week 1 checklist */}
          {playbook.week_1_checklist?.length > 0 && (
            <Card emphasis className="animate-in" style={{ animationDelay: "120ms" }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-heading">
                  <CheckSquare className="h-4 w-4 text-accent" />
                  Week 1: start here
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {playbook.week_1_checklist.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-body text-text-2 animate-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-caption text-text-2 mt-0.5">
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-body-s text-ink-text">
                      {phase.phase}
                    </div>
                    <div>
                      <CardTitle className="text-heading">{phase.name}</CardTitle>
                      <p className="text-caption text-text-3">{phase.timeline} · {phase.theme}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{phase.actions.length} actions</Badge>
                    <span className="text-text-3">
                      {expandedPhase === phase.phase ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </div>
                </div>
              </CardHeader>

              {expandedPhase === phase.phase && (
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 rounded-md bg-ground border border-line px-3 py-2 mb-4">
                    <Target className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-3" />
                    <p className="text-body-s text-text-2">
                      <span className="font-medium text-text">Phase target:</span> {phase.phase_kpi}
                    </p>
                  </div>
                  {phase.actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      projectId={projectId}
                      checked={checked.has(action.id)}
                      onCheck={() => toggleCheck(action.id)}
                      onAutoExecute={handleAutoExecute}
                      autoBusyChannel={
                        autoBusyAction === action.id ? autoBusyChannel : null
                      }
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
                <CardTitle className="flex items-center gap-2 text-heading">
                  <TrendingUp className="h-4 w-4 text-text-3" />
                  Growth levers
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {playbook.growth_levers.map((lever, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-line bg-ground p-4 animate-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <h4 className="text-title text-text mb-2">{lever.lever}</h4>
                    <div className="space-y-1.5 text-body-s">
                      <p className="text-text-3">
                        <span className="text-text-2 font-medium">Now:</span> {lever.current_state}
                      </p>
                      <p className="text-text-3">
                        <span className="text-teal font-medium">Goal:</span> {lever.target_state}
                      </p>
                    </div>
                    {lever.key_actions?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {lever.key_actions.map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-body-s text-text-2">
                            <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-3" />
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
        <div className="space-y-4" role="status" aria-label="Loading plan">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {/* Empty state */}
      {!playbook && !generating && !loadingAsset && (
        <EmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title="No plan yet. Add your goal above and we'll make a 90-day plan across search, content, social, email and conversion."
        />
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
    <Suspense fallback={<div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full" /></div>}>
      <GrowthPageInner params={params} />
    </Suspense>
  );
}
