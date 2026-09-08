"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Copy, Check, RotateCcw, Loader2, Zap, Save } from "lucide-react";
import { QuotaBadge } from "@/src/components/generation/quota-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

const agents = [
  {
    id: "seo-audit",
    name: "SEO Audit",
    description: "Analyze a URL for SEO issues",
    placeholder: "Enter the URL and any specific areas to focus on...\n\nExample: Audit https://example.com focusing on meta tags and content quality",
    inputFields: { url: true },
  },
  {
    id: "page-cro",
    name: "Page CRO",
    description: "Conversion optimization analysis",
    placeholder: "Describe the page you want to optimize and your conversion goals...\n\nExample: Optimize our SaaS pricing page for free trial signups",
    inputFields: {},
  },
  {
    id: "copywriting",
    name: "Copywriting",
    description: "Generate marketing copy",
    placeholder: "What kind of copy do you need? Include context about your product, audience, and tone...\n\nExample: Write 3 headline variants for a project management SaaS targeting remote teams",
    inputFields: {},
  },
  {
    id: "social-content",
    name: "Social Content",
    description: "Create social media posts",
    placeholder: "What topic or angle should the posts cover? Specify platforms if needed...\n\nExample: Create a week of posts about our new AI features for X and LinkedIn",
    inputFields: {},
  },
  {
    id: "email-sequence",
    name: "Email Sequence",
    description: "Build automated email flows",
    placeholder: "What kind of email sequence? Include trigger, audience, and goal...\n\nExample: Welcome sequence for new free trial users, goal is to convert to paid within 14 days",
    inputFields: {},
  },
  {
    id: "content-strategy",
    name: "Content Strategy",
    description: "Strategic content planning with topics and calendar",
    placeholder: "What are your content goals and time horizon?\n\nExample: Build a 30-day content plan to drive organic traffic and establish thought leadership in AI marketing",
    inputFields: {},
  },
  {
    id: "competitor-analysis",
    name: "Competitor Analysis",
    description: "Deep competitive intelligence and positioning gaps",
    placeholder: "Which competitors should we analyze? What aspects matter most?\n\nExample: Analyze HubSpot, Jasper, and Copy.ai — find messaging gaps and content opportunities",
    inputFields: {},
  },
  {
    id: "blog-post",
    name: "Blog Post",
    description: "Write long-form SEO blog posts with meta and social snippets",
    placeholder: "What's the topic, target keyword, and audience?\n\nExample: Write a 1500-word post targeting 'AI marketing tools' for B2B SaaS founders. Tone: educational but conversational.",
    inputFields: {},
  },
  {
    id: "keyword-research",
    name: "Keyword Research",
    description: "Discover keyword clusters, long-tail opportunities, and content gaps",
    placeholder: "What's your seed keyword or niche?\n\nExample: AI marketing automation for small businesses",
    inputFields: {},
  },
  {
    id: "growth-playbook",
    name: "Growth Playbook",
    description: "Generate a 90-day AI-powered growth plan with prioritised actions",
    placeholder: "Describe your product, target audience, and main growth goal.\n\nExample: B2B SaaS for marketing teams, 10 employees, goal is to grow from 100 to 500 MRR users in 90 days via content and SEO",
    inputFields: {},
  },
];

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/** Renders parsed JSON as human-readable formatted content */
function FormattedOutput({ data }: { data: unknown }) {
  if (data == null) return null;

  // Array of items (posts, variants, keywords, emails, etc.)
  if (Array.isArray(data)) {
    return (
      <div className="space-y-3">
        {data.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-default bg-surface-1 p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <FormattedOutput data={item} />
          </div>
        ))}
      </div>
    );
  }

  // Object with fields
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Check for common wrapper patterns: { variants: [...] }, { posts: [...] }, { keywords: [...] }
    const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    const scalarKeys = Object.keys(obj).filter(
      (k) => !Array.isArray(obj[k]) && typeof obj[k] !== "object"
    );
    const objectKeys = Object.keys(obj).filter(
      (k) => typeof obj[k] === "object" && !Array.isArray(obj[k]) && obj[k] !== null
    );

    return (
      <div className="space-y-3">
        {/* Render scalar fields as labeled values */}
        {scalarKeys.map((key) => (
          <div key={key}>
            <span className="text-caption text-accent font-medium uppercase tracking-wider">
              {key.replace(/_/g, " ")}
            </span>
            <p className="mt-0.5 text-body text-text-primary whitespace-pre-wrap">
              {String(obj[key])}
            </p>
          </div>
        ))}
        {/* Render nested objects */}
        {objectKeys.map((key) => (
          <div key={key} className="mt-2">
            <span className="text-caption text-accent font-medium uppercase tracking-wider">
              {key.replace(/_/g, " ")}
            </span>
            <div className="mt-1 pl-3 border-l-2 border-accent/20">
              <FormattedOutput data={obj[key]} />
            </div>
          </div>
        ))}
        {/* Render the main array (variants, posts, etc.) */}
        {arrayKey && (
          <div className="mt-2">
            <span className="text-caption text-accent font-medium uppercase tracking-wider">
              {arrayKey.replace(/_/g, " ")} ({(obj[arrayKey] as unknown[]).length})
            </span>
            <div className="mt-2">
              <FormattedOutput data={obj[arrayKey]} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Primitive
  return <p className="text-body text-text-primary whitespace-pre-wrap">{String(data)}</p>;
}

function PlaygroundInner() {
  const searchParams = useSearchParams();
  const initialAgent = searchParams.get("agent") ?? "copywriting";
  const validAgent = agents.find((a) => a.id === initialAgent)
    ? initialAgent
    : "copywriting";

  const [selectedAgent, setSelectedAgent] = useState(validAgent);

  // Sync when query param changes (e.g. sidebar navigation)
  useEffect(() => {
    const agentParam = searchParams.get("agent");
    if (agentParam && agents.find((a) => a.id === agentParam)) {
      setSelectedAgent(agentParam);
    }
  }, [searchParams]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentAgent = agents.find((s) => s.id === selectedAgent)!;

  // Strip markdown code fences and parse JSON if possible
  const parsedResult = useMemo(() => {
    if (!result) return null;
    // Strip ```json ... ``` fences
    const cleaned = result.replace(/^```(?:json)?\s*\n?/gm, "").replace(/\n?```\s*$/gm, "");
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }, [result]);

  // Plain text version for copy/save (strip fences)
  const cleanedResult = useMemo(() => {
    if (!result) return "";
    return result.replace(/^```(?:json)?\s*\n?/gm, "").replace(/\n?```\s*$/gm, "");
  }, [result]);

  // Auto-scroll output during streaming
  useEffect(() => {
    if (outputRef.current && generating) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result, generating]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!prompt.trim()) {
      toast("Please enter a prompt.", "warning");
      return;
    }

    setGenerating(true);
    setResult("");
    setUsage(null);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent,
          input: buildInput(),
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
            setResult((prev) => prev + data.text);
          } else if (data.type === "done") {
            setUsage(data.usage);
          } else if (data.type === "error") {
            toast(data.error, "error");
          }
        }
      }
    } catch (err) {
      toast("Failed to connect to AI service", "error");
    }

    setGenerating(false);
    // Notify sidebar to refresh generation counter
    window.dispatchEvent(new Event("conduikt:generation"));
  }

  function buildInput(): Record<string, unknown> {
    switch (selectedAgent) {
      case "seo-audit":
        return { url: prompt, html: "" };
      case "page-cro":
        return { url: prompt, context: prompt };
      case "copywriting":
        return { type: "headline", context: prompt, instructions: prompt };
      case "social-content":
        return { topic: prompt, count: 5 };
      case "email-sequence":
        return { type: "welcome", goal: prompt, context: prompt };
      case "content-strategy":
        return { goal: prompt, context: prompt };
      case "competitor-analysis":
        return { competitors: prompt, context: prompt };
      case "blog-post":
        return { topic: prompt, targetKeyword: prompt, wordCount: 1200 };
      case "keyword-research":
        return { seedKeyword: prompt, context: prompt };
      case "growth-playbook":
        return { businessContext: prompt, goal: prompt };
      default:
        return { context: prompt };
    }
  }

  function handleCopy() {
    if (result) {
      navigator.clipboard.writeText(cleanedResult);
      setCopied(true);
      toast("Copied to clipboard!", "info");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleReset() {
    setResult("");
    setUsage(null);
    setSaved(false);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/playground/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgent,
          prompt,
          result: cleanedResult,
          usage,
        }),
      });
      if (res.ok) {
        setSaved(true);
        toast("Saved to your library!", "success");
      } else {
        const err = await res.json();
        toast(err.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save", "error");
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="AI Playground"
        description="Quick-generate marketing content with any agent"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="animate-in">
          <CardHeader>
            <CardTitle>Configure</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Skill Selector */}
            <p className="text-small text-text-secondary mb-2">Select Agent</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent.id);
                    setResult("");
                    setUsage(null);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-small font-medium transition-all ${
                    selectedAgent === agent.id
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border-default text-text-secondary hover:border-border-strong"
                  }`}
                >
                  {agent.name}
                </button>
              ))}
            </div>

            <p className="text-small text-text-tertiary mb-3">
              {currentAgent.description}
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-small text-text-secondary block mb-1.5">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={currentAgent.placeholder}
                  rows={8}
                  className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={generating || !prompt.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>

              <QuotaBadge />
            </form>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <Card className="animate-in" style={{ animationDelay: "60ms" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              {result && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || saved}
                    title="Save to library"
                  >
                    {saved ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {result || generating ? (
              <div className="space-y-4">
                <div
                  ref={outputRef}
                  className="rounded-lg border border-border-default bg-surface-0 p-4 max-h-[500px] overflow-y-auto"
                >
                  {generating && !parsedResult ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
                      <p className="text-body text-text-primary font-medium">
                        Writing your {currentAgent.name.toLowerCase()}...
                      </p>
                      <p className="text-small text-text-tertiary mt-2">
                        We&apos;ll format the result once it&apos;s ready.
                      </p>
                    </div>
                  ) : parsedResult ? (
                    <FormattedOutput data={parsedResult} />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-body text-text-primary whitespace-pre-wrap">
                        {cleanedResult}
                      </p>
                    </div>
                  )}
                </div>

                {/* Usage stats */}
                {usage && (
                  <div className="flex items-center gap-3 text-small text-text-tertiary">
                    <Badge variant="secondary">
                      <Zap className="h-3 w-3 mr-1" />
                      {usage.inputTokens + usage.outputTokens} tokens
                    </Badge>
                    <span>
                      {(usage.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <Sparkles className="h-10 w-10 text-text-tertiary mb-4" />
                <p className="text-body text-text-secondary">
                  Select an agent, write your prompt, and hit Generate
                </p>
                <p className="text-small text-text-tertiary mt-2">
                  Results stream in real-time
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense>
      <PlaygroundInner />
    </Suspense>
  );
}
