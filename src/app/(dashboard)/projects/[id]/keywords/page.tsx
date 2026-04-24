"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Loader2,
  TrendingUp,
  BookOpen,
  Target,
  ChevronRight,
  Copy,
  Check,
  HelpCircle,
  Zap,
  Save,
  X,
  PenLine,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PageHeader } from "@/src/components/layout/page-header";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";

import { useToast } from "@/src/components/ui/toast";
import { useUsageLimitModal } from "@/src/components/usage/limit-modal";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";

// ---------- types ----------

interface PrimaryKeyword {
  term: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  estimated_volume: string;
  difficulty: "low" | "medium" | "high";
  quick_win: boolean;
  suggested_format: string;
  rationale: string;
}

interface LongTailKeyword {
  term: string;
  intent: string;
  estimated_volume: string;
  difficulty: "low" | "medium" | "high";
  parent_keyword: string;
}

interface QuestionKeyword {
  question: string;
  snippet_opportunity: boolean;
  cluster: string;
}

interface ContentCluster {
  pillar: string;
  cluster_keywords: string[];
  pillar_page_title: string;
  cluster_page_titles: string[];
}

interface KeywordResult {
  seed_keyword: string;
  primary_keywords: PrimaryKeyword[];
  long_tail_keywords: LongTailKeyword[];
  question_keywords: QuestionKeyword[];
  content_clusters: ContentCluster[];
  competitor_gap: string;
  priority_order: string[];
}

// ---------- helpers ----------

const intentConfig: Record<string, { label: string; color: string }> = {
  informational:  { label: "Info",     color: "text-info bg-info/10 border-info/20"         },
  navigational:   { label: "Nav",      color: "text-text-secondary bg-surface-2 border-border-default" },
  commercial:     { label: "Research", color: "text-warning bg-warning/10 border-warning/20" },
  transactional:  { label: "Buy",      color: "text-success bg-success/10 border-success/20" },
};

const difficultyConfig: Record<string, { color: string; dot: string }> = {
  low:    { color: "text-success",          dot: "bg-success"  },
  medium: { color: "text-warning",          dot: "bg-warning"  },
  high:   { color: "text-error",            dot: "bg-error"    },
};

function DifficultyBadge({ level }: { level: "low" | "medium" | "high" }) {
  const cfg = difficultyConfig[level];
  return (
    <span className={`inline-flex items-center gap-1.5 text-caption ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {level}
    </span>
  );
}

function IntentBadge({ intent }: { intent: string }) {
  const cfg = intentConfig[intent] ?? intentConfig.informational;
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-caption font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ---------- component ----------

export default function KeywordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const { showLimitModal } = useUsageLimitModal();

  // Seed input state — pre-fill from ?seed= when linked from a playbook action.
  const [seedInput, setSeedInput] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seed = new URL(window.location.href).searchParams.get("seed");
    if (seed) setSeedInput(seed);
  }, []);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [rawText, setRawText] = useState("");

  // Active tab / view
  const [activeTab, setActiveTab] = useState<"primary" | "longtail" | "questions" | "clusters">("primary");

  // Saved state
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  // Plan (filled from stream `done` event)
  const [plan, setPlan] = useState<"free" | "pro" | "growth" | "agency">("free");
  const FREE_PRIMARY_LIMIT = 5;

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (seedInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/keywords/autocomplete?q=${encodeURIComponent(seedInput)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
          setShowSuggestions(true);
        }
      } catch {
        // silent fail
      }
    }, 350);
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, [seedInput]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function selectSuggestion(s: string) {
    setSeedInput(s);
    setShowSuggestions(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const seed = seedInput.trim();
    if (!seed) {
      toast("Enter a seed keyword or topic.", "warning");
      return;
    }
    setShowSuggestions(false);
    setGenerating(true);
    setRawText("");
    setResult(null);
    setSaved(new Set());

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "keyword-research",
          projectId,
          input: { seedKeyword: seed, count: 25 },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 429) {
          showLimitModal(plan);
        } else {
          toast(err.error || "Generation failed", "error");
        }
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
          } else if (data.type === "done" && data.plan) {
            setPlan(data.plan);
          }
        }
      }

      // Parse JSON result
      if (fullText) {
        try {
          const parsed = parseJsonResponse(fullText) as KeywordResult;
          setResult(parsed);
          setActiveTab("primary");
          toast("Keyword research complete!", "success");
        } catch (parseErr) {
          console.warn("[keywords] parse failed:", parseErr, "raw head:", fullText.slice(0, 300));
          toast("Results came through but formatting looked off. Check raw output.", "warning");
        }
      }
    } catch (err) {
      toast(String(err), "error");
    } finally {
      setGenerating(false);
    }
  }

  function toggleSave(term: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
        toast(`"${term}" saved to project keywords`, "success");
      }
      return next;
    });
  }

  // Count tabs
  const primaryCount = result?.primary_keywords?.length ?? 0;
  const longtailCount = result?.long_tail_keywords?.length ?? 0;
  const questionCount = result?.question_keywords?.length ?? 0;
  const clusterCount = result?.content_clusters?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Keyword Research"
        description="Discover high-value keywords and content clusters powered by AI"
      />


      <ExpectationBanner
        storageKey="conduikt-expect-keywords"
        message="Keyword research is the starting point, not the finish line. Rankings come from publishing quality content around these keywords consistently over weeks and months."
        details={[
          "Target low-difficulty keywords first for quicker wins, then build up to competitive ones.",
          "Use the 'Blog' button on any keyword to start writing content around it right away.",
          "Revisit your keyword strategy monthly — search trends shift, and new opportunities emerge.",
        ]}
      />

      {/* Seed Input */}
      <form onSubmit={handleGenerate} className="mb-8">
        <div className="relative flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Enter a seed keyword or topic…"
              className="w-full rounded-lg border border-border-default bg-surface-1 pl-10 pr-4 py-3 text-body text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border-default bg-surface-2 shadow-elevated overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => selectSuggestion(s)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-body text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors text-left"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" disabled={generating || !seedInput.trim()}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Researching…" : "Research"}
          </Button>
        </div>
      </form>

      {/* Generating indicator */}
      {generating && !result && (
        <Card className="mb-8">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted">
              <Loader2 className="h-6 w-6 text-accent animate-spin" />
            </div>
            <p className="text-body font-semibold text-text-primary">
              Analysing keyword opportunities...
            </p>
            <p className="text-small text-text-tertiary max-w-sm">
              Finding clusters, long-tail opportunities, and quick wins. This usually takes 20-30 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {!generating && !result && rawText && (
        <Card className="mb-8 border-warning/30">
          <CardContent className="py-6 space-y-2">
            <p className="text-small text-text-primary font-medium">
              We got a response but couldn&apos;t format it. Try regenerating.
            </p>
            <details className="text-small">
              <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
                Show raw output
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-caption text-text-secondary font-mono break-words max-h-[320px] overflow-y-auto">
                {rawText}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Priority quick-wins */}
          {result.priority_order?.length > 0 && (
            <Card className="border-accent/30 animate-in">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-h3">
                  <Zap className="h-5 w-5 text-accent" />
                  Top 5 Priority Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {result.priority_order.map((term, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-0 px-4 py-3 animate-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-caption font-bold text-accent">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-body text-text-primary font-medium">{term}</span>
                      <button
                        onClick={() => copy(term, `prio-${i}`)}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                      >
                        {copied === `prio-${i}` ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Competitor gap */}
          {result.competitor_gap && (
            <Card className="animate-in bg-surface-1" style={{ animationDelay: "60ms" }}>
              <CardContent className="py-4 flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-accent-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-caption text-text-tertiary mb-1">Competitor Gap</p>
                  <p className="text-body text-text-secondary">{result.competitor_gap}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="animate-in" style={{ animationDelay: "120ms" }}>
            {/* Tab bar */}
            <div className="flex gap-1 rounded-lg border border-border-default bg-surface-0 p-1 mb-4 overflow-x-auto">
              {([
                { key: "primary",   label: "Primary",    count: primaryCount,   icon: Target       },
                { key: "longtail",  label: "Long-tail",  count: longtailCount,  icon: Search       },
                { key: "questions", label: "Questions",  count: questionCount,  icon: HelpCircle   },
                { key: "clusters",  label: "Clusters",   count: clusterCount,   icon: BookOpen     },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-small font-medium transition-colors shrink-0 ${
                    activeTab === tab.key
                      ? "bg-surface-2 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-caption text-text-tertiary">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Primary keywords */}
            {activeTab === "primary" && (
              <div className="space-y-2">
                {result.primary_keywords.map((kw, i) => {
                  const gated = plan === "free" && i >= FREE_PRIMARY_LIMIT;
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-border-default bg-surface-1 p-4 animate-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {gated ? (
                        <div className="relative">
                          <div aria-hidden className="select-none pointer-events-none blur-sm space-y-1.5">
                            <span className="text-body font-medium text-text-primary">Lorem ipsum keyword opportunity</span>
                            <div className="flex items-center gap-3">
                              <span className="rounded-md border px-1.5 py-0.5 text-caption text-text-tertiary">Info</span>
                              <span className="text-caption text-text-tertiary">medium</span>
                              <span className="text-caption text-text-tertiary">1,200/mo</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-body font-medium text-text-primary">{kw.term}</span>
                              {kw.quick_win && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-success/10 border border-success/20 px-1.5 py-0.5 text-caption text-success">
                                  <Zap className="h-3 w-3" /> Quick win
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <IntentBadge intent={kw.intent} />
                              <DifficultyBadge level={kw.difficulty} />
                              <span className="text-caption text-text-tertiary">{kw.estimated_volume}/mo</span>
                              <span className="text-caption text-text-tertiary">→ {kw.suggested_format.replace(/_/g, " ")}</span>
                            </div>
                            <p className="mt-2 text-small text-text-secondary">{kw.rationale}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Link
                              href={`/projects/${projectId}/blog?keyword=${encodeURIComponent(kw.term)}`}
                              className="flex items-center gap-1 rounded-md border border-border-default bg-surface-0 px-2 py-1 text-caption text-text-secondary hover:border-accent/40 hover:text-accent transition-colors whitespace-nowrap"
                              title="Write blog post targeting this keyword"
                            >
                              <PenLine className="h-3 w-3" />
                              Blog
                            </Link>
                            <button
                              onClick={() => copy(kw.term, `kw-${i}`)}
                              className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                              title="Copy keyword"
                            >
                              {copied === `kw-${i}` ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => toggleSave(kw.term)}
                              className={`p-1.5 rounded-md transition-colors ${
                                saved.has(kw.term)
                                  ? "text-accent bg-accent-muted"
                                  : "text-text-tertiary hover:text-accent hover:bg-accent-muted"
                              }`}
                              title={saved.has(kw.term) ? "Remove from saved" : "Save keyword"}
                            >
                              {saved.has(kw.term) ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {plan === "free" && result.primary_keywords.length > FREE_PRIMARY_LIMIT && (
                  <div className="rounded-lg border border-dashed border-accent/40 bg-accent-muted/20 p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-accent shrink-0" />
                      <p className="text-small text-text-secondary">
                        <strong>{result.primary_keywords.length - FREE_PRIMARY_LIMIT}</strong> more keywords hidden. Upgrade to Pro to see all results.
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <Link href="/settings/billing">
                        Upgrade
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Long-tail keywords */}
            {activeTab === "longtail" && (
              <div className="space-y-2">
                {result.long_tail_keywords.map((kw, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border-default bg-surface-1 px-4 py-3 animate-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-text-primary font-medium truncate">{kw.term}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <IntentBadge intent={kw.intent} />
                        <DifficultyBadge level={kw.difficulty} />
                        <span className="text-caption text-text-tertiary">{kw.estimated_volume}/mo</span>
                        {kw.parent_keyword && (
                          <span className="text-caption text-text-tertiary">
                            <ChevronRight className="h-3 w-3 inline" /> {kw.parent_keyword}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copy(kw.term, `lt-${i}`)}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
                    >
                      {copied === `lt-${i}` ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Question keywords */}
            {activeTab === "questions" && (
              <div className="space-y-2">
                {result.question_keywords.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border-default bg-surface-1 px-4 py-3 animate-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-text-primary font-medium">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {q.snippet_opportunity && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-info/10 border border-info/20 px-1.5 py-0.5 text-caption text-info">
                            Featured snippet
                          </span>
                        )}
                        <span className="text-caption text-text-tertiary">cluster: {q.cluster}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => copy(q.question, `q-${i}`)}
                      className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0 mt-0.5"
                    >
                      {copied === `q-${i}` ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Content clusters */}
            {activeTab === "clusters" && (
              <div className="space-y-4">
                {result.content_clusters.map((cluster, i) => (
                  <Card
                    key={i}
                    className="animate-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-h3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-accent" />
                        {cluster.pillar}
                      </CardTitle>
                      <p className="text-small text-text-secondary mt-1">
                        Pillar page: <span className="text-text-primary font-medium">{cluster.pillar_page_title}</span>
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-caption text-text-tertiary mb-2">Cluster keywords</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {cluster.cluster_keywords.map((kw, j) => (
                          <button
                            key={j}
                            onClick={() => copy(kw, `ck-${i}-${j}`)}
                            className="rounded-md border border-border-default bg-surface-0 px-2.5 py-1 text-small text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                      <p className="text-caption text-text-tertiary mb-2">Cluster pages</p>
                      <ul className="space-y-1">
                        {cluster.cluster_page_titles.map((title, j) => (
                          <li key={j} className="flex items-start gap-2 text-small text-text-secondary">
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-tertiary" />
                            {title}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Saved keywords export hint */}
          {saved.size > 0 && (
            <Card className="border-accent/30 animate-in">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4 text-accent" />
                  <span className="text-body text-text-primary">
                    <strong>{saved.size}</strong> keywords saved
                  </span>
                </div>
                <button
                  onClick={() => copy(Array.from(saved).join("\n"), "saved-all")}
                  className="flex items-center gap-1.5 text-small text-accent hover:text-accent-hover transition-colors"
                >
                  {copied === "saved-all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy all saved
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !generating && (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted">
              <Search className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-h3 text-text-primary mb-2">Find keyword opportunities</h3>
            <p className="text-body text-text-secondary max-w-md">
              Enter a seed keyword above to get AI-powered keyword clusters, long-tail opportunities, question keywords, and content cluster recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
