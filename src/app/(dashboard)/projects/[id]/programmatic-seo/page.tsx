"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  Copy,
  Check,
  Save,
  Lock,
  ArrowUpRight,
  AlertTriangle,
  FileText,
} from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
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
      toast("Enter a search phrase to build pages around.", "warning");
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
          toast(`${parsed.variants.length} pages ready`, "success");
        } catch {
          toast("The pages came back in the wrong shape. Try again.", "warning");
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
      <div className="space-y-6" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <Skeleton className="h-[480px]" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div>
        <PageHeader
          title="Landing Pages"
          description="Make a batch of different landing pages, each aimed at a specific search"
        />
        <div className="rounded-lg border border-line bg-surface p-10 text-center animate-in">
          <Lock className="mx-auto mb-4 h-6 w-6 text-text-3" />
          <h3 className="text-heading text-text mb-2">
            Upgrade to use Landing Pages
          </h3>
          <p className="text-body text-text-2 max-w-md mx-auto mb-6">
            Make dozens of different landing pages, each aimed at its own search, in one go. Available on Growth and Agency plans.
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

  const v = result?.variants[activeVariant];

  return (
    <div>
      <PageHeader
        title="Landing Pages"
        description="Make a batch of different landing pages, each aimed at a specific search"
      />

      <ExpectationBanner
        storageKey="conduikt-expect-pseo"
        message="This only works when every page is genuinely different and useful. Google filters out thin copies, so quality beats volume."
        details={[
          "Treat these as first drafts. Add your own data, screenshots or customer quotes before publishing.",
          "Pages marked Review need to be made more different before they go live.",
          "Once published, add the pages to your sitemap and link to them from your site.",
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Left — form */}
        <div className="rounded-lg border border-line bg-surface p-6 animate-in h-fit">
          <div className="flex items-center gap-3 mb-5">
            <Layers className="h-4 w-4 shrink-0 text-text-3" />
            <div>
              <p className="text-title text-text">Page batch</p>
              <p className="text-caption text-text-3">Choose the search and the pattern</p>
            </div>
          </div>

          <label className="text-body-s font-medium text-text-2 mb-2 block">
            Search phrase
          </label>
          <input
            value={seedQuery}
            onChange={(e) => setSeedQuery(e.target.value)}
            placeholder="e.g. 'alternative to Jasper' or 'for SaaS founders'"
            className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent mb-4"
          />

          <label className="text-body-s font-medium text-text-2 mb-2 block">
            Page pattern (optional)
          </label>
          <input
            value={templatePattern}
            onChange={(e) => setTemplatePattern(e.target.value)}
            placeholder="e.g. '[tool] for [audience]'"
            className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent mb-4"
          />

          <label className="text-body-s font-medium text-text-2 mb-2 block">
            Audience focus (optional)
          </label>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. 'bootstrapped SaaS founders'"
            className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent mb-4"
          />

          <label className="text-body-s font-medium text-text-2 mb-2 block">
            How many pages
          </label>
          <div className="flex gap-2 mb-6">
            {[4, 6, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={`flex-1 rounded-md px-3 py-2 font-mono text-body-s transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] border ${
                  count === n
                    ? "border-accent bg-accent-soft text-text"
                    : "border-line bg-surface text-text-2 hover:border-line-strong"
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
            {!generating && <Sparkles className="h-4 w-4" />}
            {generating ? "Writing pages…" : "Write pages"}
          </Button>
        </div>

        {/* Right — results */}
        <div className="min-w-0">
          {!result && !generating && (
            <div className="rounded-lg border border-dashed border-line py-20 px-6 text-center animate-in">
              <Layers className="mx-auto mb-4 h-8 w-8 text-text-3" />
              <p className="text-body text-text-2 max-w-sm mx-auto">
                No pages yet. Enter a search phrase and we&apos;ll write each page
                with its own title, headings, sections and FAQ.
              </p>
            </div>
          )}

          {generating && !result && (
            <div className="rounded-lg border border-line bg-surface p-10 animate-in text-center">
              <p className="flex items-center justify-center gap-2 text-title text-text">
                <span className="live-dot" aria-hidden />
                Writing your pages…
              </p>
              <p className="text-body-s text-text-3 mt-2 max-w-sm mx-auto">
                Working out the pattern, the parts that change and a few filled-in examples.
              </p>
            </div>
          )}

          {!generating && !result && rawText && (
            <div className="rounded-lg border border-accent bg-surface p-6 animate-in space-y-2">
              <p className="text-body-s text-text font-medium">
                We got an answer but couldn&apos;t turn it into pages.
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

          {result && v && (
            <div className="space-y-4 animate-in">
              {/* Summary */}
              <div className="rounded-lg border border-line bg-surface p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-label text-text-3 mb-1.5">Page pattern</p>
                    <p className="text-body font-mono text-text">
                      {result.template_pattern}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {result.variants.length} pages
                  </Badge>
                </div>
              </div>

              {/* Variant tabs */}
              <div role="tablist" aria-label="Pages" className="flex gap-1 overflow-x-auto rounded-md border border-line bg-surface p-1">
                {result.variants.map((variant, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={activeVariant === i}
                    onClick={() => setActiveVariant(i)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-body-s whitespace-nowrap transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] ${
                      activeVariant === i
                        ? "bg-ink text-ink-text"
                        : "text-text-3 hover:text-text"
                    }`}
                  >
                    {i + 1}
                    {variant.quality_flag === "review" && (
                      <AlertTriangle className="h-3 w-3 text-accent" />
                    )}
                  </button>
                ))}
              </div>

              {/* Active variant */}
              <div className="rounded-lg border border-line bg-surface p-6">
                <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-label text-text-3 mb-1.5">
                      Search it targets
                    </p>
                    <p className="text-title text-text mb-3">
                      {v.target_query}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="normal-case">
                        /{v.slug}
                      </Badge>
                      {v.schema_types.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                      {v.quality_flag === "review" && (
                        <Badge variant="warning">
                          Review
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveVariant(v)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyAll(`v-${activeVariant}`, buildVariantMarkdown(v))
                      }
                    >
                      {copied === `v-${activeVariant}` ? (
                        <Check className="h-3.5 w-3.5 text-teal" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy as Markdown
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Field label="Meta title" value={v.meta_title} />
                  <Field label="Meta description" value={v.meta_description} />
                  <Field label="Main heading" value={v.h1} />

                  <div>
                    <p className="text-label text-text-3 mb-2">Intro</p>
                    <p className="text-body text-text-2 leading-relaxed">
                      {v.intro}
                    </p>
                  </div>

                  {v.sections.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-line bg-ground p-4"
                    >
                      <p className="text-label text-text-3 mb-1.5">Section</p>
                      <p className="text-title text-text mb-2">
                        {s.heading}
                      </p>
                      <p className="text-body text-text-2 leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  ))}

                  {v.faq.length > 0 && (
                    <div>
                      <p className="text-label text-text-3 mb-2">FAQ</p>
                      <div className="space-y-3">
                        {v.faq.map((f, i) => (
                          <div
                            key={i}
                            className="rounded-md border border-line bg-ground p-4"
                          >
                            <p className="text-title text-text mb-1.5">
                              {f.question}
                            </p>
                            <p className="text-body-s text-text-2 leading-relaxed">
                              {f.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-md border border-accent bg-surface p-4">
                    <p className="text-label text-text-3 mb-1.5">Call to action</p>
                    <p className="text-title text-text mb-1">
                      {v.cta_headline}
                    </p>
                    <p className="text-body-s text-text-2">{v.cta_body}</p>
                  </div>

                  {v.internal_link_suggestions.length > 0 && (
                    <div>
                      <p className="text-label text-text-3 mb-2">
                        Link to these pages
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {v.internal_link_suggestions.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="normal-case"
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
                <div className="rounded-lg border border-line bg-surface p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-text-3" />
                    <p className="text-heading text-text">
                      Before you publish
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {result.publishing_checklist.map((item, i) => (
                      <li
                        key={i}
                        className="text-body-s text-text-2 flex items-start gap-2"
                      >
                        <span className="text-text-3 shrink-0">·</span>
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
      <p className="text-label text-text-3 mb-1.5">{label}</p>
      <p className="text-body text-text">{value}</p>
    </div>
  );
}
