"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Target,
  PenTool,
  Smartphone,
  Mail,
  Map,
  Flag,
  FileText,
  Key,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Zap,
  ArrowUpRight,
  Video,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";
import type { AgentDefinition } from "@/src/lib/ai/agents/registry";

const ICON_MAP: Record<string, React.ElementType> = {
  Search,
  Target,
  PenTool,
  Smartphone,
  Mail,
  Map,
  Flag,
  FileText,
  Key,
  TrendingUp,
  Video,
};

interface InputConfig {
  showUrl: boolean;
  urlLabel: string;
  urlPlaceholder: string;
  promptLabel: string;
  promptPlaceholder: string;
  buildPayload: (url: string, prompt: string) => Record<string, unknown>;
}

const INPUT_CONFIGS: Record<string, InputConfig> = {
  "seo-audit": {
    showUrl: true,
    urlLabel: "Page URL to audit",
    urlPlaceholder: "https://yoursite.com",
    promptLabel: "Focus areas (optional)",
    promptPlaceholder:
      "e.g. Meta tags, heading structure, Core Web Vitals, internal linking...",
    buildPayload: (url, prompt) => ({ url, html: "", context: prompt }),
  },
  "page-cro": {
    showUrl: true,
    urlLabel: "Page URL to optimize",
    urlPlaceholder: "https://yoursite.com/pricing",
    promptLabel: "Conversion goal",
    promptPlaceholder:
      "e.g. Increase free trial signups, reduce bounce rate on the pricing page...",
    buildPayload: (url, prompt) => ({ url, context: prompt }),
  },
  copywriting: {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "What copy do you need?",
    promptPlaceholder:
      "Write 3 headline variants for a SaaS targeting remote teams. Tone: bold and direct.\n\nInclude product name, key benefit, and a call to action.",
    buildPayload: (_u, p) => ({ type: "headline", context: p, instructions: p }),
  },
  "social-content": {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "Topic and target platform",
    promptPlaceholder:
      "Create a week of posts about our new AI features for X and LinkedIn.\nTarget audience: B2B SaaS founders. Tone: conversational and insightful.",
    buildPayload: (_u, p) => ({ topic: p, count: 5 }),
  },
  "email-sequence": {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "Sequence brief",
    promptPlaceholder:
      "Welcome sequence for new free trial users.\nGoal: convert to paid within 14 days.\nProduct: AI marketing automation SaaS.",
    buildPayload: (_u, p) => ({ type: "welcome", goal: p, context: p }),
  },
  "content-strategy": {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "Content goal and time horizon",
    promptPlaceholder:
      "Build a 30-day content plan to drive organic traffic for an AI marketing SaaS.\nTarget audience: startup founders and marketing managers.",
    buildPayload: (_u, p) => ({ goal: p, context: p }),
  },
  "competitor-analysis": {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "Competitors to analyze",
    promptPlaceholder:
      "Analyze HubSpot, Jasper, and Copy.ai.\nFind messaging gaps and content opportunities we can exploit.",
    buildPayload: (_u, p) => ({ competitors: p, context: p }),
  },
  "blog-post": {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "Topic, target keyword and audience",
    promptPlaceholder:
      "Write a 1500-word post targeting 'AI marketing tools' for B2B SaaS founders.\nTone: educational but conversational. Include actionable takeaways.",
    buildPayload: (_u, p) => ({ topic: p, targetKeyword: p, wordCount: 1200 }),
  },
  "keyword-research": {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "Seed keyword or niche",
    promptPlaceholder: "AI marketing automation for small businesses",
    buildPayload: (_u, p) => ({ seedKeyword: p, context: p }),
  },
  "growth-playbook": {
    showUrl: false,
    urlLabel: "",
    urlPlaceholder: "",
    promptLabel: "Product description and growth goal",
    promptPlaceholder:
      "B2B SaaS for marketing teams, 10 employees, $5k MRR.\nGoal: grow from 100 to 500 MRR users in 90 days via content and SEO.",
    buildPayload: (_u, p) => ({ businessContext: p, goal: p }),
  },
};

const DEFAULT_CONFIG: InputConfig = {
  showUrl: false,
  urlLabel: "",
  urlPlaceholder: "",
  promptLabel: "Describe what you need",
  promptPlaceholder: "Be specific about your goal, audience, and constraints...",
  buildPayload: (_u, p) => ({ context: p }),
};

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// Agents that require a project context and have their own dedicated page
const PROJECT_REQUIRED_AGENTS = ["video-ad"];

export function AgentSandbox({ agent }: { agent: AgentDefinition }) {
  const config = INPUT_CONFIGS[agent.id] ?? DEFAULT_CONFIG;
  const IconComp = ICON_MAP[agent.icon] ?? FileText;

  // Video-ad (and similar) require a project — show a prompt to select one
  if (PROJECT_REQUIRED_AGENTS.includes(agent.id)) {
    return (
      <div>
        <PageHeader title={agent.name} description={agent.description}>
          <Badge variant="secondary" className="capitalize shrink-0">
            {agent.category}
          </Badge>
        </PageHeader>
        <Card className="animate-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-xl bg-accent-muted p-4">
              <IconComp className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-h2 text-text-primary">
              Select a project to get started
            </h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              {agent.name} requires a project context to generate videos. Open a project and navigate to the Video agent from there.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/projects">
                Open Projects
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (outputRef.current && generating) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result, generating]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (config.showUrl ? !url.trim() : !prompt.trim()) {
      toast("Please fill in the required fields.", "warning");
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
          agentId: agent.id,
          input: config.buildPayload(url, prompt),
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
          if (data.type === "text") setResult((p) => p + data.text);
          else if (data.type === "done") setUsage(data.usage);
          else if (data.type === "error") toast(data.error, "error");
        }
      }
    } catch {
      toast("Failed to connect to AI service", "error");
    }

    setGenerating(false);
  }

  function handleCopy() {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      toast("Copied to clipboard!", "info");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const isValid = config.showUrl ? url.trim().length > 0 : prompt.trim().length > 0;

  return (
    <div>
      <PageHeader title={agent.name} description={agent.description}>
        <Badge variant="secondary" className="capitalize shrink-0">
          {agent.category}
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <Card className="animate-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted">
                <IconComp className="h-5 w-5 text-accent" />
              </div>
              <CardTitle>Configure</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              {config.showUrl && (
                <div>
                  <label className="text-small text-text-secondary block mb-1.5">
                    {config.urlLabel}
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={config.urlPlaceholder}
                    required
                    className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-2.5 text-text-primary placeholder:text-text-tertiary text-[0.9375rem] transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                  />
                </div>
              )}

              <div>
                <label className="text-small text-text-secondary block mb-1.5">
                  {config.promptLabel}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={config.promptPlaceholder}
                  rows={config.showUrl ? 5 : 8}
                  required={!config.showUrl}
                  className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-3 text-text-primary placeholder:text-text-tertiary font-sans text-[0.9375rem] transition-all focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={generating || !isValid}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {agent.ctaLabel}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border-subtle">
              <p className="text-caption text-text-tertiary">
                Want to save results to a project?{" "}
                <Link
                  href="/projects"
                  className="text-accent hover:text-accent-hover transition-colors"
                >
                  Open a project{" "}
                  <ArrowUpRight className="inline h-3 w-3" />
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Output panel */}
        <Card className="animate-in" style={{ animationDelay: "60ms" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              {result && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResult("");
                      setUsage(null);
                    }}
                  >
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
                  <pre className="whitespace-pre-wrap text-body text-text-primary font-sans">
                    {result}
                    {generating && (
                      <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
                    )}
                  </pre>
                </div>

                {usage && (
                  <div className="flex items-center gap-3 text-small text-text-tertiary">
                    <Badge variant="secondary">
                      <Zap className="h-3 w-3 mr-1" />
                      {usage.inputTokens + usage.outputTokens} tokens
                    </Badge>
                    <span>{(usage.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-muted mb-4">
                  <IconComp className="h-7 w-7 text-accent" />
                </div>
                <p className="text-body text-text-secondary">
                  Fill in the details and hit &ldquo;{agent.ctaLabel}&rdquo;
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
