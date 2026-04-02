"use client";

import { useEffect, useState, use, useMemo } from "react";
import {
  FileText,
  Globe,
  Mail,
  Twitter,
  Linkedin,
  Search,
  Loader2,
  FolderOpen,
  Copy,
  Archive,
  LayoutGrid,
  List,
  Calendar,
  Tag,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import Link from "next/link";

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
};

const TYPE_LABELS: Record<string, string> = {
  social_post: "Social Post",
  email: "Email",
  blog_post: "Blog Post",
  landing_page: "Landing Page",
  seo_page: "SEO Page",
  audit_report: "Audit Report",
  copy_block: "Copy Block",
  headline: "Headline",
  cta: "CTA",
  ad_copy: "Ad Copy",
  meta_tags: "Meta Tags",
  schema_markup: "Schema Markup",
};

const CHANNEL_LABELS: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  email: "Email",
  web: "Web",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
};

function statusVariant(
  status: string
): "success" | "warning" | "secondary" | "error" {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  if (status === "archived") return "secondary";
  return "secondary";
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
  return JSON.stringify(c, null, 2);
}

export default function LibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAssets();
  }, [projectId]);

  async function fetchAssets() {
    const res = await fetch(`/api/projects/${projectId}/assets`);
    if (res.ok) setAssets(await res.json());
    setLoading(false);
  }

  async function handleArchive(assetId: string) {
    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    if (res.ok) {
      toast("Asset archived", "info");
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
    const text = getTextContent(asset);
    navigator.clipboard.writeText(text);
    toast("Content copied", "success");
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
        title="Content Library"
        description="Browse and manage all your generated assets"
      />


      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-text-tertiary mb-4" />
            <h3 className="text-h3 text-text-primary">No assets yet</h3>
            <p className="mt-2 text-body text-text-secondary max-w-md">
              Generate content using Content Studio or the Playground, then save drafts to build your library.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <Button asChild>
                <Link href={`/projects/${projectId}/content`}>
                  Content Studio
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/playground">
                  Playground
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-secondary"
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
              className="rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-secondary"
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
              className="rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-secondary"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <div className="flex items-center gap-1 ml-auto">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "primary" : "ghost"}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "primary" : "ghost"}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-small text-text-tertiary mb-4">
            {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
          </p>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((asset, i) => {
                const Icon = TYPE_ICONS[asset.type] ?? FileText;
                return (
                  <Card
                    key={asset.id}
                    className="animate-in cursor-pointer hover:border-accent/40 transition-colors"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="rounded-lg bg-surface-2 p-2">
                          <Icon className="h-4 w-4 text-accent" />
                        </div>
                        <Badge variant={statusVariant(asset.status)}>
                          {asset.status}
                        </Badge>
                      </div>
                      <h3 className="text-body font-medium text-text-primary mb-2 truncate">
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
                      <p className="text-caption text-text-tertiary mt-2 flex items-center gap-1">
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
                    className="animate-in cursor-pointer hover:border-accent/40 transition-colors"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <CardContent className="flex items-center gap-4 py-3">
                      <div className="rounded-lg bg-surface-2 p-2 shrink-0">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium text-text-primary truncate">
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
                      <span className="text-caption text-text-tertiary whitespace-nowrap">
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

              <div className="mt-2 rounded-lg border border-border-default bg-surface-0 p-4 text-small text-text-secondary whitespace-pre-wrap break-words font-mono max-h-[400px] overflow-y-auto">
                {getTextContent(selectedAsset)}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(selectedAsset)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link
                    href={`/projects/${projectId}/agents/calendar`}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Schedule
                  </Link>
                </Button>
                {selectedAsset.status !== "archived" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchive(selectedAsset.id)}
                    className="text-error hover:text-error ml-auto"
                  >
                    <Archive className="h-3.5 w-3.5 mr-1.5" />
                    Archive
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
