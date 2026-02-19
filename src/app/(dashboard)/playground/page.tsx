"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Copy, Check, RotateCcw, Loader2, Zap } from "lucide-react";
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

const skills = [
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

export default function PlaygroundPage() {
  const [selectedSkill, setSelectedSkill] = useState("copywriting");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentSkill = skills.find((s) => s.id === selectedSkill)!;

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
          skillId: selectedSkill,
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
  }

  function buildInput(): Record<string, unknown> {
    // Build skill-specific input from the prompt
    switch (selectedSkill) {
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
      navigator.clipboard.writeText(result);
      setCopied(true);
      toast("Copied to clipboard!", "info");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleReset() {
    setResult("");
    setUsage(null);
  }

  return (
    <div>
      <PageHeader
        title="AI Playground"
        description="Quick-generate marketing content with any skill"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="animate-in">
          <CardHeader>
            <CardTitle>Configure</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Skill Selector */}
            <p className="text-small text-text-secondary mb-2">Select Skill</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => {
                    setSelectedSkill(skill.id);
                    setResult("");
                    setUsage(null);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-small font-medium transition-all ${
                    selectedSkill === skill.id
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border-default text-text-secondary hover:border-border-strong"
                  }`}
                >
                  {skill.name}
                </button>
              ))}
            </div>

            <p className="text-small text-text-tertiary mb-3">
              {currentSkill.description}
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-small text-text-secondary block mb-1.5">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={currentSkill.placeholder}
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
                  <pre className="whitespace-pre-wrap text-body text-text-primary font-sans">
                    {result}
                    {generating && (
                      <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
                    )}
                  </pre>
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
                  Select a skill, write your prompt, and hit Generate
                </p>
                <p className="text-small text-text-tertiary mt-2">
                  Results stream in real-time from Claude AI
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
