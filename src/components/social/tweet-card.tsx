"use client";

import { MessageCircle, Repeat2, Heart, Bookmark, BarChart2, Share } from "lucide-react";
import { cn } from "@/src/lib/utils/cn";

/**
 * Pixel-approximate X/Twitter feed card for previewing scheduled tweets.
 *
 * Why this exists (per UX audit finding 2B): raw JSON/text previews create
 * cognitive detachment — users don't feel "this is my tweet". A native card
 * with avatar, handle, and a live 280-char count triggers publish-readiness.
 *
 * Rendering choices:
 * - Follows current X (Twitter) light + dark visual conventions
 * - Character ring goes yellow at 260/280, red at 280+ (rejects submission)
 * - Handles single tweet OR a thread (pass `thread=true` + `position` for i/N)
 * - Media rendered as neutral placeholders — real image preview is a follow-up
 *
 * This is a PREVIEW component. It never posts anything itself.
 */

export interface TweetCardProps {
  text: string;
  author?: {
    name: string;
    handle: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  timestamp?: string; // display-only, e.g. "2h" or "Now"
  mediaCount?: number; // 0-4
  /** Set true if this tweet is one leaf of a thread. */
  thread?: boolean;
  /** Position within thread, e.g. { current: 1, total: 4 }. */
  position?: { current: number; total: number };
  className?: string;
}

const X_LIMIT = 280;
const X_WARN = 260;

// Twitter counts emoji + certain characters as 2. We deliberately keep this
// simple (Array.from length) — accurate enough for a preview; if the real
// character count matters we'd import twitter-text.
function tweetLength(t: string): number {
  return Array.from(t).length;
}

export function TweetCard({
  text,
  author = {
    name: "Your Name",
    handle: "yourhandle",
    verified: false,
  },
  timestamp = "Now",
  mediaCount = 0,
  thread = false,
  position,
  className,
}: TweetCardProps) {
  const len = tweetLength(text);
  const remaining = X_LIMIT - len;
  const overLimit = remaining < 0;
  const warning = remaining <= X_LIMIT - X_WARN && remaining >= 0; // 0-20 chars left
  const ringPct = Math.min(len / X_LIMIT, 1);
  // Circle geometry — 18px radius, stroke on a 40px viewBox
  const R = 8;
  const C = 2 * Math.PI * R;

  const ringColor = overLimit
    ? "stroke-red-500"
    : warning
    ? "stroke-yellow-500"
    : "stroke-sky-500";

  return (
    <article
      className={cn(
        "rounded-2xl border border-border-default bg-surface-1 p-4 max-w-[598px] font-sans",
        className
      )}
      // aria region so screen readers announce it as a preview grouping
      aria-label="Tweet preview"
    >
      {thread && position && (
        <div className="mb-2 text-caption text-text-tertiary font-mono">
          {position.current}/{position.total}
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatarUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full bg-surface-3 flex items-center justify-center text-text-secondary text-sm font-semibold"
              aria-hidden
            >
              {author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Header line */}
          <div className="flex items-center gap-1 text-[0.9375rem] leading-tight">
            <span className="font-bold text-text-primary truncate">
              {author.name}
            </span>
            {author.verified && (
              <span
                className="text-sky-500 shrink-0"
                aria-label="Verified"
                title="Verified"
              >
                {/* Simple check svg to avoid another lucide import bloat */}
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M22 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 9.6 1.5 7.71 4.7l-3.61.81.34 3.7L2 12l2.44 2.79-.34 3.7 3.61.82L9.6 22.5 12 21.04l2.4 1.46 1.89-3.2 3.61-.82-.34-3.69L22 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
                </svg>
              </span>
            )}
            <span className="text-text-tertiary truncate">
              @{author.handle}
            </span>
            <span className="text-text-tertiary">·</span>
            <span className="text-text-tertiary">{timestamp}</span>
          </div>

          {/* Body */}
          <p className="mt-1 text-[0.9375rem] leading-[1.35] text-text-primary whitespace-pre-wrap break-words">
            {text || (
              <span className="text-text-tertiary italic">
                Your tweet will appear here as you type…
              </span>
            )}
          </p>

          {/* Media placeholder */}
          {mediaCount > 0 && (
            <div
              className={cn(
                "mt-3 grid gap-0.5 rounded-2xl overflow-hidden border border-border-subtle",
                mediaCount === 1 && "grid-cols-1",
                mediaCount === 2 && "grid-cols-2",
                mediaCount === 3 && "grid-cols-2",
                mediaCount === 4 && "grid-cols-2"
              )}
            >
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

          {/* Interaction row + counter ring */}
          <div className="mt-3 flex items-center justify-between text-text-tertiary">
            <div className="flex items-center gap-6 text-caption">
              <span
                className="flex items-center gap-1 hover:text-sky-500 transition-colors"
                title="Reply"
              >
                <MessageCircle className="h-4 w-4" />
              </span>
              <span
                className="flex items-center gap-1 hover:text-emerald-500 transition-colors"
                title="Repost"
              >
                <Repeat2 className="h-4 w-4" />
              </span>
              <span
                className="flex items-center gap-1 hover:text-pink-500 transition-colors"
                title="Like"
              >
                <Heart className="h-4 w-4" />
              </span>
              <span
                className="flex items-center gap-1 hover:text-sky-500 transition-colors"
                title="Views"
              >
                <BarChart2 className="h-4 w-4" />
              </span>
              <span
                className="flex items-center gap-1 hover:text-sky-500 transition-colors"
                title="Bookmark"
              >
                <Bookmark className="h-4 w-4" />
              </span>
              <span
                className="flex items-center gap-1 hover:text-sky-500 transition-colors"
                title="Share"
              >
                <Share className="h-4 w-4" />
              </span>
            </div>

            {/* Character ring */}
            <div
              className="flex items-center gap-2"
              title={`${len}/${X_LIMIT} characters`}
              aria-label={`${len} of ${X_LIMIT} characters used`}
            >
              {(warning || overLimit) && (
                <span
                  className={cn(
                    "text-caption font-mono tabular-nums",
                    overLimit ? "text-red-500" : "text-yellow-500"
                  )}
                >
                  {remaining}
                </span>
              )}
              <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20" aria-hidden>
                <circle
                  cx="10"
                  cy="10"
                  r={R}
                  className="fill-none stroke-border-strong"
                  strokeWidth="1.5"
                />
                <circle
                  cx="10"
                  cy="10"
                  r={R}
                  className={cn("fill-none transition-all", ringColor)}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C - C * ringPct}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
