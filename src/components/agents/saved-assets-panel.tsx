"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { History, ArrowUpRight, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";

interface SavedAsset {
  id: string;
  title: string | null;
  type: string;
  created_at: string;
  status: string;
}

interface SavedAssetsPanelProps {
  projectId: string;
  assetType: string;
  title?: string;
  /** Returns the URL (or querystring) to load when a saved asset is clicked. */
  linkBuilder: (assetId: string) => string;
  /** Optional "View all in Library" destination. */
  libraryHref?: string;
  /** Upper bound on how many to list. Defaults to 5. */
  limit?: number;
  /** If set, highlights the currently-loaded asset so the user knows which row matches the view. */
  currentAssetId?: string;
  /** Shown in empty state when the user has zero saved assets of this type. */
  emptyHint?: string;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SavedAssetsPanel({
  projectId,
  assetType,
  title = "Recently Saved",
  linkBuilder,
  libraryHref,
  limit = 5,
  currentAssetId,
  emptyHint,
}: SavedAssetsPanelProps) {
  const [assets, setAssets] = useState<SavedAsset[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setAssets(null);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/assets?type=${encodeURIComponent(
            assetType,
          )}&limit=${limit}`,
        );
        if (!res.ok) {
          // 404 means the project no longer exists; treat as empty instead of an error
          // since the user will see other breakage first. Everything else = real fetch failure.
          if (!cancelled) {
            if (res.status === 404) {
              setAssets([]);
            } else {
              setLoadError(`Failed to load saved assets (${res.status})`);
              setAssets([]);
            }
          }
          return;
        }
        const data: SavedAsset[] = await res.json();
        if (!cancelled) {
          setLoadError(null);
          setAssets(data);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Network error");
          setAssets([]);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, assetType, limit, reloadKey]);

  // While loading: small placeholder so layout doesn't jump
  if (assets === null) {
    return (
      <Card className="animate-in">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-text-tertiary animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Real fetch failure: distinct from empty. Surface the problem + a retry.
  if (loadError) {
    return (
      <Card className="animate-in border-dashed border-border-default">
        <CardContent className="py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-small text-text-secondary truncate">
              Couldn&apos;t load saved {title.toLowerCase()}. {loadError}.
            </p>
          </div>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 text-small text-accent hover:text-accent/80 transition-colors shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // Empty: optionally show a hint so users know saving WILL surface here
  if (assets.length === 0) {
    if (!emptyHint) return null;
    return (
      <Card className="animate-in border-dashed border-border-default">
        <CardContent className="py-4 flex items-center gap-2">
          <History className="h-4 w-4 text-text-tertiary shrink-0" />
          <p className="text-small text-text-tertiary">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-in">
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-text-tertiary" />
            <h3 className="text-body font-medium text-text-primary">{title}</h3>
          </div>
          {libraryHref && (
            <Link
              href={libraryHref}
              className="flex items-center gap-1 text-small text-text-tertiary hover:text-accent transition-colors"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <ul className="divide-y divide-border-default">
          {assets.map((asset) => {
            const isCurrent = currentAssetId === asset.id;
            return (
              <li key={asset.id}>
                <Link
                  href={linkBuilder(asset.id)}
                  className={`flex items-center justify-between gap-3 py-3 px-2 -mx-2 rounded-md transition-colors ${
                    isCurrent
                      ? "bg-accent-muted"
                      : "hover:bg-surface-2"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-body truncate ${
                        isCurrent
                          ? "text-accent font-medium"
                          : "text-text-primary"
                      }`}
                    >
                      {asset.title || "Untitled"}
                    </p>
                    <p className="text-caption text-text-tertiary">
                      {formatRelative(asset.created_at)}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-caption text-accent font-medium shrink-0 whitespace-nowrap">
                      Current
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
