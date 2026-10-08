"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
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
} from "@/src/components/ui/lucide-icons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { EmptyState } from "@/src/components/ui/empty-state";
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
  informational:  { label: "Learning", color: "text-text-2 bg-surface-2" },
  navigational:   { label: "Looking",  color: "text-text-2 bg-surface-2" },
  commercial:     { label: "Comparing", color: "text-text-2 bg-surface-2" },
  transactional:  { label: "Buying",   color: "text-teal bg-teal-soft" },
};

const difficultyConfig: Record<string, { color: string; dot: string }> = {
  low:    { color: "text-teal",          dot: "bg-teal"  },
  medium: { color: "text-text-2",          dot: "bg-accent"  },
  high:   { color: "text-text-2",            dot: "bg-danger"    },
};

function DifficultyBadge({ level }: { level: "low" | "medium" | "high" }) {
  const cfg = difficultyConfig[level];
  return (
    <span className={`inline-flex items-center gap-1.5 text-caption ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {level} difficulty
    </span>
  );
}

function IntentBadge({ intent }: { intent: string }) {
  const cfg = intentConfig[intent] ?? intentConfig.informational;
  return (
    <span className={`inline-flex h-[22px] items-center rounded-sm px-2 font-mono text-[11px] font-medium uppercase tracking-wide ${cfg.color}`}>
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
          toast("Keywords ready", "success");
        } catch (parseErr) {
          console.warn("[keywords] parse failed:", parseErr, "raw head:", fullText.slice(0, 300));
          toast("The results came back in the wrong shape. Try again.", "warning");
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
        title="Keyword Finder"
        description="Find the searches worth writing for, grouped into topics"
      />


      <ExpectationBanner
        storageKey="conduikt-expect-keywords"
        message="Finding keywords is the start, not the finish. You rank by publishing good content around them, week after week."
        details={[
          "Go after low-difficulty keywords first for quick wins, then build up to harder ones.",
          "Use the Blog button on any keyword to start writing about it right away.",
          "Look again every month. Searches change and new chances appear.",
        ]}
      />

      {/* Seed Input */}
      <form onSubmit={handleGenerate} className="mb-8">
        <div className="relative flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Enter a topic or keyword…"
              className="w-full rounded-md border border-line-strong bg-surface py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent pl-10 pr-4"
            />
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-line bg-surface shadow-[var(--shadow-float)] overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => selectSuggestion(s)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-body text-text-2 hover:bg-surface-2 hover:text-text transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] text-left"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-text-3" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" disabled={generating || !seedInput.trim()}>
            {!generating && <Sparkles className="h-4 w-4" />}
            {generating ? "Finding…" : "Find keywords"}
          </Button>
        </div>
      </form>

      {/* Generating indicator */}
      {generating && !result && (
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <p className="flex items-center gap-2 text-title text-text">
              <span className="live-dot" aria-hidden />
              Finding keywords…
            </p>
            <p className="text-body-s text-text-3 max-w-sm">
              Grouping topics, longer searches and quick wins. This usually takes 20 to 30 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {!generating && !result && rawText && (
        <Card className="mb-8 border-accent">
          <CardContent className="space-y-2">
            <p className="text-body-s text-text font-medium">
              We got an answer but couldn&apos;t read it. Press Find keywords to try again.
            </p>
            <details className="text-body-s">
              <summary className="cursor-pointer text-text-3 hover:text-text">
                Show raw output
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-caption text-text-2 font-mono break-words max-h-[320px] overflow-y-auto">
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
            <Card emphasis className="animate-in">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-heading">
                  <Zap className="h-4 w-4 text-accent" />
                  Start with these 5
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {result.priority_order.map((term, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-md border border-line bg-ground px-4 py-3 animate-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-caption text-text-2">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-title text-text">{term}</span>
                      <IconButton
                        size="sm"
                        label={`Copy "${term}"`}
                        onClick={() => copy(term, `prio-${i}`)}
                        className="text-text-3"
                      >
                        {copied === `prio-${i}` ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
                      </IconButton>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Competitor gap */}
          {result.competitor_gap && (
            <Card className="animate-in" style={{ animationDelay: "60ms" }}>
              <CardContent className="flex items-start gap-3">
                <TrendingUp className="h-4 w-4 text-text-3 shrink-0 mt-0.5" />
                <div>
                  <p className="text-label text-text-3 mb-1.5">Where competitors are missing</p>
                  <p className="text-body text-text-2">{result.competitor_gap}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="animate-in" style={{ animationDelay: "120ms" }}>
            {/* Tab bar */}
            <div role="tablist" className="flex gap-1 rounded-md border border-line bg-surface p-1 mb-4 overflow-x-auto">
              {([
                { key: "primary",   label: "Main",          count: primaryCount,   icon: Target       },
                { key: "longtail",  label: "Longer searches", count: longtailCount,  icon: Search       },
                { key: "questions", label: "Questions",     count: questionCount,  icon: HelpCircle   },
                { key: "clusters",  label: "Topics",        count: clusterCount,   icon: BookOpen     },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-body-s font-medium transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] shrink-0 ${
                    activeTab === tab.key
                      ? "bg-ink text-ink-text"
                      : "text-text-2 hover:text-text hover:bg-surface-2"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span className="font-mono text-caption opacity-70">
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
                      className="rounded-lg border border-line bg-surface p-4 animate-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {gated ? (
                        <div className="relative">
                          <div aria-hidden className="select-none pointer-events-none  space-y-1.5">
                            <span className="text-title text-text">Lorem ipsum keyword opportunity</span>
                            <div className="flex items-center gap-3">
                              <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-caption text-text-3">Learning</span>
                              <span className="text-caption text-text-3">medium</span>
                              <span className="text-caption text-text-3">1,200/mo</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-title text-text">{kw.term}</span>
                              {kw.quick_win && (
                                <Badge variant="success">
                                  <Zap className="h-3 w-3" /> Quick win
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <IntentBadge intent={kw.intent} />
                              <DifficultyBadge level={kw.difficulty} />
                              <span className="font-mono text-caption text-text-3">{kw.estimated_volume}/mo</span>
                              <span className="text-caption text-text-3">→ {kw.suggested_format.replace(/_/g, " ")}</span>
                            </div>
                            <p className="mt-2 text-body-s text-text-2">{kw.rationale}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Link
                              href={`/projects/${projectId}/blog?keyword=${encodeURIComponent(kw.term)}`}
                              className="flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2.5 text-caption text-text-2 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:border-accent hover:text-text whitespace-nowrap"
                              title="Write a blog post for this keyword"
                            >
                              <PenLine className="h-3 w-3" />
                              Blog
                            </Link>
                            <IconButton
                              size="sm"
                              label="Copy keyword"
                              title="Copy keyword"
                              onClick={() => copy(kw.term, `kw-${i}`)}
                              className="text-text-3"
                            >
                              {copied === `kw-${i}` ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
                            </IconButton>
                            <IconButton
                              size="sm"
                              label={saved.has(kw.term) ? "Remove from saved" : "Save keyword"}
                              title={saved.has(kw.term) ? "Remove from saved" : "Save keyword"}
                              aria-pressed={saved.has(kw.term)}
                              onClick={() => toggleSave(kw.term)}
                              className={saved.has(kw.term) ? "text-teal" : "text-text-3"}
                            >
                              {saved.has(kw.term) ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                            </IconButton>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {plan === "free" && result.primary_keywords.length > FREE_PRIMARY_LIMIT && (
                  <div className="rounded-lg border border-accent bg-surface p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-accent shrink-0" />
                      <p className="text-body-s text-text-2">
                        <span className="font-mono text-text">{result.primary_keywords.length - FREE_PRIMARY_LIMIT}</span> more keywords hidden. Upgrade to Pro to see them all.
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
                    className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 animate-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-title text-text truncate">{kw.term}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <IntentBadge intent={kw.intent} />
                        <DifficultyBadge level={kw.difficulty} />
                        <span className="font-mono text-caption text-text-3">{kw.estimated_volume}/mo</span>
                        {kw.parent_keyword && (
                          <span className="text-caption text-text-3">
                            <ChevronRight className="h-3 w-3 inline" /> {kw.parent_keyword}
                          </span>
                        )}
                      </div>
                    </div>
                    <IconButton
                      size="sm"
                      label="Copy keyword"
                      onClick={() => copy(kw.term, `lt-${i}`)}
                      className="text-text-3"
                    >
                      {copied === `lt-${i}` ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
                    </IconButton>
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
                    className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 animate-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-title text-text">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {q.snippet_opportunity && (
                          <Badge variant="info">Can win the answer box</Badge>
                        )}
                        <span className="text-caption text-text-3">Topic: {q.cluster}</span>
                      </div>
                    </div>
                    <IconButton
                      size="sm"
                      label="Copy question"
                      onClick={() => copy(q.question, `q-${i}`)}
                      className="text-text-3"
                    >
                      {copied === `q-${i}` ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
                    </IconButton>
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
                      <CardTitle className="text-heading flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-text-3" />
                        {cluster.pillar}
                      </CardTitle>
                      <p className="text-body-s text-text-2 mt-1">
                        Main page: <span className="text-text font-medium">{cluster.pillar_page_title}</span>
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-label text-text-3 mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {cluster.cluster_keywords.map((kw, j) => (
                          <button
                            key={j}
                            onClick={() => copy(kw, `ck-${i}-${j}`)}
                            title="Copy"
                            className="rounded-md border border-line bg-ground px-2.5 py-1 text-body-s text-text-2 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:border-accent hover:text-text"
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                      <p className="text-label text-text-3 mb-2">Pages to write</p>
                      <ul className="space-y-1">
                        {cluster.cluster_page_titles.map((title, j) => (
                          <li key={j} className="flex items-start gap-2 text-body-s text-text-2">
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-3" />
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
            <Card className="animate-in">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4 text-teal" />
                  <span className="text-body text-text">
                    <span className="font-mono">{saved.size}</span> keywords saved
                  </span>
                </div>
                <button
                  onClick={() => copy(Array.from(saved).join("\n"), "saved-all")}
                  className="hover-link flex items-center gap-1.5 text-body-s text-accent hover:text-accent-hover"
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
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No keywords yet. Enter a topic above to see the searches worth writing for, grouped into topics."
        />
      )}
    </div>
  );
}
