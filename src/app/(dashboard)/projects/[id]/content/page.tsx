"use client";

import { useState, useEffect, useRef, use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Twitter,
  Linkedin,
  Mail,
  Globe,
  FileText,
  Copy,
  Check,
  Save,
  Loader2,
  Zap,
  ArrowUpRight,
  Clock,
  Map,
  Crosshair,
  Send,
  CalendarClock,
  ChevronDown,
  GitBranch,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/src/components/ui/tabs";
import { PageHeader } from "@/src/components/layout/page-header";
import { ProjectNav } from "@/src/components/layout/project-nav";
import { useToast } from "@/src/components/ui/toast";
import { VariantPanel } from "@/src/components/content/variant-panel";
import { BulkGenerateDialog } from "@/src/components/content/bulk-generate-dialog";
import { SendToWebhook } from "@/src/components/content/send-to-webhook";

// ---------- types ----------

interface ProjectContext {
  name: string;
  website_url: string | null;
  description: string | null;
  target_audience: unknown;
  value_proposition: string | null;
  brand_voice: unknown;
}

interface Asset {
  id: string;
  type: string;
  channel: string | null;
  title: string | null;
  content: { raw: string; skill: string; prompt: string };
  status: string;
  created_at: string;
}

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

interface SocialPost {
  platform: "x" | "linkedin";
  text: string;
  angle: string;
  hook: string;
  image_suggestion: string | null;
  best_time: string;
}

// ---------- skill definitions ----------

const contentSkills = [
  {
    id: "copywriting",
    name: "Copywriting",
    icon: FileText,
    assetType: "copy_block" as const,
    channel: "web" as const,
    description: "Headlines, landing copy, CTAs, value propositions",
    placeholder:
      "What copy do you need?\n\ne.g. Write 3 headline variants for our pricing page that emphasize the free trial",
  },
  {
    id: "social-content",
    name: "Social Posts",
    icon: Twitter,
    assetType: "social_post" as const,
    channel: "x" as const,
    description: "X threads, LinkedIn posts, content calendar",
    placeholder:
      "What should the posts be about?\n\ne.g. Create 5 posts about our new AI audit feature, mix educational + behind-the-scenes angles",
  },
  {
    id: "email-sequence",
    name: "Email Sequence",
    icon: Mail,
    assetType: "email" as const,
    channel: "email" as const,
    description: "Welcome, nurture, onboarding, and launch sequences",
    placeholder:
      "What kind of email flow?\n\ne.g. 5-email welcome sequence for new free trial users, goal is to activate and convert",
  },
  {
    id: "page-cro",
    name: "CRO Analysis",
    icon: ArrowUpRight,
    assetType: "copy_block" as const,
    channel: "web" as const,
    description: "Conversion rate optimization recommendations",
    placeholder:
      "Which page or funnel to optimize?\n\ne.g. Analyze our signup flow and suggest copy + layout changes to improve conversions",
  },
  {
    id: "content-strategy",
    name: "Content Strategy",
    icon: Map,
    assetType: "copy_block" as const,
    channel: "web" as const,
    description: "Strategic content plan with topics, formats, and calendar",
    placeholder:
      "What are your content goals?\n\ne.g. Build a 30-day content plan to drive organic traffic and establish thought leadership in AI marketing",
  },
  {
    id: "blog-post",
    name: "Blog Post",
    icon: Globe,
    assetType: "blog_post" as const,
    channel: "web" as const,
    description: "SEO-optimized long-form blog posts with meta tags and social snippets",
    placeholder:
      "What's the blog post about?\n\ne.g. How to automate your social media marketing with AI — target keyword: AI social media automation",
  },
  {
    id: "competitor-analysis",
    name: "Competitor Intel",
    icon: Crosshair,
    assetType: "copy_block" as const,
    channel: "web" as const,
    description: "Competitive analysis with positioning gaps and opportunities",
    placeholder:
      "Which competitors to analyze?\n\ne.g. Analyze HubSpot, Jasper, and Copy.ai — find messaging gaps and content opportunities we can exploit",
  },
];

// ---------- helpers ----------

function buildSkillInput(
  skillId: string,
  prompt: string
): Record<string, unknown> {
  switch (skillId) {
    case "copywriting":
      return { type: "headline", context: prompt, instructions: prompt };
    case "social-content":
      return { topic: prompt, count: 5 };
    case "blog-post":
      return { topic: prompt, wordCount: 1500 };
    case "email-sequence":
      return { type: "welcome", goal: prompt, context: prompt, count: 5 };
    case "page-cro":
      return { url: prompt, context: prompt };
    case "content-strategy":
      return { goal: prompt, context: prompt };
    case "competitor-analysis":
      return { competitors: prompt, context: prompt };
    default:
      return { context: prompt };
  }
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString();
}

const assetTypeLabels: Record<string, string> = {
  copy_block: "Copy",
  social_post: "Social Post",
  email: "Email",
  headline: "Headline",
  landing_page: "Landing Page",
  cta: "CTA",
};

const channelIcons: Record<string, typeof Twitter> = {
  x: Twitter,
  linkedin: Linkedin,
  email: Mail,
  web: Globe,
};

// ---------- component ----------

function ContentPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const outputRef = useRef<HTMLDivElement>(null);

  // Project context
  const [project, setProject] = useState<ProjectContext | null>(null);

  // Generation state — seed from URL params if present
  const [selectedSkill, setSelectedSkill] = useState(
    () => searchParams.get("skill") ?? "copywriting"
  );
  const [prompt, setPrompt] = useState(() => searchParams.get("prompt") ?? "");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Assets list
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Social posts parsed state
  const [parsedPosts, setParsedPosts] = useState<SocialPost[] | null>(null);

  // Publish state
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null); // "x-0", "linkedin-2", etc.
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);

  // Schedule state — tracks which post card has the picker open: "x-0", "linkedin-1", etc.
  const [schedulingKey, setSchedulingKey] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  const skill = contentSkills.find((s) => s.id === selectedSkill)!;

  // ---------- data fetching ----------

  useEffect(() => {
    fetchProject();
    fetchAssets();
    fetchConnectedAccounts();
  }, [projectId]);

  async function fetchProject() {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
    }
  }

  async function fetchAssets() {
    const res = await fetch(`/api/projects/${projectId}/assets`);
    if (res.ok) {
      const data = await res.json();
      setAssets(data);
    }
    setLoadingAssets(false);
  }

  async function fetchConnectedAccounts() {
    const { createClient } = await import("@/src/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("connected_accounts")
      .select("platform");
    setConnectedPlatforms((data ?? []).map((a: { platform: string }) => a.platform));
  }

  async function handlePublish(platform: "x" | "linkedin", postText: string, publishKey: string) {
    if (!postText.trim()) return;

    // Ensure asset is saved first
    let assetId = savedAssetId;
    if (!assetId) {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: skill.assetType,
          channel: platform,
          title: prompt.slice(0, 100),
          content: { raw: result, skill: selectedSkill, prompt },
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        assetId = saved.id;
        setSavedAssetId(saved.id);
        fetchAssets();
      }
      setSaving(false);
    }

    setPublishing(publishKey);
    const res = await fetch(`/api/publish/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: postText, assetId }),
    });

    const data = await res.json();
    if (res.ok) {
      toast(
        platform === "x"
          ? `Posted to X!${data.tweetUrl ? ` View it →` : ""}`
          : "Posted to LinkedIn!",
        "success"
      );
      fetchAssets();
    } else {
      if (data.reconnect) {
        toast(`${platform === "x" ? "X" : "LinkedIn"} token expired — reconnect in Settings → Integrations`, "error");
        setConnectedPlatforms((prev) => prev.filter((p) => p !== platform));
      } else {
        toast(data.error || "Publish failed", "error");
      }
    }
    setPublishing(null);
  }

  async function handleSchedule(platform: "x" | "linkedin", postText: string, publishKey: string) {
    if (!scheduleDateTime) return;

    // Ensure asset is saved first
    let assetId = savedAssetId;
    if (!assetId) {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: skill.assetType,
          channel: platform,
          title: prompt.slice(0, 100),
          content: { raw: result, skill: selectedSkill, prompt },
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        assetId = saved.id;
        setSavedAssetId(saved.id);
        fetchAssets();
      }
      setSaving(false);
    }

    if (!assetId) {
      toast("Failed to save asset before scheduling", "error");
      return;
    }

    const res = await fetch(`/api/projects/${projectId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        channel: platform,
        scheduledFor: new Date(scheduleDateTime).toISOString(),
        postText,
      }),
    });

    if (res.ok) {
      toast(
        `Scheduled for ${new Date(scheduleDateTime).toLocaleString()}`,
        "success"
      );
      setSchedulingKey(null);
      setScheduleDateTime("");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to schedule post", "error");
    }
  }

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current && generating) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result, generating]);

  // ---------- generation ----------

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) {
      toast("Enter a brief for what you want generated.", "warning");
      return;
    }

    setGenerating(true);
    setResult("");
    setUsage(null);
    setSavedAssetId(null);
    setParsedPosts(null);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: selectedSkill,
          projectId,
          input: buildSkillInput(selectedSkill, prompt),
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
            setResult(fullText);
          } else if (data.type === "done") {
            setUsage(data.usage);
          } else if (data.type === "error") {
            toast(data.error, "error");
          }
        }
      }

      // Parse JSON for social posts after streaming completes
      if (selectedSkill === "social-content" && fullText) {
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch?.[0] ?? fullText);
          if (Array.isArray(parsed?.posts)) setParsedPosts(parsed.posts);
        } catch {
          // Not valid JSON — leave parsedPosts null, raw text will display
        }
      }
    } catch {
      toast("Failed to connect to AI service", "error");
    }

    setGenerating(false);
    // Notify sidebar to refresh generation counter
    window.dispatchEvent(new Event("conduikt:generation"));
  }

  // ---------- save asset ----------

  async function handleSave() {
    if (!result.trim()) return;

    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: skill.assetType,
        channel: skill.channel,
        title: prompt.slice(0, 100),
        content: {
          raw: result,
          skill: selectedSkill,
          prompt,
        },
      }),
    });

    if (res.ok) {
      toast("Asset saved as draft!", "success");
      fetchAssets();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to save", "error");
    }
    setSaving(false);
  }

  // ---------- copy ----------

  function handleCopy() {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      toast("Copied to clipboard!", "info");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ---------- channel previews ----------

  function XPreview({ text }: { text: string }) {
    const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;
    const charCount = text.length;
    return (
      <div className="rounded-xl border border-border-default bg-surface-0 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-accent to-[#C88550] flex items-center justify-center">
            <span className="text-xs font-bold text-surface-0">C</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-body font-medium text-text-primary">
                {project?.name || "Conduikt"}
              </span>
              <span className="text-small text-text-tertiary">@conduikt</span>
            </div>
            <p className="mt-1 text-body text-text-primary whitespace-pre-line break-words">
              {truncated}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={charCount <= 280 ? "success" : "error"}
              >
                {charCount}/280
              </Badge>
              {charCount > 280 && (
                <span className="text-small text-error">
                  {charCount - 280} chars over limit
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function LinkedInPreview({ text }: { text: string }) {
    const charCount = text.length;
    const isLong = charCount > 700;
    const preview = isLong ? text.slice(0, 200) : text;
    const [expanded, setExpanded] = useState(false);
    return (
      <div className="rounded-xl border border-border-default bg-surface-0 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-accent to-[#C88550] flex items-center justify-center">
            <span className="text-sm font-bold text-surface-0">C</span>
          </div>
          <div>
            <p className="text-body font-medium text-text-primary">
              {project?.name || "Conduikt"}
            </p>
            <p className="text-small text-text-tertiary">
              AI Marketing Automation
            </p>
          </div>
        </div>
        <p className="text-body text-text-primary whitespace-pre-line break-words">
          {expanded ? text : preview}
          {isLong && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-accent ml-1"
            >
              ...see more
            </button>
          )}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant={charCount <= 700 ? "success" : "warning"}>
            {charCount}/700
          </Badge>
          {charCount > 700 && (
            <span className="text-small text-warning">
              Optimal LinkedIn length is under 700
            </span>
          )}
        </div>
      </div>
    );
  }

  function EmailPreview({ text }: { text: string }) {
    // Try to extract subject/body from structured output
    let subject = "Your subject line here";
    let body = text;
    const subjectMatch = text.match(/"subject_line"\s*:\s*"([^"]+)"/);
    if (subjectMatch) subject = subjectMatch[1];
    const bodyMatch = text.match(/"body_html"\s*:\s*"([\s\S]*?)(?:(?<!\\)")/);
    if (bodyMatch) body = bodyMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');

    return (
      <div className="rounded-xl border border-border-default bg-surface-0 overflow-hidden">
        <div className="border-b border-border-default px-4 py-3 bg-surface-1">
          <div className="flex items-center gap-2 text-small text-text-secondary">
            <span className="font-medium text-text-primary">Subject:</span>
            {subject}
          </div>
          <div className="flex items-center gap-2 text-small text-text-tertiary mt-1">
            <span>From:</span>
            {project?.name || "Conduikt"} &lt;hello@conduikt.io&gt;
          </div>
        </div>
        <div className="p-4">
          <div className="text-body text-text-primary whitespace-pre-line break-words max-h-[300px] overflow-y-auto">
            {body}
          </div>
        </div>
      </div>
    );
  }

  function RawPreview({ text }: { text: string }) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-0 p-4">
        <pre className="whitespace-pre-wrap text-body text-text-primary font-sans break-words max-h-[400px] overflow-y-auto">
          {text}
        </pre>
      </div>
    );
  }

  // ---------- social post cards ----------

  function SocialPostCard({ post, index }: { post: SocialPost; index: number }) {
    const isX = post.platform === "x";
    const charLimit = isX ? 280 : 700;
    const charCount = post.text.length;
    const publishKey = `${post.platform}-${index}`;
    const [cardCopied, setCardCopied] = useState(false);
    const isScheduling = schedulingKey === publishKey;

    // Min datetime for the picker — 5 minutes from now
    const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

    function copyPost() {
      navigator.clipboard.writeText(post.text);
      setCardCopied(true);
      toast("Copied!", "info");
      setTimeout(() => setCardCopied(false), 2000);
    }

    return (
      <div
        className="rounded-xl border border-border-default bg-surface-0 p-4 space-y-3 animate-in"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {isX ? (
              <Twitter className="h-4 w-4 text-text-primary" />
            ) : (
              <Linkedin className="h-4 w-4 text-[#0A66C2]" />
            )}
            <Badge variant="secondary">{isX ? "X (Twitter)" : "LinkedIn"}</Badge>
            {post.angle && (
              <Badge variant="secondary" className="text-text-tertiary">{post.angle}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="ghost" onClick={copyPost}>
              {cardCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {cardCopied ? "Copied" : "Copy"}
            </Button>
            {/* Schedule button — shown when platform is connected */}
            {((isX && connectedPlatforms.includes("x")) ||
              (!isX && connectedPlatforms.includes("linkedin"))) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setSchedulingKey(isScheduling ? null : publishKey)
                }
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Schedule
                <ChevronDown className={`h-3 w-3 transition-transform ${isScheduling ? "rotate-180" : ""}`} />
              </Button>
            )}
            {isX && connectedPlatforms.includes("x") && (
              <Button
                size="sm"
                onClick={() => handlePublish("x", post.text, publishKey)}
                disabled={publishing !== null}
              >
                {publishing === publishKey ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Twitter className="h-3.5 w-3.5" />
                )}
                {publishing === publishKey ? "Posting…" : "Post now"}
              </Button>
            )}
            {!isX && connectedPlatforms.includes("linkedin") && (
              <Button
                size="sm"
                onClick={() => handlePublish("linkedin", post.text, publishKey)}
                disabled={publishing !== null}
              >
                {publishing === publishKey ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Linkedin className="h-3.5 w-3.5" />
                )}
                {publishing === publishKey ? "Posting…" : "Post now"}
              </Button>
            )}
          </div>
        </div>

        {/* Schedule picker — inline, only shows when active */}
        {isScheduling && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
            <p className="text-small font-medium text-text-primary flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-accent" />
              Schedule for later
            </p>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                min={minDateTime}
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="flex-1 rounded-lg border border-border-strong bg-surface-0 px-3 py-1.5 text-small text-text-primary focus:border-accent focus:outline-none"
              />
              <Button
                size="sm"
                onClick={() =>
                  handleSchedule(post.platform, post.text, publishKey)
                }
                disabled={!scheduleDateTime}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSchedulingKey(null);
                  setScheduleDateTime("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Text */}
        <p className="text-body text-text-primary whitespace-pre-line leading-relaxed">
          {post.text}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-default">
          <Badge variant={charCount <= charLimit ? "success" : "error"}>
            {charCount}/{charLimit}
          </Badge>
          {charCount > charLimit && (
            <span className="text-small text-error">{charCount - charLimit} over</span>
          )}
          {post.best_time && (
            <span className="flex items-center gap-1 text-small text-text-tertiary">
              <Clock className="h-3 w-3" />
              {post.best_time}
            </span>
          )}
        </div>

        {/* Image suggestion */}
        {post.image_suggestion && (
          <p className="text-small text-text-tertiary italic border-l-2 border-accent/30 pl-3">
            {post.image_suggestion}
          </p>
        )}
      </div>
    );
  }

  // ---------- render ----------

  return (
    <div>
      <PageHeader
        title="Content Studio"
        description={
          project
            ? `Generating for ${project.name}${project.website_url ? ` — ${project.website_url}` : ""}`
            : "Generate and manage marketing content"
        }
      />

      <ProjectNav projectId={projectId} />

      {/* Project context banner */}
      {project && (
        <div className="mb-6 rounded-lg border border-border-default bg-surface-1 px-4 py-3 flex items-start gap-4 text-small animate-in">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-text-secondary">
              <span className="font-medium text-text-primary">Context loaded:</span>{" "}
              {project.description || "No description"}
            </p>
            {project.value_proposition && (
              <p className="text-text-tertiary truncate">
                Value prop: {project.value_proposition}
              </p>
            )}
            {project.target_audience != null && (
              <p className="text-text-tertiary truncate">
                Audience:{" "}
                {typeof project.target_audience === "object"
                  ? JSON.stringify(project.target_audience)
                  : String(project.target_audience)}
              </p>
            )}
          </div>
          <Badge variant="secondary">
            <Globe className="h-3 w-3 mr-1" />
            {project.website_url || "No URL"}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---- Left: Generation Panel ---- */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="animate-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Generate Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Skill Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {contentSkills.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSkill(s.id);
                      if (result) {
                        setResult("");
                        setUsage(null);
                      }
                    }}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-small font-medium transition-all text-left ${
                      selectedSkill === s.id
                        ? "border-accent bg-accent-muted text-accent"
                        : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                    }`}
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>

              <p className="text-small text-text-tertiary mb-3">
                {skill.description}
              </p>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="text-small text-text-secondary block mb-1.5">
                    Brief / Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={skill.placeholder}
                    rows={6}
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

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setBulkOpen(true)}
                >
                  <Zap className="h-4 w-4" />
                  Bulk Generate
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ---- Saved Assets List ---- */}
          <Card className="animate-in" style={{ animationDelay: "120ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Saved Assets</span>
                <Badge variant="secondary">{assets.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAssets ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 text-accent animate-spin" />
                </div>
              ) : assets.length === 0 ? (
                <p className="text-body text-text-tertiary text-center py-6">
                  No assets yet. Generate content and save it here.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {assets.map((asset) => {
                    const ChannelIcon =
                      channelIcons[asset.channel ?? "web"] ?? Globe;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => {
                          const raw = asset.content?.raw ?? "";
                          const assetSkill = asset.content?.skill ?? "copywriting";
                          setResult(raw);
                          setSelectedSkill(assetSkill);
                          setPrompt(asset.content?.prompt ?? "");
                          setUsage(null);
                          setSavedAssetId(asset.id);
                          setParsedPosts(null);
                          if (assetSkill === "social-content" && raw) {
                            try {
                              const jsonMatch = raw.match(/\{[\s\S]*\}/);
                              const parsed = JSON.parse(jsonMatch?.[0] ?? raw);
                              if (Array.isArray(parsed?.posts)) setParsedPosts(parsed.posts);
                            } catch { /* not JSON */ }
                          }
                        }}
                        className="w-full text-left rounded-lg border border-border-default p-3 hover:bg-surface-2 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <ChannelIcon className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-small font-medium text-text-primary truncate">
                            {asset.title || "Untitled"}
                          </span>
                          <Badge variant="secondary" className="ml-auto shrink-0">
                            {assetTypeLabels[asset.type] ?? asset.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-small text-text-tertiary">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(asset.created_at)}
                          <Badge
                            variant={
                              asset.status === "published"
                                ? "success"
                                : asset.status === "approved"
                                ? "info"
                                : "secondary"
                            }
                          >
                            {asset.status}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---- Right: Preview Panel ---- */}
        <div className="lg:col-span-3">
          <Card className="animate-in" style={{ animationDelay: "60ms" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                {result && !generating && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* For non-social skills, show copy button */}
                    {selectedSkill !== "social-content" && (
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : "Save Draft"}
                    </Button>
                    <SendToWebhook
                      title={skill.name}
                      content={result}
                      contentType={skill.assetType}
                      projectId={projectId}
                    />
                    {/* Connect nudge if social content and no accounts */}
                    {selectedSkill === "social-content" && connectedPlatforms.length === 0 && (
                      <Button size="sm" variant="secondary" asChild>
                        <a href="/settings/integrations">
                          <Send className="h-4 w-4" />
                          Connect to publish
                        </a>
                      </Button>
                    )}
                  </div>
                )}
                {/* A/B Variant button — shown when content is generated */}
                {result && !generating && (
                  <VariantPanel
                    originalContent={result}
                    projectId={projectId}
                    agentId={selectedSkill}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {result || generating ? (
                <div className="space-y-4">
                  {/* Tab previews based on skill */}
                  {selectedSkill === "social-content" ? (
                    generating ? (
                      // Show raw stream while generating
                      <div ref={outputRef}>
                        <RawPreview text={result} />
                      </div>
                    ) : parsedPosts ? (
                      // Parsed post cards
                      <Tabs defaultValue="posts">
                        <TabsList>
                          <TabsTrigger value="posts">
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Posts ({parsedPosts.length})
                          </TabsTrigger>
                          <TabsTrigger value="raw">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Raw JSON
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="posts">
                          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {parsedPosts.map((post, i) => (
                              <SocialPostCard key={i} post={post} index={i} />
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="raw">
                          <div ref={outputRef}>
                            <RawPreview text={result} />
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      // Fallback if JSON parse failed
                      <div ref={outputRef}>
                        <RawPreview text={result} />
                      </div>
                    )
                  ) : selectedSkill === "email-sequence" ? (
                    <Tabs defaultValue="email">
                      <TabsList>
                        <TabsTrigger value="email">
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Email Preview
                        </TabsTrigger>
                        <TabsTrigger value="raw">
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Raw
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="email">
                        <EmailPreview text={result} />
                      </TabsContent>
                      <TabsContent value="raw">
                        <div ref={outputRef}>
                          <RawPreview text={result} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <Tabs defaultValue="formatted">
                      <TabsList>
                        <TabsTrigger value="formatted">
                          <Globe className="h-3.5 w-3.5 mr-1.5" />
                          Preview
                        </TabsTrigger>
                        <TabsTrigger value="raw">
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                          Raw
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="formatted">
                        <div
                          ref={outputRef}
                          className="rounded-xl border border-border-default bg-surface-0 p-6 max-h-[500px] overflow-y-auto"
                        >
                          <div className="prose prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-body text-text-primary font-sans">
                              {result}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="raw">
                        <RawPreview text={result} />
                      </TabsContent>
                    </Tabs>
                  )}

                  {/* Streaming cursor */}
                  {generating && (
                    <div className="flex items-center gap-2 text-small text-accent">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Streaming from Claude...
                    </div>
                  )}

                  {/* Usage stats */}
                  {usage && (
                    <div className="flex items-center gap-3 text-small text-text-tertiary">
                      <Badge variant="secondary">
                        <Zap className="h-3 w-3 mr-1" />
                        {usage.inputTokens + usage.outputTokens} tokens
                      </Badge>
                      <span>{(usage.durationMs / 1000).toFixed(1)}s</span>
                      <span className="text-text-tertiary">
                        {skill.name}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-center">
                  <Sparkles className="h-10 w-10 text-text-tertiary mb-4" />
                  <p className="text-body text-text-secondary">
                    Generated content will preview here
                  </p>
                  <p className="text-small text-text-tertiary mt-1">
                    Select a skill, write your brief, and click Generate
                  </p>
                  <p className="text-small text-text-tertiary mt-3">
                    Project context is automatically injected into prompts
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BulkGenerateDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        projectId={projectId}
        agentId={selectedSkill}
        agentName={skill.name}
      />
    </div>
  );
}

export default function ContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>}>
      <ContentPageInner params={params} />
    </Suspense>
  );
}
