"use client";

import { useEffect, useState, use, useMemo, useTransition } from "react";
import {
  FileText,
  Globe,
  Mail,
  Twitter,
  Linkedin,
  Search,
  FolderOpen,
  Copy,
  Archive,
  LayoutGrid,
  List,
  Calendar,
  Tag,
  TrendingUp,
  Rocket,
  Download,
  ExternalLink,
  Lock,
  ArrowUpRight,
  CalendarClock,
} from "@/src/components/ui/lucide-icons";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";
import { createClient } from "@/src/lib/supabase/client";
import { PdfDownloadButton } from "@/src/components/ui/pdf-download-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Asset {
  id: string;
  type: string;
  channel: string | null;
  title: string | null;
  content: Record<string, unknown>;
  status: string;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  social_post: Twitter,
  email: Mail,
  blog_post: Globe,
  landing_page: Globe,
  seo_page: Globe,
  audit_report: FileText,
  copy_block: FileText,
  headline: FileText,
  cta: FileText,
  ad_copy: FileText,
  meta_tags: Tag,
  schema_markup: Tag,
  growth_playbook: TrendingUp,
  launch_plan: Rocket,
};

const TYPE_LABELS: Record<string, string> = {
  social_post: "Social post",
  email: "Email",
  blog_post: "Blog post",
  landing_page: "Landing page",
  seo_page: "Search page",
  audit_report: "Audit report",
  copy_block: "Copy block",
  headline: "Headline",
  cta: "Button text",
  ad_copy: "Ad copy",
  meta_tags: "Meta tags",
  schema_markup: "Schema markup",
  growth_playbook: "Growth plan",
  launch_plan: "Launch plan",
};

const CHANNEL_LABELS: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  email: "Email",
  web: "Web",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
};

function AssetPreview({ asset }: { asset: Asset }) {
  const c = asset.content;

  if (asset.type === "growth_playbook") {
    const parsed = (c?.parsed ?? c) as Record<string, unknown>;
    const summary = parsed?.executive_summary as string | undefined;
    const phases = parsed?.phases as Array<{ phase: number; name: string; timeline: string; actions?: unknown[] }> | undefined;
    return (
      <div className="space-y-3">
        {summary && <p className="leading-relaxed">{summary}</p>}
        {phases && phases.length > 0 && (
          <div className="space-y-1 mt-2">
            {phases.map((ph) => (
              <div key={ph.phase} className="flex items-center justify-between text-body-s">
                <span className="text-text font-medium">Phase {ph.phase}: {ph.name}</span>
                <span className="text-text-3">{ph.timeline} · {ph.actions?.length ?? 0} actions</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (asset.type === "blog_post") {
    const parsed = (c?.parsed ?? c) as Record<string, unknown>;
    const md = parsed?.content_markdown as string | undefined;
    const preview = md ? md.slice(0, 600) + (md.length > 600 ? "…" : "") : getTextContent(asset);
    return <p className="whitespace-pre-wrap leading-relaxed">{preview}</p>;
  }

  // Default: raw text
  const text = getTextContent(asset);
  const preview = text.slice(0, 800) + (text.length > 800 ? "…" : "");
  return <p className="whitespace-pre-wrap font-mono leading-relaxed">{preview}</p>;
}

function statusVariant(
  status: string
): "success" | "warning" | "secondary" | "error" {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  if (status === "archived") return "secondary";
  return "secondary";
}

function isSchedulable(asset: Asset): boolean {
  return asset.channel === "x" || asset.channel === "linkedin";
}

/** datetime-local default: now + 15 minutes, formatted as YYYY-MM-DDTHH:mm in local time. */
function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local min: now + 1 minute. Prevents the API's "must be future" rejection. */
function minScheduleValue(): string {
  const d = new Date(Date.now() + 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getTextContent(asset: Asset): string {
  const c = asset.content;
  if (typeof c === "string") return c;
  if (c?.raw && typeof c.raw === "string") return c.raw;
  if (c?.scheduled_text && typeof c.scheduled_text === "string")
    return c.scheduled_text;
  if (c?.html && typeof c.html === "string") return c.html;
  if (c?.markdown && typeof c.markdown === "string") return c.markdown;
  if (c?.text && typeof c.text === "string") return c.text;
  if (c?.subject && typeof c.subject === "string") return c.subject;
  // Fallback: readable key/value lines instead of raw JSON.
  if (c && typeof c === "object") {
    return Object.entries(c as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => {
        const label = k.replace(/_/g, " ");
        if (typeof v === "string") return `${label}: ${v}`;
        if (Array.isArray(v))
          return `${label}:\n${v
            .map((item) =>
              typeof item === "string" ? `  • ${item}` : `  • ${JSON.stringify(item)}`
            )
            .join("\n")}`;
        return `${label}: ${String(v)}`;
      })
      .join("\n\n");
  }
  return "";
}

/**
 * Formats an email asset as structured plain text for paste into an ESP.
 * Includes subject, preview text, body, and CTA so nothing is lost on export.
 */
function formatEmailForExport(asset: Asset): string {
  const c = asset.content ?? {};
  const subject = typeof c.subject === "string" ? c.subject : "";
  const preview = typeof c.preview_text === "string" ? c.preview_text : "";
  const html = typeof c.html === "string" ? c.html : "";
  const ctaText = typeof c.cta_text === "string" ? c.cta_text : "";
  const ctaUrl = typeof c.cta_url === "string" ? c.cta_url : "";
  const parts: string[] = [];
  if (subject) parts.push(`Subject: ${subject}`);
  if (preview) parts.push(`Preview: ${preview}`);
  if (html) parts.push("", html);
  if (ctaText || ctaUrl) {
    parts.push("", `CTA: ${ctaText}${ctaUrl ? ` (${ctaUrl})` : ""}`);
  }
  const out = parts.join("\n").trim();
  return out || getTextContent(asset);
}

export default function LibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>("free");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Schedule dialog state — distinct from selectedAsset so the preview dialog
  // can close while the schedule flow stays open.
  const [schedulingAsset, setSchedulingAsset] = useState<Asset | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [schedulePostText, setSchedulePostText] = useState("");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function getAssets(): Promise<Asset[] | null> {
    const res = await fetch(`/api/projects/${projectId}/assets`);
    return res.ok ? await res.json() : null;
  }

  useEffect(() => {
    getAssets().then((data) => {
      if (data) setAssets(data);
      setLoading(false);
    });
    async function fetchPlan() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
      if (data?.plan) setPlan(data.plan);
    }
    fetchPlan();
  }, [projectId]);

  async function handleArchive(assetId: string) {
    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    if (res.ok) {
      toast("Archived", "info");
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId ? { ...a, status: "archived" } : a
        )
      );
      setSelectedAsset(null);
    } else {
      toast("Failed to archive", "error");
    }
  }

  function handleCopy(asset: Asset) {
    const text =
      asset.type === "email" ? formatEmailForExport(asset) : getTextContent(asset);
    navigator.clipboard.writeText(text);
    toast(
      asset.type === "email"
        ? "Email copied. Paste it into your email tool."
        : "Content copied",
      "success"
    );
  }

  function openScheduleDialog(asset: Asset) {
    setSchedulingAsset(asset);
    setScheduleDateTime(defaultScheduleValue());
    setSchedulePostText(getTextContent(asset));
    setSelectedAsset(null); // close the preview dialog first
  }

  function closeScheduleDialog() {
    setSchedulingAsset(null);
    setScheduleDateTime("");
    setSchedulePostText("");
    setScheduleSubmitting(false);
  }

  async function handleSchedule() {
    if (!schedulingAsset || !scheduleDateTime || !schedulePostText.trim()) return;
    if (!isSchedulable(schedulingAsset)) {
      toast("This kind of content can't be scheduled", "error");
      return;
    }

    setScheduleSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: schedulingAsset.id,
          channel: schedulingAsset.channel as "x" | "linkedin",
          scheduledFor: new Date(scheduleDateTime).toISOString(),
          postText: schedulePostText,
        }),
      });

      if (res.ok) {
        toast(
          `Scheduled for ${new Date(scheduleDateTime).toLocaleString()}`,
          "success",
        );
        closeScheduleDialog();
        // Nudge to calendar so user sees their scheduled post
        startNavigation(() => router.push(`/projects/${projectId}/calendar`));
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to schedule post", "error");
        setScheduleSubmitting(false);
      }
    } catch {
      toast("Failed to schedule post", "error");
      setScheduleSubmitting(false);
    }
  }

  // Compute unique types/channels for filter dropdowns
  const uniqueTypes = useMemo(
    () => [...new Set(assets.map((a) => a.type))],
    [assets]
  );
  const uniqueChannels = useMemo(
    () => [...new Set(assets.map((a) => a.channel).filter(Boolean))],
    [assets]
  );

  // Filtered assets
  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (channelFilter !== "all" && a.channel !== channelFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = (a.title ?? "").toLowerCase();
        const type = (TYPE_LABELS[a.type] ?? a.type).toLowerCase();
        if (!title.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [assets, typeFilter, channelFilter, statusFilter, searchQuery]);

  return (
    <div>
      <PageHeader
        title="Library"
        description="Everything you've made for this project, in one place"
      />


      {plan === "free" && !loading && (
        <Card emphasis className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-accent shrink-0" />
              <p className="text-body-s text-text-2">
                The library is a <span className="font-medium text-text">Pro</span> feature.
                Upgrade to save, sort and reuse what you make.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/settings/billing">
                Upgrade
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading library">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" />}
          title="Nothing saved yet. Write something in Content Studio or the Playground and save it to build your library."
          action={
            <div className="flex items-center gap-3">
              <Button asChild>
                <Link href={`/projects/${projectId}/content`}>
                  Open Content Studio
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard?pick=creation">
                  Playground
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
              <Input
                placeholder="Search your library…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-line-strong bg-surface px-3 text-body-s text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="all">All types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-9 rounded-md border border-line-strong bg-surface px-3 text-body-s text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="all">All channels</option>
              {uniqueChannels.map((ch) => (
                <option key={ch} value={ch!}>
                  {CHANNEL_LABELS[ch!] ?? ch}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-line-strong bg-surface px-3 text-body-s text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <div className="flex items-center gap-1 ml-auto">
              <IconButton
                size="sm"
                label="Grid view"
                aria-pressed={viewMode === "grid"}
                variant={viewMode === "grid" ? "outline" : "ghost"}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                size="sm"
                label="List view"
                aria-pressed={viewMode === "list"}
                variant={viewMode === "list" ? "outline" : "ghost"}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>

          <p className="text-label text-text-3 mb-4">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </p>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((asset, i) => {
                const Icon = TYPE_ICONS[asset.type] ?? FileText;
                return (
                  <Card
                    key={asset.id}
                    hover
                    className="animate-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <CardContent>
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="h-4 w-4 text-text-3" />
                        <Badge variant={statusVariant(asset.status)}>
                          {asset.status}
                        </Badge>
                      </div>
                      <h3 className="text-title text-text mb-2 truncate">
                        {asset.title || "Untitled"}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {TYPE_LABELS[asset.type] ?? asset.type}
                        </Badge>
                        {asset.channel && (
                          <Badge variant="secondary">
                            {CHANNEL_LABELS[asset.channel] ?? asset.channel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-caption text-text-3 mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(asset.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {filtered.map((asset, i) => {
                const Icon = TYPE_ICONS[asset.type] ?? FileText;
                return (
                  <Card
                    key={asset.id}
                    hover
                    className="animate-in py-3 md:py-3"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <CardContent className="flex items-center gap-4">
                      <Icon className="h-4 w-4 shrink-0 text-text-3" />
                      <div className="flex-1 min-w-0">
                        <p className="text-title text-text truncate">
                          {asset.title || "Untitled"}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {TYPE_LABELS[asset.type] ?? asset.type}
                      </Badge>
                      {asset.channel && (
                        <Badge variant="secondary">
                          {CHANNEL_LABELS[asset.channel] ?? asset.channel}
                        </Badge>
                      )}
                      <Badge variant={statusVariant(asset.status)}>
                        {asset.status}
                      </Badge>
                      <span className="text-caption text-text-3 whitespace-nowrap">
                        {new Date(asset.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedAsset.title || "Untitled"}
                </DialogTitle>
                <DialogDescription>
                  {TYPE_LABELS[selectedAsset.type] ?? selectedAsset.type}
                  {selectedAsset.channel
                    ? ` \u00b7 ${CHANNEL_LABELS[selectedAsset.channel] ?? selectedAsset.channel}`
                    : ""}
                </DialogDescription>
              </DialogHeader>

              {/* Content preview */}
              <div className="mt-2 rounded-md border border-line bg-ground p-4 text-body-s text-text-2 max-h-[360px] overflow-y-auto">
                <AssetPreview asset={selectedAsset} />
              </div>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Button
                  disabled={navigating}
                  onClick={() => startNavigation(() => router.push(`/projects/${projectId}/assets/${selectedAsset.id}`))}
                >
                  {!navigating && <ExternalLink className="h-3.5 w-3.5" />}
                  {navigating ? "Opening…" : "Open full view"}
                </Button>
                <PdfDownloadButton
                  href={`/api/projects/${projectId}/assets/${selectedAsset.id}/pdf`}
                  filename={`${selectedAsset.title ?? "asset"}.pdf`}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(selectedAsset)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                {isSchedulable(selectedAsset) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openScheduleDialog(selectedAsset)}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Schedule
                  </Button>
                )}
                {selectedAsset.status !== "archived" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchive(selectedAsset.id)}
                    className="text-danger hover:text-danger ml-auto"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog
        open={!!schedulingAsset}
        onOpenChange={(open) => {
          if (!open) closeScheduleDialog();
        }}
      >
        <DialogContent>
          {schedulingAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-text-3" />
                  Schedule {schedulingAsset.channel === "x" ? "X" : "LinkedIn"} post
                </DialogTitle>
                <DialogDescription>
                  {schedulingAsset.title || "Untitled"} ·{" "}
                  {CHANNEL_LABELS[schedulingAsset.channel ?? ""] ?? schedulingAsset.channel}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 space-y-4">
                <div>
                  <label className="text-body-s text-text-2 block mb-1.5">
                    When to post
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    min={minScheduleValue()}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </div>

                <div>
                  <label className="text-body-s text-text-2 block mb-1.5">
                    Post text
                  </label>
                  <textarea
                    value={schedulePostText}
                    onChange={(e) => setSchedulePostText(e.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-y"
                  />
                  {schedulingAsset.channel === "x" && (
                    <p className="mt-1 text-caption text-text-3">
                      {schedulePostText.length} / 280 characters
                      {schedulePostText.length > 280 && (
                        <span className="text-danger ml-2">
                          Too long. X will reject this.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <Button
                  onClick={handleSchedule}
                  disabled={
                    scheduleSubmitting ||
                    !scheduleDateTime ||
                    !schedulePostText.trim() ||
                    (schedulingAsset.channel === "x" &&
                      schedulePostText.length > 280)
                  }
                >
                  {scheduleSubmitting ? (
                    "Scheduling…"
                  ) : (
                    <>
                      <CalendarClock className="h-3.5 w-3.5" />
                      Schedule post
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={closeScheduleDialog}
                  disabled={scheduleSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
