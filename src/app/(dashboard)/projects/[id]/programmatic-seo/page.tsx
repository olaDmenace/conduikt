"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Save,
  Lock,
  ArrowUpRight,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";
import { useToast } from "@/src/components/ui/toast";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";

interface SeoSection {
  heading: string;
  body: string;
}

interface SeoFaq {
  question: string;
  answer: string;
}

interface SeoVariant {
  slug: string;
  target_query: string;
  primary_keyword: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  intro: string;
  sections: SeoSection[];
  faq: SeoFaq[];
  cta_headline: string;
  cta_body: string;
  schema_types: string[];
  internal_link_suggestions: string[];
  quality_flag: "ok" | "review";
}

interface ProgrammaticSeoResult {
  template_pattern: string;
  seed_query: string;
  variants: SeoVariant[];
  publishing_checklist: string[];
}

export default function ProgrammaticSeoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();

  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const [seedQuery, setSeedQuery] = useState("");
  const [templatePattern, setTemplatePattern] = useState("");
  const [audience, setAudience] = useState("");
  const [count, setCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [rawText, setRawText] = useState("");

  const [result, setResult] = useState<ProgrammaticSeoResult | null>(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

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

  async function handleGenerate() {
    if (!seedQuery.trim()) {
      toast("Enter a seed query or modifier.", "warning");
      return;
    }
    setGenerating(true);
    setResult(null);
    setRawText("");
    setActiveVariant(0);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "programmatic-seo",
          projectId,
          input: {
            seedQuery,
            templatePattern: templatePattern || undefined,
            audience: audience || undefined,
            count,
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
          const parsed = parseJsonResponse(fullText) as ProgrammaticSeoResult;
          setResult(parsed);
          toast(`Generated ${parsed.variants.length} page variants`, "success");
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

  function copyAll(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast("Copied to clipboard", "info");
    setTimeout(() => setCopied(null), 2000);
  }

  async function saveVariant(v: SeoVariant) {
    try {
      const markdown = buildVariantMarkdown(v);
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "landing_page",
          channel: "web",
          title: `pSEO — ${v.h1}`,
          content: {
            slug: v.slug,
            meta_title: v.meta_title,
            meta_description: v.meta_description,
            h1: v.h1,
            markdown,
            schema_types: v.schema_types,
            skill: "programmatic-seo",
          },
          status: "draft",
        }),
      });
      if (res.ok) toast(`"${v.h1}" saved to library`, "success");
      else toast("Failed to save", "error");
    } catch {
      toast("Failed to save", "error");
    }
  }

  function buildVariantMarkdown(v: SeoVariant): string {
    const lines: string[] = [];
    lines.push(`# ${v.h1}`);
    lines.push("");
    lines.push(v.intro);
    lines.push("");
    for (const s of v.sections) {
      lines.push(`## ${s.heading}`);
      lines.push("");
      lines.push(s.body);
      lines.push("");
    }
    if (v.faq.length > 0) {
      lines.push(`## Frequently asked questions`);
      lines.push("");
      for (const f of v.faq) {
        lines.push(`### ${f.question}`);
        lines.push("");
        lines.push(f.answer);
        lines.push("");
      }
    }
    lines.push(`## ${v.cta_headline}`);
    lines.push("");
    lines.push(v.cta_body);
    return lines.join("\n");
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
          title="Programmatic SEO"
          description="Generate a batch of unique landing-page variants for long-tail queries"
        />
        <div className="rounded-xl border border-border-default bg-surface-1 p-10 text-center animate-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
            <Lock className="h-7 w-7 text-text-tertiary" />
          </div>
          <h3 className="text-h3 text-text-primary mb-2">
            Upgrade to unlock Programmatic SEO
          </h3>
          <p className="text-body text-text-secondary max-w-md mx-auto mb-6">
            Generate dozens of unique, keyword-targeted landing pages in a single run. Available on Growth and Agency plans.
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

  const v = result?.variants[activeVariant];

  return (
    <div>
      <PageHeader
        title="Programmatic SEO"
        description="Generate a batch of unique landing-page variants for long-tail queries"
      />

      <ExpectationBanner
        storageKey="conduikt-expect-pseo"
        message="Programmatic SEO only works when every page is genuinely unique and useful. Thin duplicates get filtered by Google — quality > volume."
        details={[
          "Treat the AI output as a first draft. Add proprietary data, screenshots, or customer quotes before publishing.",
          "Pages flagged 'review' likely need stronger differentiation before going live.",
          "Wire the slugs into sitemap.xml and link from your main nav once published.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Left — form */}
        <div className="rounded-xl border border-border-default bg-surface-1 p-6 animate-in h-fit">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-body font-semibold text-text-primary">Page batch</p>
              <p className="text-caption text-text-tertiary">Define the seed and template</p>
            </div>
          </div>

          <label className="text-small font-medium text-text-secondary mb-2 block">
            Seed query / modifier
          </label>
          <input
            value={seedQuery}
            onChange={(e) => setSeedQuery(e.target.value)}
            placeholder="e.g. 'alternative to Jasper' or 'for SaaS founders'"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none mb-4"
          />

          <label className="text-small font-medium text-text-secondary mb-2 block">
            Template pattern (optional)
          </label>
          <input
            value={templatePattern}
            onChange={(e) => setTemplatePattern(e.target.value)}
            placeholder="e.g. '[tool] for [audience]'"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none mb-4"
          />

          <label className="text-small font-medium text-text-secondary mb-2 block">
            Audience focus (optional)
          </label>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. 'bootstrapped SaaS founders'"
            className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent outline-none mb-4"
          />

          <label className="text-small font-medium text-text-secondary mb-2 block">
            Number of variants
          </label>
          <div className="flex gap-2 mb-6">
            {[4, 6, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`flex-1 rounded-lg px-3 py-2 text-small font-medium transition-colors border ${
                  count === n
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border-default bg-surface-0 text-text-secondary hover:border-border-strong"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !seedQuery.trim()}
            className="w-full"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generating ? "Generating pages..." : "Generate Pages"}
          </Button>
        </div>

        {/* Right — results */}
        <div className="min-w-0">
          {!result && !generating && (
            <div className="rounded-xl border border-border-default bg-surface-1 py-20 px-6 text-center animate-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 mb-4">
                <Layers className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="text-body font-medium text-text-secondary mb-1">
                No pages generated yet
              </p>
              <p className="text-small text-text-tertiary max-w-sm mx-auto">
                Enter a seed query and hit Generate. Each page gets its own meta,
                H1, sections, and FAQ.
              </p>
            </div>
          )}

          {generating && !result && (
            <div className="rounded-xl border border-border-default bg-surface-1 p-6 animate-in">
              <div className="flex items-center gap-2 text-accent mb-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-body font-medium">Generating page variants...</span>
              </div>
              {rawText && (
                <div className="max-h-24 overflow-hidden rounded-lg bg-surface-2 p-3">
                  <p className="text-small font-mono text-text-tertiary line-clamp-4">{rawText}</p>
                </div>
              )}
            </div>
          )}

          {result && v && (
            <div className="space-y-4 animate-in">
              {/* Summary */}
              <div className="rounded-xl border border-border-default bg-surface-1 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-caption text-text-tertiary">Template pattern</p>
                    <p className="text-body font-mono text-text-primary">
                      {result.template_pattern}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {result.variants.length} variants
                  </Badge>
                </div>
              </div>

              {/* Variant tabs */}
              <div className="flex gap-1 overflow-x-auto rounded-lg border border-border-default bg-surface-0 p-1">
                {result.variants.map((variant, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVariant(i)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-small font-medium whitespace-nowrap transition-colors ${
                      activeVariant === i
                        ? "bg-surface-2 text-text-primary"
                        : "text-text-tertiary hover:text-text-secondary"
                    }`}
                  >
                    {i + 1}
                    {variant.quality_flag === "review" && (
                      <AlertTriangle className="h-3 w-3 text-warning" />
                    )}
                  </button>
                ))}
              </div>

              {/* Active variant */}
              <div className="rounded-xl border border-border-default bg-surface-1 p-6">
                <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-text-tertiary mb-1">
                      Target query
                    </p>
                    <p className="text-body text-text-primary font-medium mb-3">
                      {v.target_query}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        /{v.slug}
                      </Badge>
                      {v.schema_types.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                      {v.quality_flag === "review" && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] text-warning border-warning/30"
                        >
                          review
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => saveVariant(v)}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        copyAll(`v-${activeVariant}`, buildVariantMarkdown(v))
                      }
                    >
                      {copied === `v-${activeVariant}` ? (
                        <Check className="h-3.5 w-3.5 mr-1 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1" />
                      )}
                      Copy MD
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Field label="Meta title" value={v.meta_title} />
                  <Field label="Meta description" value={v.meta_description} />
                  <Field label="H1" value={v.h1} />

                  <div>
                    <p className="text-caption text-text-tertiary mb-2">Intro</p>
                    <p className="text-body text-text-secondary leading-relaxed">
                      {v.intro}
                    </p>
                  </div>

                  {v.sections.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border-subtle bg-surface-0 p-4"
                    >
                      <p className="text-caption text-text-tertiary mb-1">H2</p>
                      <p className="text-body font-semibold text-text-primary mb-2">
                        {s.heading}
                      </p>
                      <p className="text-body text-text-secondary leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  ))}

                  {v.faq.length > 0 && (
                    <div>
                      <p className="text-caption text-text-tertiary mb-2">FAQ</p>
                      <div className="space-y-3">
                        {v.faq.map((f, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-border-subtle bg-surface-0 p-4"
                          >
                            <p className="text-body font-medium text-text-primary mb-1.5">
                              {f.question}
                            </p>
                            <p className="text-small text-text-secondary leading-relaxed">
                              {f.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-accent/30 bg-accent-muted p-4">
                    <p className="text-caption text-text-tertiary mb-1">CTA</p>
                    <p className="text-body font-semibold text-text-primary mb-1">
                      {v.cta_headline}
                    </p>
                    <p className="text-small text-text-secondary">{v.cta_body}</p>
                  </div>

                  {v.internal_link_suggestions.length > 0 && (
                    <div>
                      <p className="text-caption text-text-tertiary mb-2">
                        Internal link suggestions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {v.internal_link_suggestions.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="font-mono text-[10px]"
                          >
                            /{s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Publishing checklist */}
              {result.publishing_checklist.length > 0 && (
                <div className="rounded-xl border border-border-default bg-surface-1 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-accent" />
                    <p className="text-body font-semibold text-text-primary">
                      Publishing checklist
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {result.publishing_checklist.map((item, i) => (
                      <li
                        key={i}
                        className="text-small text-text-secondary flex items-start gap-2"
                      >
                        <span className="text-accent shrink-0">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-text-tertiary mb-1">{label}</p>
      <p className="text-body text-text-primary">{value}</p>
    </div>
  );
}
