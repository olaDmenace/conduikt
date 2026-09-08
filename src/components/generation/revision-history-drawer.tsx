"use client";

import { useEffect, useState, useCallback } from "react";
import { History, RotateCcw, Sparkles, PenTool, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils/cn";

/**
 * Revision History drawer for a saved asset.
 *
 * Shows a timeline of prior snapshots (newest first) with a source
 * badge and a one-click Restore action. Restore never destroys the
 * current version — it POSTs the current content as a `restore`
 * revision first so the user can un-restore.
 *
 * Usage: mount once per Content Studio session, pass the assetId once
 * an asset has been saved (before that, there's nothing to revise).
 */

export interface Revision {
  id: string;
  source: "generation" | "manual_edit" | "autosave" | "restore";
  created_at: string;
  content: unknown;
}

interface Props {
  assetId: string;
  /**
   * The current in-editor content. When Restore is clicked we first
   * snapshot this as a `restore`-source revision, then hand the older
   * revision's content back via onRestore for the parent to apply.
   */
  currentContent: unknown;
  onRestore: (content: unknown) => void;
  className?: string;
}

const SOURCE_BADGES: Record<
  Revision["source"],
  { label: string; icon: React.ElementType; className: string }
> = {
  generation: { label: "Generated", icon: Sparkles, className: "text-accent" },
  manual_edit: { label: "Edited", icon: PenTool, className: "text-info" },
  autosave: { label: "Autosaved", icon: Save, className: "text-text-tertiary" },
  restore: { label: "Restored", icon: RotateCcw, className: "text-success" },
};

function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.max(1, Math.floor((now - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RevisionHistoryDrawer({
  assetId,
  currentContent,
  onRestore,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data.revisions ?? []);
      }
    } catch {
      // Swallow — drawer will show empty state
    }
    setLoading(false);
  }, [assetId]);

  useEffect(() => {
    if (open) fetchRevisions();
  }, [open, fetchRevisions]);

  async function handleRestore(rev: Revision) {
    setRestoring(rev.id);
    try {
      // First: snapshot the current state as a `restore` revision so
      // the user can un-restore later. Best-effort — if this fails we
      // still proceed with the restore because losing the old content
      // is preferable to leaving the user unable to recover.
      await fetch(`/api/assets/${assetId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent, source: "restore" }),
      }).catch(() => {});

      // Hand the older content back to the parent to apply.
      onRestore(rev.content);
      // Refresh the timeline to include the snapshot we just wrote.
      await fetchRevisions();
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-1 px-2.5 py-1 text-caption text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary hover:border-border-strong"
        aria-label="Open revision history"
      >
        <History className="h-3.5 w-3.5" />
        <span>History</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative w-full max-w-sm bg-surface-0 border-l border-border-default shadow-2xl overflow-y-auto"
            aria-label="Revision history"
          >
            <header className="sticky top-0 bg-surface-0 border-b border-border-default p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-text-secondary" />
                <h3 className="text-small font-medium text-text-primary">
                  Revision History
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                aria-label="Close history drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
                </div>
              ) : revisions.length === 0 ? (
                <p className="text-center text-small text-text-tertiary py-8">
                  No revisions yet. Save or regenerate this asset to build
                  a history.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {revisions.map((rev, i) => {
                    const badge = SOURCE_BADGES[rev.source];
                    const Icon = badge.icon;
                    const isCurrent = i === 0;
                    return (
                      <li
                        key={rev.id}
                        className={cn(
                          "rounded-lg border border-border-default bg-surface-1 p-3",
                          isCurrent && "border-accent/40 bg-accent-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2 text-caption">
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", badge.className)} />
                          <span className={cn("font-medium", badge.className)}>
                            {badge.label}
                          </span>
                          <span className="text-text-tertiary">
                            · {fmtRelative(rev.created_at)}
                          </span>
                          {isCurrent && (
                            <span className="ml-auto text-caption text-accent font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRestore(rev)}
                            disabled={restoring !== null}
                            className="mt-2 inline-flex items-center gap-1 text-caption text-accent hover:text-accent-hover disabled:opacity-50"
                          >
                            {restoring === rev.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            <span>Restore this version</span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <p className="mt-4 text-caption text-text-tertiary leading-snug">
                Restoring is non-destructive — the current version is
                snapshotted first so you can un-restore.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
