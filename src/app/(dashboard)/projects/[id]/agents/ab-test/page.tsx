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
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { ProjectNav } from "@/src/components/layout/project-nav";
import { useToast } from "@/src/components/ui/toast";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentType =
  | "social-post"
  | "email-subject"
  | "ad-copy"
  | "blog-headline"
  | "cta-button";

interface ScoreResult {
  total_score: number;
  clarity: number;
  relevance: number;
  engagement_potential: number;
  brand_alignment: number;
  summary: string;
}

interface VariantData {
  content: string;
  score: ScoreResult | null;
  scoring: boolean;
}

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "social-post", label: "Social Post" },
  { value: "email-subject", label: "Email Subject" },
  { value: "ad-copy", label: "Ad Copy" },
  { value: "blog-headline", label: "Blog Headline" },
  { value: "cta-button", label: "CTA Button Text" },
];

const VARIANT_LABELS = ["A", "B", "C"];

// ---------------------------------------------------------------------------
// Score gauge (inline — matches content-score-panel pattern)
// ---------------------------------------------------------------------------

function MiniGauge({ score, max, size = 48 }: { score: number; max: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score / max;
  const offset = circumference - pct * circumference;
  const color = pct > 0.75 ? "#4ADE80" : pct >= 0.5 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-caption font-bold font-mono text-text-primary">
        {score}
      </span>
    </div>
  );
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

  // Plan gating
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Form state
  const [contentType, setContentType] = useState<ContentType>("social-post");
  const [brief, setBrief] = useState("");
  const [variantCount, setVariantCount] = useState<2 | 3>(2);
  const [generating, setGenerating] = useState(false);

  // Results
  const [variants, setVariants] = useState<VariantData[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

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

  // Generate variants: first generate original via copywriting agent, then generate variants via existing API
  async function handleGenerate() {
    if (!brief.trim()) {
      toast("Please enter a brief describing what you want to test.", "error");
      return;
    }

    setGenerating(true);
    setVariants([]);
    setActiveTab(0);

    try {
      // Step 1: Generate original content using the AI generate endpoint
      const genRes = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          agentId: "copywriting",
          input: {
            type: CONTENT_TYPES.find((t) => t.value === contentType)?.label ?? contentType,
            context: brief,
            goal: `Generate a single ${CONTENT_TYPES.find((t) => t.value === contentType)?.label ?? contentType}. Output ONLY the final content, no explanations.`,
          },
        }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        toast(err.error || "Failed to generate content", "error");
        return;
      }

      const genData = await genRes.json();
      // Handle various response shapes from /api/ai/generate
      const originalContent =
        typeof genData.data === "string"
          ? genData.data
          : genData.data?.raw ?? genData.data?.copy ?? genData.result ?? genData.content ?? JSON.stringify(genData.data ?? "");

      if (!originalContent) {
        toast("No content was generated. Try a different brief.", "error");
        return;
      }

      // Step 2: Generate variants using the existing variant API
      const varRes = await fetch("/api/ai/generate-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          agentId: "copywriting",
          originalContent,
          variantCount: variantCount - 1, // -1 because original is variant A
        }),
      });

      if (!varRes.ok) {
        const err = await varRes.json();
        toast(err.error || "Failed to generate variants", "error");
        return;
      }

      const varData = await varRes.json();
      const allContent = [originalContent, ...(varData.variants ?? [])];

      // Initialize variant data
      const initial: VariantData[] = allContent.map((content: string) => ({
        content,
        score: null,
        scoring: true,
      }));
      setVariants(initial);

      // Step 3: Score each variant in the background
      for (let i = 0; i < allContent.length; i++) {
        scoreVariant(projectId, allContent[i], contentType, i);
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function scoreVariant(
    projId: string,
    content: string,
    type: string,
    index: number
  ) {
    try {
      const res = await fetch("/api/ai/score-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projId,
          content,
          contentType: type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVariants((prev) =>
          prev.map((v, i) =>
            i === index ? { ...v, score: data, scoring: false } : v
          )
        );
      } else {
        setVariants((prev) =>
          prev.map((v, i) =>
            i === index ? { ...v, scoring: false } : v
          )
        );
      }
    } catch {
      setVariants((prev) =>
        prev.map((v, i) =>
          i === index ? { ...v, scoring: false } : v
        )
      );
    }
  }

  function handleCopy(index: number) {
    navigator.clipboard.writeText(variants[index].content);
    setCopiedIdx(index);
    toast("Copied to clipboard", "info");
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function handleSave(index: number) {
    try {
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "copy_block",
          channel: "web",
          title: `A/B Test — Variant ${VARIANT_LABELS[index]} (${CONTENT_TYPES.find((t) => t.value === contentType)?.label})`,
          content: {
            raw: variants[index].content,
            skill: "ab-test",
            prompt: brief,
          },
          status: "draft",
        }),
      });

      if (res.ok) {
        toast(`Variant ${VARIANT_LABELS[index]} saved to library`, "success");
      } else {
        toast("Failed to save", "error");
      }
    } catch {
      toast("Failed to save", "error");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <ProjectNav projectId={projectId} />
      <PageHeader
        title="A/B Test Agent"
        description="Generate and compare content variants to find what resonates with your audience"
      />

      {/* Locked state for non-Growth/Agency users */}
      {isLocked && (
        <div className="rounded-xl border border-border-default bg-surface-1 p-10 text-center animate-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
            <Lock className="h-7 w-7 text-text-tertiary" />
          </div>
          <h3 className="text-h3 text-text-primary mb-2">
            Upgrade to unlock A/B Testing
          </h3>
          <p className="text-body text-text-secondary max-w-md mx-auto mb-6">
            A/B content variants help you test different angles and find what resonates.
            Available on Growth and Agency plans.
          </p>
          <Button asChild>
            <Link href="/settings/billing">
              Upgrade Plan
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {/* Main workspace — two-panel layout */}
      {!isLocked && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left panel — Input */}
          <div className="rounded-xl border border-border-default bg-surface-1 p-6 animate-in">
            {/* Agent header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <p className="text-body font-semibold text-text-primary">
                  A/B Test Agent
                </p>
                <p className="text-caption text-text-tertiary">
                  Test different content angles to optimize performance
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto text-[10px] capitalize">
                Growth+
              </Badge>
            </div>

            {/* Content type selector */}
            <label className="text-small font-medium text-text-secondary mb-2 block">
              What are we testing?
            </label>
            <div className="flex flex-wrap gap-2 mb-5">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setContentType(ct.value)}
                  className={`rounded-lg px-3 py-1.5 text-small font-medium transition-colors border ${
                    contentType === ct.value
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border-default bg-surface-0 text-text-secondary hover:border-border-strong"
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>

            {/* Brief */}
            <label className="text-small font-medium text-text-secondary mb-2 block">
              Brief
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe what you want to test. What is the goal? Who is the audience?"
              rows={5}
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none mb-5"
            />

            {/* Variant count */}
            <label className="text-small font-medium text-text-secondary mb-2 block">
              Number of variants
            </label>
            <div className="flex gap-2 mb-6">
              {([2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setVariantCount(n)}
                  className={`rounded-lg px-4 py-2 text-small font-medium transition-colors border ${
                    variantCount === n
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border-default bg-surface-0 text-text-secondary hover:border-border-strong"
                  }`}
                >
                  {n} variants
                </button>
              ))}
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !brief.trim()}
              className="w-full"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {generating ? "Generating variants..." : "Generate Variants"}
            </Button>
          </div>

          {/* Right panel — Output */}
          <div className="rounded-xl border border-border-default bg-surface-1 overflow-hidden animate-in" style={{ animationDelay: "50ms" }}>
            {variants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
                  <GitBranch className="h-6 w-6 text-text-tertiary" />
                </div>
                <p className="text-body font-medium text-text-secondary mb-1">
                  No variants yet
                </p>
                <p className="text-small text-text-tertiary max-w-sm">
                  Describe what you want to test and hit Generate.
                  Each variant will be auto-scored for quality.
                </p>
              </div>
            ) : (
              <>
                {/* Variant tabs */}
                <div className="flex items-center border-b border-border-default bg-surface-0">
                  {variants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`relative px-5 py-3 text-small font-medium transition-colors ${
                        activeTab === i
                          ? "text-accent bg-surface-1"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      Variant {VARIANT_LABELS[i]}
                      {v.score && (
                        <Badge
                          variant={v.score.total_score >= 70 ? "success" : "secondary"}
                          className="ml-2 text-[9px] px-1.5 py-0"
                        >
                          {v.score.total_score}
                        </Badge>
                      )}
                      {v.scoring && (
                        <Loader2 className="inline ml-1.5 h-3 w-3 animate-spin text-text-tertiary" />
                      )}
                      {activeTab === i && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Active variant content */}
                {variants[activeTab] && (
                  <div className="p-6">
                    {/* Content */}
                    <div className="rounded-lg border border-border-default bg-surface-0 p-4 mb-4">
                      <p className="whitespace-pre-wrap text-body text-text-primary leading-relaxed">
                        {variants[activeTab].content}
                      </p>
                    </div>

                    {/* Score panel */}
                    {variants[activeTab].scoring && (
                      <div className="flex items-center gap-2 text-small text-text-tertiary mb-4">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Scoring this variant...
                      </div>
                    )}

                    {variants[activeTab].score && (
                      <div className="rounded-lg border border-border-default bg-surface-0 p-4 mb-4">
                        <div className="flex items-center gap-4">
                          <MiniGauge score={variants[activeTab].score!.total_score} max={100} />
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            {(["clarity", "relevance", "engagement_potential", "brand_alignment"] as const).map((dim) => (
                              <div key={dim} className="flex items-center justify-between text-caption">
                                <span className="text-text-tertiary capitalize">
                                  {dim.replace("_", " ")}
                                </span>
                                <span className="font-mono font-medium text-text-primary">
                                  {variants[activeTab].score![dim]}/25
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {variants[activeTab].score!.summary && (
                          <p className="text-caption text-text-secondary mt-3 pt-3 border-t border-border-default">
                            {variants[activeTab].score!.summary}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSave(activeTab)}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save this variant
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopy(activeTab)}
                      >
                        {copiedIdx === activeTab ? (
                          <Check className="h-3.5 w-3.5 mr-1 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 mr-1" />
                        )}
                        {copiedIdx === activeTab ? "Copied" : "Use this variant"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Guidance note */}
                <div className="px-6 pb-5">
                  <p className="text-caption text-text-tertiary italic">
                    To run this test, publish both variants to your audience and compare performance in Analytics.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
