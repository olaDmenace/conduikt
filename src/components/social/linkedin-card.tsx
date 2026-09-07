"use client";

import { useState } from "react";
import { ThumbsUp, MessageSquare, Repeat, Send, MoreHorizontal, Globe } from "lucide-react";
import { cn } from "@/src/lib/utils/cn";

/**
 * Pixel-approximate LinkedIn feed card for previewing scheduled posts.
 *
 * Why this exists (per UX audit finding 5B): raw text previews create
 * cognitive detachment. A native card with header, "…see more" fold, and
 * reaction bar triggers publish-readiness.
 *
 * LinkedIn folds long text after roughly 210 characters on desktop feeds.
 * We match that with a "see more" toggle so the author can preview both
 * states — folded (what the feed shows) and expanded (what a click reveals).
 *
 * This is a PREVIEW component. It never posts anything itself.
 */

export interface LinkedInCardProps {
  text: string;
  author?: {
    name: string;
    headline?: string;
    avatarUrl?: string;
  };
  /** Display-only timestamp, e.g. "2h" or "Just now". */
  timestamp?: string;
  mediaCount?: number;
  className?: string;
}

// Empirical LinkedIn fold: mobile ~140, desktop ~210. Use 210 for the preview
// so authors optimize for the more forgiving surface — if it reads well
// folded on desktop, the mobile fold's hook (~first 140) has to also work
// and that's a stronger authoring constraint.
const FOLD_CHARS = 210;

export function LinkedInCard({
  text,
  author = {
    name: "Your Name",
    headline: "Founder · Conduikt",
  },
  timestamp = "Now",
  mediaCount = 0,
  className,
}: LinkedInCardProps) {
  const [expanded, setExpanded] = useState(false);
  const needsFold = text.length > FOLD_CHARS;
  const displayed = expanded || !needsFold ? text : text.slice(0, FOLD_CHARS);

  return (
    <article
      className={cn(
        "rounded-lg border border-border-default bg-surface-1 overflow-hidden max-w-[555px] font-sans",
        className
      )}
      aria-label="LinkedIn post preview"
    >
      {/* Header */}
      <header className="flex items-start gap-2 p-4 pb-2">
        <div className="shrink-0">
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="h-12 w-12 rounded-full bg-surface-3 flex items-center justify-center text-text-secondary text-base font-semibold"
              aria-hidden
            >
              {author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[0.9375rem] font-semibold text-text-primary hover:underline cursor-pointer truncate">
              {author.name}
            </span>
            <span className="text-caption text-text-tertiary shrink-0">
              · You
            </span>
          </div>
          {author.headline && (
            <p className="text-caption text-text-tertiary line-clamp-1">
              {author.headline}
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-text-tertiary">
            <span>{timestamp}</span>
            <span aria-hidden>·</span>
            <Globe className="h-3 w-3" aria-hidden />
          </div>
        </div>

        <button
          type="button"
          className="shrink-0 p-1 rounded-full text-text-tertiary hover:bg-surface-2"
          aria-label="More options (preview only)"
          disabled
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* Body */}
      <div className="px-4 pb-3">
        {text ? (
          <p className="text-[0.875rem] leading-[1.45] text-text-primary whitespace-pre-wrap break-words">
            {displayed}
            {needsFold && !expanded && (
              <>
                <span aria-hidden>…</span>{" "}
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-text-tertiary hover:text-text-primary hover:underline"
                >
                  see more
                </button>
              </>
            )}
          </p>
        ) : (
          <p className="text-[0.875rem] text-text-tertiary italic">
            Your LinkedIn post will appear here as you type…
          </p>
        )}
      </div>

      {/* Media placeholder */}
      {mediaCount > 0 && (
        <div className="mx-4 mb-3 rounded overflow-hidden border border-border-subtle grid grid-cols-1">
          {Array.from({ length: Math.min(mediaCount, 4) }).map((_, i) => (
            <div
              key={i}
              className="aspect-video bg-surface-3 flex items-center justify-center text-text-tertiary text-caption"
            >
              Media {i + 1}
            </div>
          ))}
        </div>
      )}

      {/* Fold indicator — always show the character count so authors know
          where their post gets truncated in the feed. */}
      <div className="mx-4 mb-2 flex items-center justify-between text-caption text-text-tertiary font-mono tabular-nums">
        <span>{text.length} characters</span>
        {needsFold && (
          <span className={cn(expanded ? "text-text-tertiary" : "text-warning")}>
            Feed shows first {FOLD_CHARS} · rest hidden behind "see more"
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border-subtle" />

      {/* Reaction bar (visual only) */}
      <div className="flex items-center justify-between px-2 py-1">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageSquare, label: "Comment" },
          { icon: Repeat, label: "Repost" },
          { icon: Send, label: "Send" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            disabled
            className="flex items-center gap-1.5 px-3 py-2 rounded text-caption text-text-secondary hover:bg-surface-2 disabled:opacity-100 disabled:cursor-default"
            aria-label={`${label} (preview only)`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}
