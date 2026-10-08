"use client";

import { use, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  Globe,
  Mail,
  FileText,
  Twitter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Zap,
  Send,
} from "@/src/components/ui/lucide-icons";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";
import { buildPlaybookActionHref } from "@/src/lib/playbook-action-route";

// ── types ────────────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  type: string;
  channel: string | null;
  title: string | null;
  content: Record<string, unknown>;
  status: string;
  created_at: string;
}

// Growth playbook types
interface PlaybookAction {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium";
  effort: string;
  impact: string;
  description: string;
  conduikt_tool?: string;
  conduikt_route?: string;
  success_metric?: string;
}
interface PlaybookPhase {
  phase: number;
  name: string;
  timeline: string;
  theme: string;
  actions: PlaybookAction[];
  phase_kpi: string;
}
interface GrowthPlaybook {
  title?: string;
  executive_summary?: string;
  phases?: PlaybookPhase[];
  week_1_checklist?: string[];
}

// Blog post type
interface BlogPost {
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  content_markdown?: string;
  word_count?: number;
  reading_time_minutes?: number;
  social_promotion?: { x_post?: string; linkedin_post?: string; email_subject?: string };
}

// ── helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  growth_playbook: "Growth Plan",
  launch_plan: "Launch plan",
  blog_post: "Blog post",
  copy_block: "Page copy",
  email: "Email series",
  social_post: "Social posts",
  landing_page: "Landing page",
  headline: "Headlines",
  cta: "Button text",
  ad_copy: "Ad copy",
  meta_tags: "Search snippet",
  schema_markup: "Ready for Google",
  audit_report: "Site check report",
  seo_page: "Landing page",
};

const OPEN_IN: Record<string, { label: string; path: (projectId: string, assetId: string) => string }> = {
  growth_playbook: { label: "Open in Growth Plan", path: (p, a) => `/projects/${p}/growth?assetId=${a}` },
  launch_plan: { label: "Open in Launch Plan", path: (p, a) => `/projects/${p}/launch-strategy?assetId=${a}` },
  blog_post: { label: "Open in Blog", path: (p, a) => `/projects/${p}/blog?assetId=${a}` },
  copy_block: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  email: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  social_post: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  content_strategy: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  headline: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  cta: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  ad_copy: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
};

function priorityBadgeVariant(p: string): "error" | "warning" | "secondary" {
  if (p === "critical") return "error";
  if (p === "high") return "warning";
  return "secondary";
}

// ── views ─────────────────────────────────────────────────────────────────────

function GrowthPlaybookView({ data, projectId, assetId }: { data: GrowthPlaybook; projectId: string; assetId: string }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const phases = data.phases ?? [];
  const totalActions = phases.reduce((n, p) => n + (p.actions?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      {data.executive_summary && (
        <Card>
          <p className="mb-3 text-label text-text-3">Summary</p>
          <p className="text-body text-text-2">{data.executive_summary}</p>
        </Card>
      )}

      {totalActions > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal transition-all duration-500"
              style={{ width: `${(checked.size / totalActions) * 100}%` }}
            />
          </div>
          <span className="text-body-s text-text-3 whitespace-nowrap">
            {checked.size} of {totalActions} done
          </span>
        </div>
      )}

      {phases.map((phase) => {
        const isExpanded = expandedPhase === phase.phase;
        const phaseActions = phase.actions ?? [];
        const phaseChecked = phaseActions.filter((a) => checked.has(a.id)).length;
        return (
          <Card key={phase.phase}>
            <button
              className="w-full text-left"
              onClick={() => setExpandedPhase(isExpanded ? null : phase.phase)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-label text-text-3">
                      Phase {phase.phase} · {phase.timeline}
                    </p>
                    <CardTitle className="text-text">{phase.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={phaseChecked === phaseActions.length && phaseActions.length > 0 ? "success" : "secondary"}>
                      {phaseChecked} of {phaseActions.length}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-text-3" /> : <ChevronDown className="h-4 w-4 text-text-3" />}
                  </div>
                </div>
                <p className="text-body-s text-text-2 mt-1">{phase.theme}</p>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="space-y-3">
                {phaseActions.map((action) => (
                  <div
                    key={action.id}
                    className={`rounded-md border p-4 transition-colors ${checked.has(action.id) ? "border-line bg-teal-soft" : "border-line bg-surface"}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCheck(action.id)}
                        aria-label={checked.has(action.id) ? "Mark as not done" : "Mark as done"}
                        aria-pressed={checked.has(action.id)}
                        className="mt-0.5 shrink-0 text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-teal"
                      >
                        {checked.has(action.id) ? <CheckSquare className="h-4 w-4 text-teal" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`mb-1 text-title ${checked.has(action.id) ? "line-through text-text-3" : "text-text"}`}>
                          {action.title}
                        </p>
                        <p className="text-body-s text-text-2 mb-2">{action.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={priorityBadgeVariant(action.priority)}>
                            {action.priority}
                          </Badge>
                          <span className="text-caption text-text-3">Effort: {action.effort}</span>
                          <span className="text-caption text-text-3">Impact: {action.impact}</span>
                          {action.conduikt_tool && (
                            <Link
                              href={buildPlaybookActionHref(projectId, action)}
                              className="hover-link flex items-center gap-1 text-caption text-accent hover:text-accent-hover"
                            >
                              <Zap className="h-3 w-3" /> {action.conduikt_tool}
                            </Link>
                          )}
                        </div>
                        {action.success_metric && (
                          <p className="mt-2 border-l border-line pl-2 text-caption text-text-3">
                            {action.success_metric}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {phase.phase_kpi && (
                  <div className="rounded-md bg-surface-2 px-4 py-3 mt-2">
                    <p className="mb-1 text-label text-text-3">How you&apos;ll know it worked</p>
                    <p className="text-body-s text-text-2">{phase.phase_kpi}</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function BlogPostView({ data }: { data: BlogPost }) {
  return (
    <div className="space-y-6">
      {data.content_markdown && (
        <Card>
          <CardHeader><CardTitle>Article</CardTitle></CardHeader>
          <CardContent>
            <div className="prose-conduikt">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content_markdown}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>How it shows on Google</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-line bg-ground p-4">
            <p className="mb-2 text-label text-text-3">Search result preview</p>
            <p className="text-title text-accent-hover">{data.meta_title}</p>
            {data.slug && <p className="font-mono text-body-s text-teal">conduikt.com/{data.slug}</p>}
            <p className="text-body-s text-text-2 mt-1">{data.meta_description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-s text-text-2">
            {data.word_count && <span>Words: <strong className="text-text">{data.word_count.toLocaleString()}</strong></span>}
            {data.reading_time_minutes && <span>Read time: <strong className="text-text">{data.reading_time_minutes} min</strong></span>}
            {data.slug && <span>Slug: <strong className="text-text font-mono">/{data.slug}</strong></span>}
          </div>
        </CardContent>
      </Card>

      {data.social_promotion && (
        <Card>
          <CardHeader><CardTitle>Posts to share it</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.social_promotion.x_post && (
              <div className="rounded-md border border-line p-3">
                <p className="mb-2 flex items-center gap-1 text-label text-text-3"><Twitter className="h-3 w-3" /> X</p>
                <p className="text-body-s text-text-2">{data.social_promotion.x_post}</p>
              </div>
            )}
            {data.social_promotion.linkedin_post && (
              <div className="rounded-md border border-line p-3">
                <p className="mb-2 text-label text-text-3">LinkedIn</p>
                <p className="text-body-s text-text-2">{data.social_promotion.linkedin_post}</p>
              </div>
            )}
            {data.social_promotion.email_subject && (
              <div className="rounded-md border border-line p-3">
                <p className="mb-2 flex items-center gap-1 text-label text-text-3"><Mail className="h-3 w-3" /> Email subject</p>
                <p className="text-body-s text-text-2">{data.social_promotion.email_subject}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GenericAssetView({ content }: { content: Record<string, unknown> }) {
  const plain =
    typeof content.raw === "string"
      ? content.raw
      : typeof content.text === "string"
        ? content.text
        : typeof content.markdown === "string"
          ? content.markdown
          : null;

  if (plain) {
    return (
      <Card>
        <p className="whitespace-pre-wrap break-words text-body text-text">
          {plain}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <p className="mb-1 text-label text-text-3">
              {key.replace(/_/g, " ")}
            </p>
            {Array.isArray(value) ? (
              <ul className="space-y-1">
                {value.map((item, i) => (
                  <li
                    key={i}
                    className="text-body-s text-text-2 pl-3 border-l-2 border-line"
                  >
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : typeof value === "object" && value !== null ? (
              <div className="pl-3 border-l-2 border-line space-y-1">
                {Object.entries(value as Record<string, unknown>).map(
                  ([k, v]) => (
                    <p key={k} className="text-body-s text-text-2">
                      <span className="text-text-3">{k}:</span>{" "}
                      {typeof v === "string" ? v : JSON.stringify(v)}
                    </p>
                  )
                )}
              </div>
            ) : (
              <p className="text-body text-text whitespace-pre-wrap">
                {String(value ?? "")}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function AssetViewPage({
  params,
}: {
  params: Promise<{ id: string; assetId: string }>;
}) {
  const { id: projectId, assetId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [navigating, startNavigation] = useTransition();
  // Tracks the in-flight POST to /api/blog-posts/publish so the button
  // shows a spinner and disables itself. Successful publishes also
  // bump asset.status to "published" optimistically so the badge
  // updates without a re-fetch.
  const [publishing, setPublishing] = useState(false);

  async function handlePublishBlog() {
    if (!asset) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/blog-posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(body.error || "Couldn't publish. Try again.", "error");
        return;
      }
      toast(`Live at conduikt.com/blog/${body.slug}/`, "success");
      // Optimistic status flip + open the live URL in a new tab so the
      // user can verify immediately.
      setAsset({ ...asset, status: "published" });
      window.open(body.url, "_blank", "noopener,noreferrer");
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    fetch(`/api/projects/${projectId}/assets/${assetId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setAsset)
      .catch(() => {
        toast("We couldn't find that item", "error");
        router.push(`/projects/${projectId}/library`);
      })
      .finally(() => setLoading(false));
  }, [projectId, assetId]);

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!asset) return null;

  const typeLabel = TYPE_LABELS[asset.type] ?? asset.type.replace(/_/g, " ");
  const openIn = OPEN_IN[asset.type];
  const TypeIcon =
    asset.type === "growth_playbook" ? TrendingUp :
    asset.type === "blog_post" ? Globe :
    asset.type === "email" ? Mail :
    asset.type === "social_post" ? Twitter :
    FileText;

  // Render the appropriate view
  let contentView: React.ReactNode;
  if (asset.type === "growth_playbook") {
    const data = (asset.content?.parsed ?? asset.content) as GrowthPlaybook;
    contentView = <GrowthPlaybookView data={data} projectId={projectId} assetId={assetId} />;
  } else if (asset.type === "blog_post") {
    const data = (asset.content?.parsed ?? asset.content) as BlogPost;
    contentView = <BlogPostView data={data} />;
  } else {
    contentView = <GenericAssetView content={asset.content} />;
  }

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/library`}
          className="hover-link mb-4 inline-flex items-center gap-1.5 text-body-s text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to everything we made
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <TypeIcon className="mt-2 h-5 w-5 shrink-0 text-text-3" />
            <div>
              <h1 className="text-display-s text-text">{asset.title || "Untitled"}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{typeLabel}</Badge>
                <Badge variant={asset.status === "published" ? "success" : asset.status === "archived" ? "secondary" : "warning"}>
                  {asset.status}
                </Badge>
                <span className="text-caption text-text-3">
                  {new Date(asset.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {asset.type === "blog_post" && (
              <Button
                size="sm"
                onClick={handlePublishBlog}
                disabled={publishing}
              >
                {!publishing && <Send className="h-3.5 w-3.5" />}
                {publishing
                  ? "Publishing…"
                  : asset.status === "published"
                    ? "Publish again"
                    : "Publish to blog"}
              </Button>
            )}
            {openIn && (
              <Button
                variant="outline"
                size="sm"
                disabled={navigating}
                onClick={() => startNavigation(() => router.push(openIn.path(projectId, assetId)))}
              >
                {!navigating && <ExternalLink className="h-3.5 w-3.5" />}
                {navigating ? "Opening…" : openIn.label}
              </Button>
            )}
            <PdfDownloadButton
              href={`/api/projects/${projectId}/assets/${assetId}/pdf`}
              filename={`${asset.title ?? "asset"}.pdf`}
            />
          </div>
        </div>
      </div>

      {contentView}
    </div>
  );
}
