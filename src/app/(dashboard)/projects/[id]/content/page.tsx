"use client";

import { useState, useEffect, useRef, use, Suspense } from "react";
import Link from "next/link";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
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
  Download,
  Lock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";
import { parseJsonResponse } from "@/src/lib/ai/parse-json";
import { useUsageLimitModal } from "@/src/components/usage/limit-modal";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";
import { VariantPanel } from "@/src/components/content/variant-panel";
import { BulkGenerateDialog } from "@/src/components/content/bulk-generate-dialog";
import { SendToWebhook } from "@/src/components/content/send-to-webhook";
import { MediaPicker } from "@/src/components/media/media-picker";
import { SendBroadcastModal } from "@/src/components/email/send-broadcast-modal";
import type { PostMedia } from "@/src/lib/media/types";
import { EMPTY_MEDIA, hasMedia } from "@/src/lib/media/types";
import { splitForX } from "@/src/lib/integrations/x-thread";

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

/** Strip markdown code fences and extract JSON */
function extractJson(text: string): Record<string, unknown> | null {
  try {
    return parseJsonResponse(text) as Record<string, unknown>;
  } catch (err) {
    console.warn("[content] parse failed:", err, "raw head:", text.slice(0, 300));
    return null;
  }
}

/** Skills that return structured JSON we can parse and render */
const jsonSkills = ["copywriting", "content-strategy", "email-sequence", "competitor-analysis", "page-cro", "blog-post"];

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
      return { url: prompt, context: prompt, html: "" };
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

// ---------- inline social-post components ----------
// These live at module scope so React reconciles the same component instance
// across parent re-renders. Defining them inside the parent caused the entire
// card subtree to unmount/remount on every keystroke — which closed the
// datetime-local picker and lost focus/scroll position.

function ThreadPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const chunks = splitForX(text);
  if (chunks.length <= 1) return null;
  const visible = expanded ? chunks : chunks.slice(0, 2);
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2/30 p-3 space-y-2">
      <p className="text-caption text-text-tertiary font-medium">
        Thread preview · {chunks.length} tweets
      </p>
      <div className="space-y-1.5">
        {visible.map((chunk, i) => (
          <div
            key={i}
            className="rounded-md border border-border-subtle bg-surface-0 p-2.5"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {i + 1}/{chunks.length}
              </Badge>
              <span className="text-caption text-text-tertiary">
                {chunk.length}/280
              </span>
            </div>
            <p className="text-small text-text-secondary whitespace-pre-line">
              {chunk}
            </p>
          </div>
        ))}
      </div>
      {chunks.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-caption text-accent hover:text-accent-bright transition-colors"
        >
          {expanded ? "Hide" : `Show ${chunks.length - 2} more`}
        </button>
      )}
    </div>
  );
}

type SocialPostCardProps = {
  post: SocialPost;
  index: number;
  connectedPlatforms: string[];
  publishing: string | null;
  schedulingKey: string | null;
  scheduleDateTime: string;
  postMedia: Record<string, PostMedia>;
  toast: (message: string, variant?: "success" | "error" | "warning" | "info") => void;
  onPublish: (platform: "x" | "linkedin", text: string, publishKey: string) => void;
  onSchedule: (platform: "x" | "linkedin", text: string, publishKey: string) => void;
  onSchedulingKeyChange: (key: string | null) => void;
  onScheduleDateTimeChange: (value: string) => void;
  onPostMediaChange: (publishKey: string, media: PostMedia) => void;
};

function SocialPostCard({
  post,
  index,
  connectedPlatforms,
  publishing,
  schedulingKey,
  scheduleDateTime,
  postMedia,
  toast,
  onPublish,
  onSchedule,
  onSchedulingKeyChange,
  onScheduleDateTimeChange,
  onPostMediaChange,
}: SocialPostCardProps) {
  const isX = post.platform === "x";
  const charLimit = isX ? 280 : 700;
  const charCount = post.text.length;
  const publishKey = `${post.platform}-${index}`;
  const [cardCopied, setCardCopied] = useState(false);
  const isScheduling = schedulingKey === publishKey;

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
          {((isX && connectedPlatforms.includes("x")) ||
            (!isX && connectedPlatforms.includes("linkedin"))) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                onSchedulingKeyChange(isScheduling ? null : publishKey)
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
              onClick={() => onPublish("x", post.text, publishKey)}
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
              onClick={() => onPublish("linkedin", post.text, publishKey)}
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
              onChange={(e) => onScheduleDateTimeChange(e.target.value)}
              className="flex-1 rounded-lg border border-border-strong bg-surface-0 px-3 py-1.5 text-small text-text-primary focus:border-accent focus:outline-none"
            />
            <Button
              size="sm"
              onClick={() => onSchedule(post.platform, post.text, publishKey)}
              disabled={!scheduleDateTime}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onSchedulingKeyChange(null);
                onScheduleDateTimeChange("");
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

      {/* Thread preview — only for X posts that will auto-thread */}
      {isX && charCount > charLimit && <ThreadPreview text={post.text} />}

      {/* Media picker */}
      <MediaPicker
        value={postMedia[publishKey] ?? EMPTY_MEDIA}
        onChange={(m) => onPostMediaChange(publishKey, m)}
        defaultOverlayText={post.hook || post.text.slice(0, 120)}
      />

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-default">
        <Badge
          variant={
            charCount <= charLimit ? "success" : isX ? "secondary" : "error"
          }
        >
          {isX && charCount > charLimit
            ? `Thread · ${charCount} chars`
            : `${charCount}/${charLimit}`}
        </Badge>
        {charCount > charLimit && !isX && (
          <span className="text-small text-error">{charCount - charLimit} over</span>
        )}
        {isX && charCount > charLimit && (
          <span className="text-small text-text-tertiary">
            Auto-splits into a thread
          </span>
        )}
        {post.best_time && (
          <span className="flex items-center gap-1 text-small text-text-tertiary">
            <Clock className="h-3 w-3" />
            {post.best_time}
          </span>
        )}
        {hasMedia(postMedia[publishKey]) && (
          <Badge variant="secondary">With image</Badge>
        )}
      </div>

      {/* Image suggestion */}
      {post.image_suggestion && !hasMedia(postMedia[publishKey]) && (
        <p className="text-small text-text-tertiary italic border-l-2 border-accent/30 pl-3">
          {post.image_suggestion}
        </p>
      )}
    </div>
  );
}

// EmailPreview lives at module scope so React reconciles the same instance
// across parent re-renders. Defined inside ContentPageInner caused state
// (active email tab, copy confirmation) to reset on every parent setState.

type EmailPreviewProps = {
  data: Record<string, unknown> | null;
  projectId: string;
  projectName: string | null | undefined;
  toast: (message: string, variant?: "success" | "error" | "warning" | "info") => void;
};

function EmailPreview({ data, projectId, projectName, toast }: EmailPreviewProps) {
  const [emailCopied, setEmailCopied] = useState(false);
  const [activeEmail, setActiveEmail] = useState(0);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emails = (data?.emails as any[]) ?? [];

  if (emails.length === 0) return null;

  const email = emails[activeEmail];
  const htmlBody = email?.body_html ?? "";

  function copyHtml() {
    navigator.clipboard.writeText(htmlBody);
    setEmailCopied(true);
    toast("HTML copied!", "info");
    setTimeout(() => setEmailCopied(false), 2000);
  }

  return (
    <>
    <SendBroadcastModal
      open={sendModalOpen}
      onClose={() => setSendModalOpen(false)}
      projectId={projectId}
      defaultSubject={email?.subject_line ?? ""}
      htmlBody={htmlBody}
      toast={toast}
    />
    <div className="space-y-3">
      {data?.sequence_name ? (
        <p className="text-small font-medium text-text-primary">{String(data.sequence_name)}</p>
      ) : null}
      {/* Email step tabs */}
      <div className="flex gap-2 flex-wrap">
        {emails.map((_: unknown, i: number) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveEmail(i)}
            className={`px-3 py-1.5 rounded-lg text-small font-medium transition-colors ${
              i === activeEmail
                ? "bg-accent text-on-accent"
                : "bg-surface-2 text-text-secondary hover:bg-surface-3"
            }`}
          >
            Email {i + 1}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border-default bg-surface-0 overflow-hidden">
        <div className="border-b border-border-default px-4 py-3 bg-surface-1 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-small text-text-secondary">
              <span className="font-medium text-text-primary">Subject:</span>
              {email?.subject_line ?? "No subject"}
            </div>
            <div className="flex items-center gap-2 text-small text-text-tertiary">
              <span>From:</span>
              {projectName || "Conduikt"} &lt;hello@conduikt.com&gt;
            </div>
            {email?.goal && (
              <div className="flex items-center gap-2 text-small text-text-tertiary">
                <span>Goal:</span> {email.goal}
              </div>
            )}
            {email?.delay_hours != null && (
              <div className="flex items-center gap-2 text-small text-text-tertiary">
                <Clock className="h-3 w-3" />
                Send after {email.delay_hours}h
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSendModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-0 px-3 py-1.5 text-caption font-medium text-text-primary hover:border-accent hover:bg-accent-muted hover:text-accent transition-colors"
              title="Send this email to an audience"
            >
              <Send className="h-3.5 w-3.5" />
              Send Broadcast
            </button>
            <button
              type="button"
              onClick={copyHtml}
              className="p-2 rounded-lg hover:bg-surface-2 text-text-tertiary hover:text-text-primary transition-colors"
              title="Copy HTML"
            >
              {emailCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="p-1 bg-white">
          <iframe
            srcDoc={htmlBody}
            title="Email preview"
            className="w-full min-h-[400px] border-0 rounded-lg"
            sandbox=""
          />
        </div>
      </div>
      {Array.isArray(data?.exit_conditions) && (data.exit_conditions as string[]).length > 0 && (
        <div className="text-small text-text-tertiary">
          <span className="font-medium text-text-secondary">Exit conditions: </span>
          {(data.exit_conditions as string[]).join(" · ")}
        </div>
      )}
    </div>
    </>
  );
}

// The seven preview components below were previously declared inside
// ContentPageInner. They held no state of their own, so the remount-on-
// every-render cost was invisible (no flickering picker, no scroll jump),
// but the pattern is the same trap that bit SocialPostCard and EmailPreview.
// Hoisted to module scope here for consistency and to make any future
// re-introduction of internal state safe by default.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CopywritingPreview({ data }: { data: Record<string, any> }) {
  const variants = data?.variants ?? [];
  const recommendations = data?.recommendations ?? [];

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
      {variants.map((v: { text: string; rationale?: string; tone?: string }, i: number) => (
        <div
          key={i}
          className="rounded-xl border border-border-default bg-surface-0 p-4 space-y-3 animate-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">Variant {i + 1}</Badge>
            {data?.type && <Badge variant="secondary" className="text-text-tertiary">{data.type}</Badge>}
          </div>
          <p className="text-body text-text-primary font-medium leading-relaxed">
            {v.text}
          </p>
          {v.rationale && (
            <p className="text-small text-text-secondary">
              <span className="font-medium text-text-primary">Why it works: </span>
              {v.rationale}
            </p>
          )}
          {v.tone && (
            <p className="text-small text-text-tertiary">
              <span className="font-medium text-text-secondary">Tone: </span>
              {v.tone}
            </p>
          )}
        </div>
      ))}
      {recommendations.length > 0 && (
        <div className="rounded-xl border border-border-default bg-surface-1 p-4 space-y-2">
          <p className="text-small font-medium text-text-primary">Recommendations</p>
          <ul className="space-y-1.5">
            {recommendations.map((r: string, i: number) => (
              <li key={i} className="text-small text-text-secondary flex gap-2">
                <span className="text-accent shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContentStrategyPreview({ data }: { data: Record<string, any> }) {
  const pillars = data?.pillars ?? [];
  const calendar = data?.content_calendar ?? [];
  const kpis = data?.kpis ?? [];
  const quickWins = data?.quick_wins ?? [];

  return (
    <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
      {data?.strategy_name && (
        <div className="space-y-1">
          <h3 className="text-body font-medium text-text-primary">{data.strategy_name}</h3>
          {data?.time_horizon && (
            <p className="text-small text-text-tertiary">Timeline: {data.time_horizon}</p>
          )}
        </div>
      )}

      {/* Quick wins */}
      {quickWins.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
          <p className="text-small font-medium text-accent">Quick Wins</p>
          <ul className="space-y-1.5">
            {quickWins.map((w: string, i: number) => (
              <li key={i} className="text-small text-text-secondary flex gap-2">
                <span className="text-accent shrink-0">{i + 1}.</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content pillars */}
      {pillars.map((pillar: { topic: string; intent?: string; search_opportunity?: string; content_pieces?: { title: string; format?: string; channel?: string; priority?: string; brief?: string }[] }, pi: number) => (
        <div key={pi} className="rounded-xl border border-border-default bg-surface-0 p-4 space-y-3 animate-in" style={{ animationDelay: `${pi * 60}ms` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body font-medium text-text-primary">{pillar.topic}</span>
            {pillar.intent && <Badge variant="secondary">{pillar.intent}</Badge>}
            {pillar.search_opportunity && (
              <Badge variant="secondary" className="text-text-tertiary">SEO: {pillar.search_opportunity}</Badge>
            )}
          </div>
          {pillar.content_pieces?.map((piece, ci: number) => (
            <div key={ci} className="ml-3 pl-3 border-l border-border-subtle space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-small font-medium text-text-primary">{piece.title}</span>
                {piece.format && <Badge variant="secondary" className="text-[0.65rem]">{piece.format}</Badge>}
                {piece.channel && <Badge variant="secondary" className="text-[0.65rem] text-text-tertiary">{piece.channel}</Badge>}
                {piece.priority && (
                  <Badge variant="secondary" className={`text-[0.65rem] ${piece.priority === "high" ? "text-error" : piece.priority === "medium" ? "text-warning" : "text-text-tertiary"}`}>
                    {piece.priority}
                  </Badge>
                )}
              </div>
              {piece.brief && <p className="text-small text-text-tertiary">{piece.brief}</p>}
            </div>
          ))}
        </div>
      ))}

      {/* Calendar */}
      {calendar.length > 0 && (
        <div className="rounded-xl border border-border-default bg-surface-0 p-4 space-y-3">
          <p className="text-small font-medium text-text-primary">Content Calendar</p>
          {calendar.map((week: { week: number; pieces: string[]; theme?: string }, wi: number) => (
            <div key={wi} className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Week {week.week}</Badge>
                {week.theme && <span className="text-small text-text-tertiary">{week.theme}</span>}
              </div>
              <ul className="ml-4 space-y-0.5">
                {week.pieces.map((p, pi: number) => (
                  <li key={pi} className="text-small text-text-secondary flex gap-2">
                    <span className="text-text-tertiary shrink-0">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="rounded-xl border border-border-default bg-surface-1 p-4 space-y-2">
          <p className="text-small font-medium text-text-primary">KPIs</p>
          <ul className="space-y-1">
            {kpis.map((kpi: string, i: number) => (
              <li key={i} className="text-small text-text-secondary flex gap-2">
                <span className="text-accent shrink-0">•</span>{kpi}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CompetitorAnalysisPreview({ data }: { data: Record<string, any> }) {
  const competitors = data?.competitors ?? [];
  const gaps = data?.positioning_gaps ?? [];
  const contentOpps = data?.content_opportunities ?? [];
  const messagingRecs = data?.messaging_recommendations ?? [];
  const quickWins = data?.quick_wins ?? [];

  return (
    <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
      {data?.analysis_name && (
        <h3 className="text-body font-medium text-text-primary">{data.analysis_name}</h3>
      )}

      {/* Competitors */}
      {competitors.map((c: { name: string; url?: string; positioning?: string; strengths?: string[]; weaknesses?: string[]; messaging_analysis?: string; pricing_model?: string }, i: number) => (
        <div key={i} className="rounded-xl border border-border-default bg-surface-0 p-4 space-y-3 animate-in" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body font-medium text-text-primary">{c.name}</span>
            {c.url && <Badge variant="secondary" className="text-text-tertiary text-[0.65rem]">{c.url}</Badge>}
          </div>
          {c.positioning && <p className="text-small text-text-secondary">{c.positioning}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {c.strengths && c.strengths.length > 0 && (
              <div className="space-y-1">
                <p className="text-small font-medium text-success">Strengths</p>
                <ul className="space-y-1">
                  {c.strengths.map((s: string, si: number) => (
                    <li key={si} className="text-small text-text-secondary flex gap-2">
                      <span className="text-success shrink-0">+</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.weaknesses && c.weaknesses.length > 0 && (
              <div className="space-y-1">
                <p className="text-small font-medium text-error">Weaknesses</p>
                <ul className="space-y-1">
                  {c.weaknesses.map((w: string, wi: number) => (
                    <li key={wi} className="text-small text-text-secondary flex gap-2">
                      <span className="text-error shrink-0">−</span><span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {c.messaging_analysis && (
            <p className="text-small text-text-tertiary">
              <span className="font-medium text-text-secondary">Messaging: </span>{c.messaging_analysis}
            </p>
          )}
        </div>
      ))}

      {/* Positioning gaps */}
      {gaps.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
          <p className="text-small font-medium text-accent">Positioning Gaps</p>
          {gaps.map((g: { gap: string; opportunity: string; impact?: string; effort?: string }, i: number) => (
            <div key={i} className="space-y-1 pb-3 border-b border-border-subtle last:border-0 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-small font-medium text-text-primary">{g.gap}</span>
                {g.impact && <Badge variant="secondary" className={`text-[0.65rem] ${g.impact === "high" ? "text-error" : g.impact === "medium" ? "text-warning" : "text-text-tertiary"}`}>{g.impact} impact</Badge>}
                {g.effort && <Badge variant="secondary" className="text-[0.65rem] text-text-tertiary">{g.effort} effort</Badge>}
              </div>
              <p className="text-small text-text-secondary">{g.opportunity}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content opportunities */}
      {contentOpps.length > 0 && (
        <div className="rounded-xl border border-border-default bg-surface-0 p-4 space-y-3">
          <p className="text-small font-medium text-text-primary">Content Opportunities</p>
          {contentOpps.map((c: { topic: string; rationale: string; suggested_format?: string; priority?: string }, i: number) => (
            <div key={i} className="space-y-1 pb-3 border-b border-border-subtle last:border-0 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-small font-medium text-text-primary">{c.topic}</span>
                {c.priority && <Badge variant="secondary" className={`text-[0.65rem] ${c.priority === "high" ? "text-error" : "text-text-tertiary"}`}>{c.priority}</Badge>}
                {c.suggested_format && <Badge variant="secondary" className="text-[0.65rem] text-text-tertiary">{c.suggested_format}</Badge>}
              </div>
              <p className="text-small text-text-secondary">{c.rationale}</p>
            </div>
          ))}
        </div>
      )}

      {/* Messaging recommendations */}
      {messagingRecs.length > 0 && (
        <div className="rounded-xl border border-border-default bg-surface-1 p-4 space-y-3">
          <p className="text-small font-medium text-text-primary">Messaging Recommendations</p>
          {messagingRecs.map((r: { area: string; current_issue?: string; recommendation: string; example?: string }, i: number) => (
            <div key={i} className="space-y-1 pb-3 border-b border-border-subtle last:border-0 last:pb-0">
              <Badge variant="secondary">{r.area}</Badge>
              {r.current_issue && <p className="text-small text-error">{r.current_issue}</p>}
              <p className="text-small text-text-secondary">{r.recommendation}</p>
              {r.example && <p className="text-small text-accent italic">&ldquo;{r.example}&rdquo;</p>}
            </div>
          ))}
        </div>
      )}

      {/* Quick wins */}
      {quickWins.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
          <p className="text-small font-medium text-accent">Quick Wins</p>
          <ul className="space-y-1.5">
            {quickWins.map((w: string, i: number) => (
              <li key={i} className="text-small text-text-secondary flex gap-2">
                <span className="text-accent shrink-0">{i + 1}.</span><span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BlogPostPreview({ data }: { data: Record<string, any> }) {
  const markdown = data?.content_markdown ?? "";
  const socialPromo = data?.social_promotion;

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
      {/* Meta info */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-4 space-y-2">
        {data?.meta_title && (
          <div>
            <span className="text-small font-medium text-text-tertiary">SEO Title: </span>
            <span className="text-small text-text-primary">{data.meta_title}</span>
          </div>
        )}
        {data?.meta_description && (
          <div>
            <span className="text-small font-medium text-text-tertiary">Meta Description: </span>
            <span className="text-small text-text-secondary">{data.meta_description}</span>
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          {data?.slug && <Badge variant="secondary">/{data.slug}</Badge>}
          {data?.word_count && <Badge variant="secondary">{data.word_count} words</Badge>}
          {data?.reading_time_minutes && <Badge variant="secondary">{data.reading_time_minutes} min read</Badge>}
        </div>
      </div>

      {/* Blog content rendered from markdown */}
      <div className="rounded-xl border border-border-default bg-surface-0 p-6">
        <div className="prose prose-invert max-w-none text-text-primary">
          <div className="whitespace-pre-wrap text-body font-sans leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Social promotion */}
      {socialPromo && (
        <div className="rounded-xl border border-border-default bg-surface-1 p-4 space-y-3">
          <p className="text-small font-medium text-text-primary">Social Promotion</p>
          {socialPromo.x_post && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Twitter className="h-3.5 w-3.5 text-text-primary" />
                <span className="text-small font-medium text-text-secondary">X Post</span>
              </div>
              <p className="text-small text-text-secondary bg-surface-0 rounded-lg p-3">{socialPromo.x_post}</p>
            </div>
          )}
          {socialPromo.linkedin_post && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                <span className="text-small font-medium text-text-secondary">LinkedIn</span>
              </div>
              <p className="text-small text-text-secondary bg-surface-0 rounded-lg p-3 whitespace-pre-line">{socialPromo.linkedin_post}</p>
            </div>
          )}
          {socialPromo.email_subject && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-text-tertiary" />
                <span className="text-small font-medium text-text-secondary">Email Subject</span>
              </div>
              <p className="text-small text-text-secondary bg-surface-0 rounded-lg p-3">{socialPromo.email_subject}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CroReportPreview({ data }: { data: Record<string, any> }) {
  const findings = data?.findings ?? [];
  const quickWins = data?.quick_wins ?? [];
  const severityColor: Record<string, string> = { critical: "text-error", warning: "text-warning", info: "text-info" };

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
      {data?.score != null && (
        <div className="flex items-center gap-4">
          <div className={`text-h1 font-bold font-mono ${data.score >= 70 ? "text-success" : data.score >= 40 ? "text-warning" : "text-error"}`}>
            {data.score}
          </div>
          <div>
            <p className="text-body font-medium text-text-primary">CRO Score</p>
            <p className="text-small text-text-tertiary">out of 100</p>
          </div>
        </div>
      )}
      {data?.summary && <p className="text-small text-text-secondary">{data.summary}</p>}

      {findings.map((f: { severity: string; category?: string; title: string; detail?: string; recommendation?: string; impact?: string }, i: number) => (
        <div key={i} className="rounded-xl border border-border-default bg-surface-0 p-4 space-y-2 animate-in" style={{ animationDelay: `${i * 40}ms` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-small font-bold uppercase ${severityColor[f.severity] ?? "text-text-tertiary"}`}>{f.severity}</span>
            {f.category && <Badge variant="secondary">{f.category}</Badge>}
            {f.impact && <Badge variant="secondary" className="text-text-tertiary">{f.impact} impact</Badge>}
          </div>
          <p className="text-small font-medium text-text-primary">{f.title}</p>
          {f.detail && <p className="text-small text-text-secondary">{f.detail}</p>}
          {f.recommendation && (
            <p className="text-small text-accent">
              <span className="font-medium">Fix: </span>{f.recommendation}
            </p>
          )}
        </div>
      ))}

      {quickWins.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
          <p className="text-small font-medium text-accent">Quick Wins</p>
          <ul className="space-y-1.5">
            {quickWins.map((w: string, i: number) => (
              <li key={i} className="text-small text-text-secondary flex gap-2">
                <span className="text-accent shrink-0">{i + 1}.</span><span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GeneratingIndicator({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-0 p-8 flex flex-col items-center text-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
      <p className="text-body text-text-primary font-medium">{label}</p>
      <p className="text-small text-text-tertiary mt-2">
        We&apos;ll format the result as soon as it&apos;s ready.
      </p>
    </div>
  );
}

// Renders below the per-email preview cards. Two actions, framed by a
// cadence summary so the user sees what they're committing to BEFORE
// they click. "Save & Schedule Drip" hands off to the /emails page with
// ?enroll=<seqId> so the audience picker auto-opens.
//
// Free users get an "upgrade to schedule" gate (matches the existing
// asset-save gate); the user can still preview + copy locally.
function SequenceScheduleAction({
  parsedContent,
  userPlan,
  scheduling,
  onSchedule,
}: {
  parsedContent: Record<string, unknown>;
  userPlan: string;
  scheduling: boolean;
  onSchedule: () => void;
}) {
  const emails = Array.isArray(parsedContent?.emails)
    ? (parsedContent.emails as Array<Record<string, unknown>>)
    : [];
  if (emails.length === 0) return null;

  // Cadence summary — shows each step's *cumulative* offset from
  // enrollment so users see the actual calendar of sends. delay_hours is
  // the gap from the previous step (matches what the runner does).
  let cumulativeHours = 0;
  const summaryParts: string[] = emails.map((e, i) => {
    const delay = Math.max(0, Number(e.delay_hours ?? 0));
    cumulativeHours += delay;
    if (i === 0) return "now";
    if (cumulativeHours < 24) return `+${cumulativeHours}h`;
    const days = Math.round((cumulativeHours / 24) * 10) / 10;
    return `+${days}d`;
  });
  const totalDays =
    cumulativeHours < 24
      ? `${cumulativeHours}h`
      : `${Math.round(cumulativeHours / 24)}d`;

  return (
    <div className="rounded-xl border border-border-default bg-surface-0 p-5 space-y-4">
      <div>
        <p className="text-small font-medium text-text-primary mb-1.5">
          {emails.length} email{emails.length === 1 ? "" : "s"} over ~{totalDays}
        </p>
        <p className="text-caption text-text-tertiary font-mono break-words">
          {summaryParts.join(" → ")}
        </p>
      </div>
      <div className="rounded-lg bg-surface-2 px-4 py-3 text-caption text-text-secondary leading-relaxed">
        <span className="text-text-primary font-medium">
          Save &amp; Schedule Drip
        </span>{" "}
        promotes this into a real sequence and asks you to pick an audience.
        Once you confirm, the runner sends each email on its delay
        automatically. Pick{" "}
        <span className="text-text-primary font-medium">Save Draft</span> if
        you want to edit before going live — nothing fires until you enrol an
        audience.
      </div>
      {userPlan === "free" ? (
        <Link href="/settings/billing" className="block">
          <Button size="sm" className="w-full" variant="secondary">
            <Lock className="h-4 w-4 mr-1.5" />
            Upgrade to schedule the drip
          </Button>
        </Link>
      ) : (
        <Button
          size="sm"
          className="w-full"
          onClick={onSchedule}
          disabled={scheduling}
        >
          {scheduling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              Saving sequence...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1.5" />
              Save &amp; Schedule Drip
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function ParseFailureNotice({
  text,
  truncationMessage,
}: {
  text: string;
  truncationMessage?: string | null;
}) {
  // Distinct surface for "ran out of token budget mid-stream" — the
  // partial JSON below isn't a parse bug, the AI literally stopped
  // mid-thought. Tell the user that directly so they don't burn another
  // generation thinking the parser is broken.
  if (truncationMessage) {
    return (
      <div className="rounded-xl border border-warning/30 bg-surface-0 p-4 space-y-2">
        <p className="text-small text-text-primary font-medium">
          The AI ran out of space before it could finish.
        </p>
        <p className="text-caption text-text-tertiary">
          {truncationMessage} Your generation count was still used for this
          attempt — sorry about that. Click Regenerate to retry; we&apos;ve
          adjusted the limits so this should be rare.
        </p>
        <details className="text-small">
          <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
            Show partial output
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-caption text-text-secondary font-mono break-words max-h-[320px] overflow-y-auto">
            {text}
          </pre>
        </details>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-warning/30 bg-surface-0 p-4 space-y-2">
      <p className="text-small text-text-primary font-medium">
        We got a response but couldn&apos;t format it. You can regenerate below.
      </p>
      <details className="text-small">
        <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
          Show raw output
        </summary>
        <pre className="mt-2 whitespace-pre-wrap text-caption text-text-secondary font-mono break-words max-h-[320px] overflow-y-auto">
          {text}
        </pre>
      </details>
    </div>
  );
}

// ---------- component ----------

function ContentPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const { showLimitModal } = useUsageLimitModal();
  const searchParams = useSearchParams();
  const outputRef = useRef<HTMLDivElement>(null);

  // Project context
  const [project, setProject] = useState<ProjectContext | null>(null);

  // Generation state — seed from URL params if present
  // Guard: only accept skill IDs that exist in contentSkills (e.g. ?skill=growth-playbook would crash)
  const [selectedSkill, setSelectedSkill] = useState(() => {
    const param = searchParams.get("skill");
    return param && contentSkills.some((s) => s.id === param) ? param : "copywriting";
  });
  const [prompt, setPrompt] = useState(() => searchParams.get("prompt") ?? "");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");

  // Fetch user plan for save gating
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => setUserPlan(p?.plan ?? "free"))
      .catch(() => {});
  }, []);

  // Assets list
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Social posts parsed state
  const [parsedPosts, setParsedPosts] = useState<SocialPost[] | null>(null);

  // Parsed structured content for other skills
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parsedContent, setParsedContent] = useState<Record<string, any> | null>(null);
  // Set when the stream emits a `generation_truncated` error event so we
  // can surface a clearer notice ("ran out of space") instead of the
  // generic "couldn't format it" parse-failure UI.
  const [truncationNotice, setTruncationNotice] = useState<string | null>(null);

  // Publish state
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null); // "x-0", "linkedin-2", etc.
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);

  // Schedule state — tracks which post card has the picker open: "x-0", "linkedin-1", etc.
  const [schedulingKey, setSchedulingKey] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  // Media per post card, keyed by publishKey ("x-0", "linkedin-1", ...)
  const [postMedia, setPostMedia] = useState<Record<string, PostMedia>>({});

  const skill = contentSkills.find((s) => s.id === selectedSkill) ?? contentSkills[0];

  // ---------- data fetching ----------

  useEffect(() => {
    fetchProject();
    fetchAssets();
    fetchConnectedAccounts();
  }, [projectId]);

  // Load a saved asset from ?assetId= param
  useEffect(() => {
    const assetId = searchParams.get("assetId");
    if (!assetId) return;
    fetch(`/api/projects/${projectId}/assets/${assetId}`)
      .then((r) => r.json())
      .then((asset) => {
        const content = asset?.content as Record<string, unknown> | undefined;
        const raw = typeof content?.raw === "string" ? content.raw : "";
        const assetSkill = typeof content?.skill === "string" ? content.skill : "copywriting";
        const safeSkill = contentSkills.some((s) => s.id === assetSkill) ? assetSkill : "copywriting";
        setResult(raw);
        setSelectedSkill(safeSkill);
        setPrompt(typeof content?.prompt === "string" ? content.prompt : "");
        setSavedAssetId(assetId);
        if (assetSkill === "social-content" && raw) {
          try {
            const parsed = parseJsonResponse(raw) as { posts?: unknown };
            if (Array.isArray(parsed?.posts)) setParsedPosts(parsed.posts);
          } catch { /* not JSON */ }
        }
        if (jsonSkills.includes(assetSkill) && raw) {
          setParsedContent(extractJson(raw));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const media = postMedia[publishKey];

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
          content: { raw: result, skill: selectedSkill, prompt, media },
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
      body: JSON.stringify({ text: postText, assetId, media }),
    });

    const data = await res.json();
    if (res.ok) {
      if (platform === "x" && data.partialFailure) {
        toast(
          `Posted ${data.posted}/${data.intended} tweets, then X failed: ${data.partialFailure.error}`,
          "warning"
        );
      } else if (platform === "x" && (data.posted ?? 1) > 1) {
        toast(`Thread of ${data.posted} tweets posted to X!`, "success");
      } else {
        toast(
          platform === "x"
            ? `Posted to X!${data.tweetUrl ? ` View it →` : ""}`
            : "Posted to LinkedIn!",
          "success"
        );
      }
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

    const media = postMedia[publishKey];

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
          content: { raw: result, skill: selectedSkill, prompt, media },
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
        media,
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
    setParsedContent(null);
    setTruncationNotice(null);

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
        if (res.status === 429) {
          showLimitModal();
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
            setResult(fullText);
          } else if (data.type === "done") {
            setUsage(data.usage);
          } else if (data.type === "error") {
            if (data.code === "generation_truncated") {
              // Distinct UX path: don't toast a generic error; show the
              // dedicated truncation notice so the user understands the
              // partial output below isn't a parser bug.
              setTruncationNotice(
                data.error ||
                  "The AI ran out of space before finishing. Try again, or shorten your prompt."
              );
            } else {
              toast(data.error, "error");
            }
          }
        }
      }

      // Parse JSON for social posts after streaming completes
      if (selectedSkill === "social-content" && fullText) {
        try {
          const parsed = parseJsonResponse(fullText) as { posts?: unknown };
          if (Array.isArray(parsed?.posts)) setParsedPosts(parsed.posts);
        } catch (parseErr) {
          console.warn("[social-content] parse failed:", parseErr, "raw head:", fullText.slice(0, 300));
          // Not valid JSON — leave parsedPosts null, raw text will display
        }
      }

      // Parse JSON for structured skills after streaming completes
      if (jsonSkills.includes(selectedSkill) && fullText) {
        const parsed = extractJson(fullText);
        setParsedContent(parsed);
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

  // ---------- save email-sequence as a real drip ----------
  // Promotes the AI's parsedContent into email_sequences +
  // email_sequence_steps + per-step assets, then sends the user to the
  // /emails page with ?enroll=<seqId> so the audience picker auto-opens.
  // From there, picking an audience kicks off the drip via the existing
  // enroll endpoint + scheduler.
  const [scheduling, setScheduling] = useState(false);

  async function handleScheduleDrip() {
    if (!parsedContent || scheduling) return;
    const emails = Array.isArray(parsedContent?.emails)
      ? parsedContent.emails
      : null;
    if (!emails || emails.length === 0) {
      toast("Couldn't read the generated emails — try regenerating", "error");
      return;
    }
    setScheduling(true);
    const res = await fetch(`/api/projects/${projectId}/email-sequences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sequence_name:
          (parsedContent.sequence_name as string | undefined) ||
          prompt.slice(0, 80) ||
          "Untitled sequence",
        type: (parsedContent.type as string | undefined) || "welcome",
        trigger: (parsedContent.trigger as string | undefined) || null,
        emails,
      }),
    });
    setScheduling(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Couldn't save sequence", "error");
      return;
    }
    const data = await res.json();
    // Hand off to the /emails page; the picker auto-opens via ?enroll=
    // and once the user selects an audience the drip starts.
    window.location.href = `/projects/${projectId}/emails?enroll=${data.id}`;
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

  // ---------- render ----------

  return (
    <div>
      <PageHeader
        title={skill.name}
        description={
          project
            ? `${skill.description} — ${project.name}`
            : skill.description
        }
      />

      <ExpectationBanner
        storageKey="conduikt-expect-content"
        message="Great content builds momentum over time. A single post won't move the needle — but consistent, strategic output compounds into real traffic and conversions within weeks."
        details={[
          "SEO-focused blog posts typically take 4-12 weeks to rank and drive organic traffic.",
          "Social content works best as a steady cadence — 3-5 posts per week builds audience trust.",
          "Email sequences convert better after 2-3 touchpoints. One email rarely closes the deal.",
        ]}
      />

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
                {(() => {
                  const ta = project.target_audience as { personas?: string[]; pain_points?: string[] } | null;
                  if (ta && typeof ta === "object") {
                    const parts: string[] = [];
                    if (Array.isArray(ta.personas) && ta.personas.length > 0) {
                      parts.push(ta.personas.join(", "));
                    }
                    if (Array.isArray(ta.pain_points) && ta.pain_points.length > 0) {
                      parts.push(`Pain points: ${ta.pain_points.join(", ")}`);
                    }
                    return parts.length > 0 ? parts.join(" · ") : "Not specified";
                  }
                  return String(project.target_audience);
                })()}
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
              <div className="mb-4">
                <select
                  value={selectedSkill}
                  onChange={(e) => { setSelectedSkill(e.target.value); setResult(""); setParsedPosts(null); setParsedContent(null); }}
                  className="w-full rounded-lg border border-border-strong bg-surface-0 px-4 py-2.5 text-text-primary text-small font-medium transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] appearance-none cursor-pointer"
                >
                  {contentSkills.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.description}</option>
                  ))}
                </select>
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
                    const hasRaw = typeof asset.content?.raw === "string" && asset.content.raw.length > 0;
                    const itemClass = "w-full text-left rounded-lg border border-border-default p-3 hover:bg-surface-2 transition-colors block";

                    const itemContent = (
                      <>
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
                      </>
                    );

                    if (!hasRaw) {
                      return (
                        <Link
                          key={asset.id}
                          href={`/projects/${projectId}/assets/${asset.id}`}
                          className={itemClass}
                        >
                          {itemContent}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={asset.id}
                        onClick={() => {
                          const raw = asset.content?.raw ?? "";
                          const assetSkill = asset.content?.skill ?? "copywriting";
                          const safeSkill = contentSkills.some((s) => s.id === assetSkill) ? assetSkill : "copywriting";
                          setResult(raw);
                          setSelectedSkill(safeSkill);
                          setPrompt(asset.content?.prompt ?? "");
                          setUsage(null);
                          setSavedAssetId(asset.id);
                          setParsedPosts(null);
                          setParsedContent(null);
                          if (assetSkill === "social-content" && raw) {
                            try {
                              const parsed = parseJsonResponse(raw) as { posts?: unknown };
                              if (Array.isArray(parsed?.posts)) setParsedPosts(parsed.posts);
                            } catch { /* not JSON */ }
                          }
                          if (jsonSkills.includes(assetSkill) && raw) {
                            setParsedContent(extractJson(raw));
                          }
                        }}
                        className={itemClass}
                      >
                        {itemContent}
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
                    {userPlan === "free" ? (
                      <Link href="/settings/billing">
                        <Button size="sm" variant="secondary">
                          <Lock className="h-4 w-4" />
                          Upgrade to Save
                        </Button>
                      </Link>
                    ) : (
                      <>
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
                        {savedAssetId && (
                          <PdfDownloadButton
                            href={`/api/projects/${projectId}/assets/${savedAssetId}/pdf`}
                            filename="content-export.pdf"
                          />
                        )}
                      </>
                    )}
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
                  {/* Skill-specific formatted previews — no raw JSON exposure */}
                  {selectedSkill === "social-content" ? (
                    generating && !parsedPosts ? (
                      <div ref={outputRef}>
                        <GeneratingIndicator label="Writing your social posts..." />
                      </div>
                    ) : parsedPosts ? (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {parsedPosts.map((post, i) => (
                          <SocialPostCard
                            key={i}
                            post={post}
                            index={i}
                            connectedPlatforms={connectedPlatforms}
                            publishing={publishing}
                            schedulingKey={schedulingKey}
                            scheduleDateTime={scheduleDateTime}
                            postMedia={postMedia}
                            toast={toast}
                            onPublish={handlePublish}
                            onSchedule={handleSchedule}
                            onSchedulingKeyChange={setSchedulingKey}
                            onScheduleDateTimeChange={setScheduleDateTime}
                            onPostMediaChange={(key, m) =>
                              setPostMedia((prev) => ({ ...prev, [key]: m }))
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <div ref={outputRef}>
                        <ParseFailureNotice text={result} truncationMessage={truncationNotice} />
                      </div>
                    )
                  ) : selectedSkill === "email-sequence" ? (
                    generating && !parsedContent ? (
                      <div ref={outputRef}>
                        <GeneratingIndicator label="Drafting your email sequence..." />
                      </div>
                    ) : parsedContent ? (
                      <div className="space-y-4">
                        <EmailPreview
                          data={parsedContent}
                          projectId={projectId}
                          projectName={project?.name}
                          toast={toast}
                        />
                        <SequenceScheduleAction
                          parsedContent={parsedContent}
                          userPlan={userPlan}
                          scheduling={scheduling}
                          onSchedule={handleScheduleDrip}
                        />
                      </div>
                    ) : (
                      <div ref={outputRef}>
                        <ParseFailureNotice text={result} truncationMessage={truncationNotice} />
                      </div>
                    )
                  ) : selectedSkill === "copywriting" ? (
                    generating && !parsedContent ? (
                      <div ref={outputRef}>
                        <GeneratingIndicator label="Writing copy variants..." />
                      </div>
                    ) : parsedContent ? (
                      <CopywritingPreview data={parsedContent} />
                    ) : (
                      <div ref={outputRef}>
                        <ParseFailureNotice text={result} truncationMessage={truncationNotice} />
                      </div>
                    )
                  ) : selectedSkill === "content-strategy" ? (
                    generating && !parsedContent ? (
                      <div ref={outputRef}>
                        <GeneratingIndicator label="Building your content strategy..." />
                      </div>
                    ) : parsedContent ? (
                      <ContentStrategyPreview data={parsedContent} />
                    ) : (
                      <div ref={outputRef}>
                        <ParseFailureNotice text={result} truncationMessage={truncationNotice} />
                      </div>
                    )
                  ) : selectedSkill === "competitor-analysis" ? (
                    generating && !parsedContent ? (
                      <div ref={outputRef}>
                        <GeneratingIndicator label="Analysing competitors..." />
                      </div>
                    ) : parsedContent ? (
                      <CompetitorAnalysisPreview data={parsedContent} />
                    ) : (
                      <div ref={outputRef}>
                        <ParseFailureNotice text={result} truncationMessage={truncationNotice} />
                      </div>
                    )
                  ) : selectedSkill === "blog-post" ? (
                    generating && !parsedContent ? (
                      <div ref={outputRef}>
                        <GeneratingIndicator label="Writing your blog post..." />
                      </div>
                    ) : parsedContent ? (
                      <BlogPostPreview data={parsedContent} />
                    ) : (
                      <div ref={outputRef}>
                        <ParseFailureNotice text={result} truncationMessage={truncationNotice} />
                      </div>
                    )
                  ) : selectedSkill === "page-cro" ? (
                    generating && !parsedContent ? (
                      <div ref={outputRef}>
                        <GeneratingIndicator label="Auditing the page..." />
                      </div>
                    ) : parsedContent ? (
                      <CroReportPreview data={parsedContent} />
                    ) : (
                      <div ref={outputRef}>
                        <ParseFailureNotice text={result} truncationMessage={truncationNotice} />
                      </div>
                    )
                  ) : generating ? (
                    <div ref={outputRef}>
                      <GeneratingIndicator label="Generating..." />
                    </div>
                  ) : (
                    <div
                      ref={outputRef}
                      className="rounded-xl border border-border-default bg-surface-0 p-6 max-h-[500px] overflow-y-auto"
                    >
                      <p className="whitespace-pre-wrap text-body text-text-primary">
                        {result}
                      </p>
                    </div>
                  )}

                  {/* Streaming cursor */}
                  {generating && (
                    <div className="flex items-center gap-2 text-small text-accent">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating...
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
