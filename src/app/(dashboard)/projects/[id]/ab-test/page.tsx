"use client";

import { useState, useEffect, use } from "react";
import {
  GitBranch,
  Loader2,
  Copy,
  Check,
  Save,
  Lock,
  ArrowUpRight,
  Sparkles,
  Target,
  AlertTriangle,
  ShieldCheck,
  Calculator,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";
import { useToast } from "@/src/components/ui/toast";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VariantDef {
  label: string;
  description: string;
  rationale: string;
}

interface GuardrailMetric {
  name: string;
  why_it_matters: string;
  stop_threshold: string;
}

interface TestPlan {
  hypothesis: {
    statement: string;
    mechanism: string;
    kill_criteria: string;
  };
  surface: {
    page_or_flow: string;
    audience_segment: string;
    exclusions: string[];
  };
  variants: VariantDef[];
  metrics: {
    primary: {
      name: string;
      definition: string;
      baseline_rate: string;
      minimum_detectable_effect: string;
    };
    guardrails: GuardrailMetric[];
    secondary: string[];
  };
  sample_size: {
    per_variant: string;
    total_required: string;
    math_shown: string;
    traffic_estimate_used: string;
    estimated_duration_days: number;
    viability: "ok" | "borderline" | "insufficient_traffic";
    viability_note: string;
  };
  decision_rules: {
    success: string;
    failure: string;
    inconclusive: string;
  };
  risks: { risk: string; mitigation: string }[];
  shipping_checklist: string[];
}

interface GeneratedCopy {
  label: string;
  content: string;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ABTestAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();

  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Input state
  const [hypothesis, setHypothesis] = useState("");
  const [surface, setSurface] = useState("");
  const [baselineRate, setBaselineRate] = useState("");
  const [trafficPerWeek, setTrafficPerWeek] = useState("");
  const [targetMDE, setTargetMDE] = useState("10");
  const [variantIdeas, setVariantIdeas] = useState("");

  // Plan state
  const [generating, setGenerating] = useState(false);
  const [rawText, setRawText] = useState("");
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [copiedPlan, setCopiedPlan] = useState(false);

  // Generated variant copy state
  const [copies, setCopies] = useState<Record<number, GeneratedCopy>>({});

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

  const isLocked = plan !== null && !["growth", "agency"].includes(plan);

  async function handleGeneratePlan() {
    if (!hypothesis.trim() || !surface.trim()) {
      toast("Hypothesis and surface are required.", "warning");
      return;
    }

    setGenerating(true);
    setTestPlan(null);
    setRawText("");
    setCopies({});

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "ab-test-setup",
          projectId,
          input: {
            hypothesis,
            surface,
            baselineRate: baselineRate || undefined,
            trafficPerWeek: trafficPerWeek || undefined,
            targetMDE: `${targetMDE}% relative lift`,
            variantIdeas: variantIdeas || undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to generate plan", "error");
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
          const parsed = parseJsonResponse(fullText) as TestPlan;
          setTestPlan(parsed);
          toast("Test plan ready", "success");
        } catch {
          toast("Output format was off. Check raw text.", "warning");
        }
      }
    } catch (err) {
      toast(String(err), "error");
    } finally {
      setGenerating(false);
    }
  }

  async function generateVariantCopy(index: number, variant: VariantDef) {
    if (!testPlan) return;
    setCopies((prev) => ({
      ...prev,
      [index]: { label: variant.label, content: "", loading: true },
    }));

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          agentId: "copywriting",
          input: {
            type: testPlan.surface.page_or_flow,
            context: `A/B test variant. Surface: ${testPlan.surface.page_or_flow}. Audience: ${testPlan.surface.audience_segment}. Variant: ${variant.description}. Rationale: ${variant.rationale}.`,
            goal: `Generate the actual content for this variant. Output ONLY the final copy, no explanation.`,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to generate copy", "error");
        setCopies((prev) => ({
          ...prev,
          [index]: { ...prev[index], loading: false },
        }));
        return;
      }

      const data = await res.json();
      const content =
        typeof data.data === "string"
          ? data.data
          : data.data?.raw ?? data.data?.copy ?? JSON.stringify(data.data ?? "");

      setCopies((prev) => ({
        ...prev,
        [index]: { label: variant.label, content, loading: false },
      }));
    } catch {
      toast("Failed to generate copy", "error");
      setCopies((prev) => ({
        ...prev,
        [index]: { ...prev[index], loading: false },
      }));
    }
  }

  async function saveVariant(index: number, variant: VariantDef) {
    const copy = copies[index];
    if (!copy || !copy.content || !testPlan) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "copy_block",
          channel: "web",
          title: `A/B ${variant.label} — ${testPlan.surface.page_or_flow}`,
          content: {
            raw: copy.content,
            variant_description: variant.description,
            hypothesis: testPlan.hypothesis.statement,
            skill: "ab-test",
          },
          status: "draft",
        }),
      });
      if (res.ok) toast(`${variant.label} saved`, "success");
      else toast("Save failed", "error");
    } catch {
      toast("Save failed", "error");
    }
  }

  async function generateAllVariantCopy() {
    if (!testPlan) return;
    for (let i = 0; i < testPlan.variants.length; i++) {
      if (copies[i]?.content) continue;
      await generateVariantCopy(i, testPlan.variants[i]);
    }
  }

  function copyPlanToClipboard() {
    if (!testPlan) return;
    const md = formatPlanAsMarkdown(testPlan);
    navigator.clipboard.writeText(md);
    setCopiedPlan(true);
    toast("Plan copied", "info");
    setTimeout(() => setCopiedPlan(false), 2000);
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
          title="A/B Test Planner"
          description="Rigorous A/B test design — hypothesis, sample size, and decision rules before you ship"
        />
        <div className="rounded-xl border border-border-default bg-surface-1 p-10 text-center animate-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
            <Lock className="h-7 w-7 text-text-tertiary" />
          </div>
          <h3 className="text-h3 text-text-primary mb-2">
            Upgrade to unlock A/B Test Planner
          </h3>
          <p className="text-body text-text-secondary max-w-md mx-auto mb-6">
            Design real experiments — hypothesis, sample size, decision rules — not just variant spinners.
            Available on Growth and Agency plans.
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
        title="A/B Test Planner"
        description="Rigorous A/B test design — hypothesis, sample size, and decision rules before you ship"
      />

      <ExpectationBanner
        storageKey="conduikt-expect-abtest"
        message="Most tests fail not because the variant was bad, but because the test was designed wrong. Always plan sample size BEFORE you start running traffic."
        details={[
          "A test that can't reach its sample size in 4 weeks is usually worse than no test — the signal gets lost.",
          "Pre-commit to success criteria. If you decide after the fact what 'winning' means, you're p-hacking.",
          "Run time must be a multiple of 7 days to average out weekday effects.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Input form */}
        <div className="rounded-xl border border-border-default bg-surface-1 p-6 animate-in h-fit">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <p className="text-body font-semibold text-text-primary">Test brief</p>
              <p className="text-caption text-text-tertiary">
                More inputs = more rigorous plan
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Growth+
            </Badge>
          </div>

          <Label>
            Hypothesis or question <span className="text-warning">*</span>
          </Label>
          <textarea
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="e.g. Adding social proof above the CTA will increase signup rate by 10%"
            rows={3}
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none mb-4"
          />

          <Label>
            Surface being tested <span className="text-warning">*</span>
          </Label>
          <input
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="e.g. Landing page hero, pricing page CTA"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none mb-4"
          />

          <Label>Baseline conversion rate</Label>
          <input
            value={baselineRate}
            onChange={(e) => setBaselineRate(e.target.value)}
            placeholder="e.g. 2.3% (last 30 days)"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none mb-4"
          />

          <Label>Weekly traffic to this surface</Label>
          <input
            value={trafficPerWeek}
            onChange={(e) => setTrafficPerWeek(e.target.value)}
            placeholder="e.g. 3000 visitors/week"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none mb-4"
          />

          <Label>Minimum detectable effect (relative)</Label>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number"
              min={1}
              max={100}
              value={targetMDE}
              onChange={(e) => setTargetMDE(e.target.value)}
              className="w-24 rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
            <span className="text-small text-text-tertiary">% lift</span>
          </div>

          <Label>Variant ideas (optional)</Label>
          <textarea
            value={variantIdeas}
            onChange={(e) => setVariantIdeas(e.target.value)}
            placeholder="Any specific variants you already have in mind"
            rows={2}
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none mb-5"
          />

          <Button
            onClick={handleGeneratePlan}
            disabled={generating || !hypothesis.trim() || !surface.trim()}
            className="w-full"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generating ? "Designing test..." : "Design Test Plan"}
          </Button>
        </div>

        {/* Output */}
        <div className="min-w-0">
          {!testPlan && !generating && (
            <div className="rounded-xl border border-border-default bg-surface-1 py-20 px-6 text-center animate-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
                <Target className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="text-body font-medium text-text-secondary mb-1">
                No test plan yet
              </p>
              <p className="text-small text-text-tertiary max-w-sm mx-auto">
                Fill in the brief and hit Design. You&apos;ll get a hypothesis,
                variants, sample size, and decision rules.
              </p>
            </div>
          )}

          {generating && !testPlan && (
            <div className="rounded-xl border border-border-default bg-surface-1 p-10 animate-in text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted mb-4">
                <Loader2 className="h-6 w-6 text-accent animate-spin" />
              </div>
              <p className="text-body font-semibold text-text-primary">
                Designing your test...
              </p>
              <p className="text-small text-text-tertiary mt-2 max-w-sm mx-auto">
                We&apos;re working out the hypothesis, sample size, variants, and
                decision rules. This usually takes about 20 seconds.
              </p>
            </div>
          )}

          {!generating && !testPlan && rawText && (
            <div className="rounded-xl border border-warning/30 bg-surface-1 p-6 animate-in space-y-2">
              <p className="text-small text-text-primary font-medium">
                We got a response but couldn&apos;t format it into a test plan. Try regenerating.
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

          {testPlan && (
            <div className="space-y-5 animate-in">
              {/* Viability banner */}
              <ViabilityBanner viability={testPlan.sample_size.viability} note={testPlan.sample_size.viability_note} />

              {/* Hypothesis */}
              <SectionCard title="Hypothesis" icon={Target}>
                <p className="text-body text-text-primary leading-relaxed mb-3">
                  {testPlan.hypothesis.statement}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
                    <p className="text-caption text-text-tertiary mb-1">Mechanism</p>
                    <p className="text-small text-text-secondary">
                      {testPlan.hypothesis.mechanism}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
                    <p className="text-caption text-text-tertiary mb-1">Kill criteria</p>
                    <p className="text-small text-text-secondary">
                      {testPlan.hypothesis.kill_criteria}
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Sample size */}
              <SectionCard title="Sample size & duration" icon={Calculator}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <KV label="Per variant" value={testPlan.sample_size.per_variant} />
                  <KV label="Total required" value={testPlan.sample_size.total_required} />
                  <KV
                    label="Est. duration"
                    value={`${testPlan.sample_size.estimated_duration_days} days`}
                  />
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-0 p-3 mb-2">
                  <p className="text-caption text-text-tertiary mb-1">Math</p>
                  <p className="text-small font-mono text-text-secondary">
                    {testPlan.sample_size.math_shown}
                  </p>
                </div>
                <p className="text-caption text-text-tertiary italic">
                  Based on: {testPlan.sample_size.traffic_estimate_used}
                </p>
              </SectionCard>

              {/* Variants */}
              <SectionCard title="Variants" icon={GitBranch}>
                {(() => {
                  const anyLoading = Object.values(copies).some((c) => c?.loading);
                  const allHaveCopy =
                    testPlan.variants.length > 0 &&
                    testPlan.variants.every((_, i) => copies[i]?.content);
                  return !allHaveCopy ? (
                    <div className="mb-4 rounded-lg border border-accent/30 bg-accent-muted p-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-small font-semibold text-text-primary">
                          Generate ready-to-ship copy for each variant
                        </p>
                        <p className="text-caption text-text-tertiary mt-0.5">
                          Turns the brief below into actual headlines, CTAs, or body copy you can paste in.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={generateAllVariantCopy}
                        disabled={anyLoading}
                      >
                        {anyLoading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                        )}
                        {anyLoading ? "Generating..." : "Generate copy for all"}
                      </Button>
                    </div>
                  ) : null;
                })()}

                <div className="space-y-3">
                  {testPlan.variants.map((v, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border-subtle bg-surface-0 p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px]"
                          >
                            {v.label}
                          </Badge>
                          <p className="text-body font-semibold text-text-primary">
                            {v.description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!copies[i] || (!copies[i].loading && !copies[i].content) ? (
                            <Button
                              size="sm"
                              onClick={() => generateVariantCopy(i, v)}
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1" />
                              Generate copy
                            </Button>
                          ) : null}
                          {copies[i]?.content && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(copies[i].content);
                                  toast("Copy copied", "info");
                                }}
                              >
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Copy
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => saveVariant(i, v)}
                              >
                                <Save className="h-3.5 w-3.5 mr-1" />
                                Save
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-small text-text-tertiary mb-2">
                        {v.rationale}
                      </p>

                      {copies[i]?.loading && (
                        <div className="flex items-center gap-2 text-small text-text-tertiary mt-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Generating copy...
                        </div>
                      )}
                      {copies[i]?.content && (
                        <div className="mt-3 rounded-lg border border-accent/20 bg-surface-1 p-3">
                          <p className="text-caption text-accent font-medium uppercase tracking-wider mb-1.5">
                            Ready-to-ship copy
                          </p>
                          <p className="whitespace-pre-wrap text-body text-text-primary leading-relaxed">
                            {copies[i].content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Metrics */}
              <SectionCard title="Metrics" icon={ShieldCheck}>
                <div className="rounded-lg border border-accent/30 bg-accent-muted p-3 mb-3">
                  <p className="text-caption text-text-tertiary mb-0.5">
                    Primary metric (decides the test)
                  </p>
                  <p className="text-body font-semibold text-text-primary">
                    {testPlan.metrics.primary.name}
                  </p>
                  <p className="text-small text-text-secondary mt-1">
                    {testPlan.metrics.primary.definition}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-caption text-text-tertiary">
                    <span>Baseline: {testPlan.metrics.primary.baseline_rate}</span>
                    <span>MDE: {testPlan.metrics.primary.minimum_detectable_effect}</span>
                  </div>
                </div>

                {testPlan.metrics.guardrails.length > 0 && (
                  <>
                    <p className="text-caption text-text-tertiary mb-2">
                      Guardrails (stop the test if violated)
                    </p>
                    <div className="space-y-2 mb-3">
                      {testPlan.metrics.guardrails.map((g, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border-subtle bg-surface-0 p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                            <p className="text-body font-medium text-text-primary">
                              {g.name}
                            </p>
                          </div>
                          <p className="text-small text-text-secondary">
                            {g.why_it_matters}
                          </p>
                          <p className="text-caption text-warning mt-1">
                            Stop if: {g.stop_threshold}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {testPlan.metrics.secondary.length > 0 && (
                  <>
                    <p className="text-caption text-text-tertiary mb-1.5">
                      Secondary (directional only)
                    </p>
                    <ul className="space-y-0.5">
                      {testPlan.metrics.secondary.map((s, i) => (
                        <li
                          key={i}
                          className="text-small text-text-secondary flex items-start gap-1.5"
                        >
                          <span className="text-accent shrink-0">·</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </SectionCard>

              {/* Decision rules */}
              <SectionCard title="Decision rules (pre-committed)" icon={FileCheck2}>
                <div className="space-y-2">
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                    <p className="text-caption text-success mb-0.5 font-semibold">
                      Success
                    </p>
                    <p className="text-small text-text-secondary">
                      {testPlan.decision_rules.success}
                    </p>
                  </div>
                  <div className="rounded-lg border border-error/30 bg-error/5 p-3">
                    <p className="text-caption text-error mb-0.5 font-semibold">
                      Failure
                    </p>
                    <p className="text-small text-text-secondary">
                      {testPlan.decision_rules.failure}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
                    <p className="text-caption text-text-tertiary mb-0.5 font-semibold">
                      Inconclusive
                    </p>
                    <p className="text-small text-text-secondary">
                      {testPlan.decision_rules.inconclusive}
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Risks */}
              {testPlan.risks.length > 0 && (
                <SectionCard title="Risks & mitigations" icon={AlertTriangle} accent="warning">
                  <div className="space-y-2">
                    {testPlan.risks.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border-subtle bg-surface-0 p-3"
                      >
                        <p className="text-body font-medium text-text-primary mb-1">
                          {r.risk}
                        </p>
                        <p className="text-small text-text-secondary">
                          Mitigation: {r.mitigation}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Shipping checklist */}
              {testPlan.shipping_checklist.length > 0 && (
                <SectionCard title="Shipping checklist" icon={FileCheck2}>
                  <ul className="space-y-1.5">
                    {testPlan.shipping_checklist.map((item, i) => (
                      <li
                        key={i}
                        className="text-small text-text-secondary flex items-start gap-2"
                      >
                        <span className="text-accent shrink-0">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {/* Copy plan as text */}
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={copyPlanToClipboard}>
                  {copiedPlan ? (
                    <Check className="h-3.5 w-3.5 mr-1 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  Copy plan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-small font-medium text-text-secondary mb-1.5 block">
      {children}
    </label>
  );
}

function ViabilityBanner({
  viability,
  note,
}: {
  viability: "ok" | "borderline" | "insufficient_traffic";
  note: string;
}) {
  const cfg = {
    ok: {
      border: "border-success/30",
      bg: "bg-success/5",
      icon: ShieldCheck,
      iconColor: "text-success",
      label: "Test is viable",
    },
    borderline: {
      border: "border-warning/30",
      bg: "bg-warning/5",
      icon: AlertTriangle,
      iconColor: "text-warning",
      label: "Borderline viable",
    },
    insufficient_traffic: {
      border: "border-error/30",
      bg: "bg-error/5",
      icon: AlertTriangle,
      iconColor: "text-error",
      label: "Insufficient traffic",
    },
  }[viability];

  const Icon = cfg.icon;
  return (
    <div
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex items-start gap-3`}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <div>
        <p className="text-body font-semibold text-text-primary">{cfg.label}</p>
        {note && (
          <p className="text-small text-text-secondary mt-1">{note}</p>
        )}
      </div>
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

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
      <p className="text-caption text-text-tertiary mb-0.5">{label}</p>
      <p className="text-body font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function formatPlanAsMarkdown(plan: TestPlan): string {
  const lines: string[] = [];
  lines.push(`# A/B Test Plan`);
  lines.push("");
  lines.push(`## Hypothesis`);
  lines.push(plan.hypothesis.statement);
  lines.push(`- Mechanism: ${plan.hypothesis.mechanism}`);
  lines.push(`- Kill criteria: ${plan.hypothesis.kill_criteria}`);
  lines.push("");
  lines.push(`## Surface`);
  lines.push(`- Page / flow: ${plan.surface.page_or_flow}`);
  lines.push(`- Audience: ${plan.surface.audience_segment}`);
  if (plan.surface.exclusions?.length) {
    lines.push(`- Exclusions: ${plan.surface.exclusions.join(", ")}`);
  }
  lines.push("");
  lines.push(`## Sample size`);
  lines.push(`- Per variant: ${plan.sample_size.per_variant}`);
  lines.push(`- Total required: ${plan.sample_size.total_required}`);
  lines.push(`- Estimated duration: ${plan.sample_size.estimated_duration_days} days`);
  lines.push(`- Viability: ${plan.sample_size.viability} — ${plan.sample_size.viability_note}`);
  lines.push(`- Math: ${plan.sample_size.math_shown}`);
  lines.push(`- Traffic estimate used: ${plan.sample_size.traffic_estimate_used}`);
  lines.push("");
  lines.push(`## Variants`);
  plan.variants.forEach((v) => {
    lines.push(`### ${v.label} — ${v.description}`);
    lines.push(`Rationale: ${v.rationale}`);
    lines.push("");
  });
  lines.push(`## Metrics`);
  lines.push(`**Primary:** ${plan.metrics.primary.name}`);
  lines.push(`- Definition: ${plan.metrics.primary.definition}`);
  lines.push(`- Baseline: ${plan.metrics.primary.baseline_rate}`);
  lines.push(`- MDE: ${plan.metrics.primary.minimum_detectable_effect}`);
  if (plan.metrics.guardrails.length) {
    lines.push("");
    lines.push(`**Guardrails:**`);
    plan.metrics.guardrails.forEach((g) => {
      lines.push(`- ${g.name} — stop if ${g.stop_threshold}. (${g.why_it_matters})`);
    });
  }
  if (plan.metrics.secondary.length) {
    lines.push("");
    lines.push(`**Secondary:** ${plan.metrics.secondary.join(", ")}`);
  }
  lines.push("");
  lines.push(`## Decision rules`);
  lines.push(`- Success: ${plan.decision_rules.success}`);
  lines.push(`- Failure: ${plan.decision_rules.failure}`);
  lines.push(`- Inconclusive: ${plan.decision_rules.inconclusive}`);
  if (plan.risks.length) {
    lines.push("");
    lines.push(`## Risks & mitigations`);
    plan.risks.forEach((r) => {
      lines.push(`- ${r.risk} → ${r.mitigation}`);
    });
  }
  if (plan.shipping_checklist.length) {
    lines.push("");
    lines.push(`## Shipping checklist`);
    plan.shipping_checklist.forEach((item) => {
      lines.push(`- [ ] ${item}`);
    });
  }
  return lines.join("\n");
}
