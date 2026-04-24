"use client";

import { use, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
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
} from "lucide-react";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
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
  growth_playbook: "Growth Playbook",
  blog_post: "Blog Post",
  copy_block: "Copy Block",
  email: "Email Sequence",
  social_post: "Social Posts",
  landing_page: "Landing Page",
  headline: "Headlines",
  cta: "CTA",
  ad_copy: "Ad Copy",
  meta_tags: "Meta Tags",
  schema_markup: "Schema Markup",
  audit_report: "Audit Report",
  seo_page: "SEO Page",
};

const OPEN_IN: Record<string, { label: string; path: (projectId: string, assetId: string) => string }> = {
  growth_playbook: { label: "Open in Growth Planner", path: (p, a) => `/projects/${p}/growth?assetId=${a}` },
  blog_post: { label: "Open in Blog Generator", path: (p, a) => `/projects/${p}/blog?assetId=${a}` },
  copy_block: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  email: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  social_post: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  content_strategy: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  headline: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  cta: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
  ad_copy: { label: "Open in Content Studio", path: (p, a) => `/projects/${p}/content?assetId=${a}` },
};

function priorityBadgeClass(p: string) {
  if (p === "critical") return "bg-error/10 text-error border-error/20";
  if (p === "high") return "bg-warning/10 text-warning border-warning/20";
  return "bg-accent/10 text-accent border-accent/20";
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
          <CardContent className="py-5">
            <p className="text-small font-medium text-text-tertiary uppercase tracking-wider mb-3">Executive Summary</p>
            <p className="text-body text-text-secondary leading-relaxed">{data.executive_summary}</p>
          </CardContent>
        </Card>
      )}

      {totalActions > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${(checked.size / totalActions) * 100}%` }}
            />
          </div>
          <span className="text-small text-text-tertiary whitespace-nowrap">
            {checked.size}/{totalActions} actions
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
                    <p className="text-caption text-accent uppercase tracking-wider mb-1">
                      Phase {phase.phase} · {phase.timeline}
                    </p>
                    <CardTitle className="text-text-primary">{phase.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{phaseChecked}/{phaseActions.length}</Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-text-tertiary" /> : <ChevronDown className="h-4 w-4 text-text-tertiary" />}
                  </div>
                </div>
                <p className="text-small text-text-secondary mt-1">{phase.theme}</p>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                {phaseActions.map((action) => (
                  <div
                    key={action.id}
                    className={`rounded-lg border p-4 transition-colors ${checked.has(action.id) ? "border-success/20 bg-success/5" : "border-border-default bg-surface-1"}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCheck(action.id)}
                        className="mt-0.5 shrink-0 text-text-tertiary hover:text-success transition-colors"
                      >
                        {checked.has(action.id) ? <CheckSquare className="h-4 w-4 text-success" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-body font-medium mb-1 ${checked.has(action.id) ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                          {action.title}
                        </p>
                        <p className="text-small text-text-secondary mb-2">{action.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[0.6875rem] font-semibold border uppercase tracking-wide ${priorityBadgeClass(action.priority)}`}>
                            {action.priority}
                          </span>
                          <span className="text-caption text-text-tertiary">Effort: {action.effort}</span>
                          <span className="text-caption text-text-tertiary">Impact: {action.impact}</span>
                          {action.conduikt_tool && (
                            <Link
                              href={buildPlaybookActionHref(projectId, action)}
                              className="text-caption text-accent hover:underline flex items-center gap-1"
                            >
                              <Zap className="h-3 w-3" /> {action.conduikt_tool}
                            </Link>
                          )}
                        </div>
                        {action.success_metric && (
                          <p className="mt-2 text-caption text-text-tertiary border-l-2 border-accent/30 pl-2">
                            {action.success_metric}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {phase.phase_kpi && (
                  <div className="rounded-lg bg-surface-2 px-4 py-3 mt-2">
                    <p className="text-caption text-accent uppercase tracking-wider mb-1 font-semibold">Phase KPI</p>
                    <p className="text-small text-text-secondary">{phase.phase_kpi}</p>
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
        <CardHeader><CardTitle>SEO Meta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-surface-1 p-4">
            <p className="text-caption text-text-tertiary mb-1 uppercase tracking-wider">SERP Preview</p>
            <p className="text-accent font-medium">{data.meta_title}</p>
            {data.slug && <p className="text-success text-small">conduikt.com/{data.slug}</p>}
            <p className="text-small text-text-secondary mt-1">{data.meta_description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-small text-text-secondary">
            {data.word_count && <span>Words: <strong className="text-text-primary">{data.word_count.toLocaleString()}</strong></span>}
            {data.reading_time_minutes && <span>Read time: <strong className="text-text-primary">{data.reading_time_minutes} min</strong></span>}
            {data.slug && <span>Slug: <strong className="text-text-primary font-mono">/{data.slug}</strong></span>}
          </div>
        </CardContent>
      </Card>

      {data.social_promotion && (
        <Card>
          <CardHeader><CardTitle>Social Promotion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.social_promotion.x_post && (
              <div className="rounded-lg border border-border-default p-3">
                <p className="text-caption text-text-tertiary mb-2 flex items-center gap-1"><Twitter className="h-3 w-3" /> X / Twitter</p>
                <p className="text-small text-text-secondary">{data.social_promotion.x_post}</p>
              </div>
            )}
            {data.social_promotion.linkedin_post && (
              <div className="rounded-lg border border-border-default p-3">
                <p className="text-caption text-text-tertiary mb-2">LinkedIn</p>
                <p className="text-small text-text-secondary">{data.social_promotion.linkedin_post}</p>
              </div>
            )}
            {data.social_promotion.email_subject && (
              <div className="rounded-lg border border-border-default p-3">
                <p className="text-caption text-text-tertiary mb-2 flex items-center gap-1"><Mail className="h-3 w-3" /> Email Subject</p>
                <p className="text-small text-text-secondary">{data.social_promotion.email_subject}</p>
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
        <CardContent className="py-5">
          <p className="whitespace-pre-wrap break-words text-body text-text-primary leading-relaxed">
            {plain}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-5 space-y-3">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <p className="text-caption text-accent font-medium uppercase tracking-wider mb-1">
              {key.replace(/_/g, " ")}
            </p>
            {Array.isArray(value) ? (
              <ul className="space-y-1">
                {value.map((item, i) => (
                  <li
                    key={i}
                    className="text-small text-text-secondary pl-3 border-l-2 border-border-subtle"
                  >
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : typeof value === "object" && value !== null ? (
              <div className="pl-3 border-l-2 border-border-subtle space-y-1">
                {Object.entries(value as Record<string, unknown>).map(
                  ([k, v]) => (
                    <p key={k} className="text-small text-text-secondary">
                      <span className="text-text-tertiary">{k}:</span>{" "}
                      {typeof v === "string" ? v : JSON.stringify(v)}
                    </p>
                  )
                )}
              </div>
            ) : (
              <p className="text-body text-text-primary whitespace-pre-wrap">
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

  useEffect(() => {
    fetch(`/api/projects/${projectId}/assets/${assetId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setAsset)
      .catch(() => {
        toast("Asset not found", "error");
        router.push(`/projects/${projectId}/library`);
      })
      .finally(() => setLoading(false));
  }, [projectId, assetId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
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
          className="inline-flex items-center gap-1.5 text-small text-text-tertiary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Library
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-surface-2 p-2.5">
              <TypeIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-h1 text-text-primary">{asset.title || "Untitled"}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{typeLabel}</Badge>
                <Badge variant={asset.status === "published" ? "success" : asset.status === "archived" ? "secondary" : "warning"}>
                  {asset.status}
                </Badge>
                <span className="text-caption text-text-tertiary">
                  {new Date(asset.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {openIn && (
              <Button
                variant="secondary"
                size="sm"
                disabled={navigating}
                onClick={() => startNavigation(() => router.push(openIn.path(projectId, assetId)))}
              >
                {navigating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <ExternalLink className="h-3.5 w-3.5" />
                }
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
