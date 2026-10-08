"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { History, ArrowUpRight, AlertTriangle, RefreshCw } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";

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
  title = "Recently saved",
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

  // While loading: rows shaped like the list so layout doesn't jump
  if (assets === null) {
    return (
      <Card className="animate-in" role="status" aria-label="Loading saved items">
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
    );
  }

  // Real fetch failure: distinct from empty. Surface the problem + a retry.
  if (loadError) {
    return (
      <Card className="animate-in flex items-center justify-between gap-3 border-dashed">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
          <p className="truncate text-body-s text-text-2">
            Couldn&apos;t load saved {title.toLowerCase()}. {loadError}.
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="hover-link flex shrink-0 items-center gap-1 text-body-s font-medium text-accent-hover hover:text-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </Card>
    );
  }

  // Empty: optionally show a hint so users know saving WILL surface here
  if (assets.length === 0) {
    if (!emptyHint) return null;
    return (
      <Card className="animate-in flex items-center gap-2 border-dashed">
        <History className="h-4 w-4 shrink-0 text-text-3" />
        <p className="text-body-s text-text-3">{emptyHint}</p>
      </Card>
    );
  }

  return (
    <Card className="animate-in">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-text-3" />
          <h3 className="text-title text-text">{title}</h3>
        </div>
        {libraryHref && (
          <Link
            href={libraryHref}
            className="hover-link flex items-center gap-1 text-body-s text-text-3 hover:text-text"
          >
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <ul className="divide-y divide-line">
        {assets.map((asset) => {
          const isCurrent = currentAssetId === asset.id;
          return (
            <li key={asset.id}>
              <Link
                href={linkBuilder(asset.id)}
                className={`-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                  isCurrent
                    ? "bg-accent-soft"
                    : "hover:bg-surface-2"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-body ${
                      isCurrent
                        ? "font-medium text-accent-hover"
                        : "text-text"
                    }`}
                  >
                    {asset.title || "Untitled"}
                  </p>
                  <p className="text-caption text-text-3">
                    {formatRelative(asset.created_at)}
                  </p>
                </div>
                {isCurrent && (
                  <span className="shrink-0 whitespace-nowrap text-label text-accent-hover">
                    Current
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
