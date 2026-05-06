"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

// Click-to-play "facade pattern" — show the dashboard preview image with a
// play button until the user clicks. Only then do we mount the Loom iframe
// and load its ~250KB of player JS. Faster paint + the preview image is a
// natural fallback if the iframe ever fails to render.
const LOOM_EMBED =
  "https://www.loom.com/embed/6348cda048b24fa5be4ff14d15fd11d6" +
  "?autoplay=1&muted=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true";

export function HeroVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="animate-in relative" style={{ animationDelay: "120ms" }}>
      {/* Warm the connection to Loom in the background while the visitor is
          still reading the hero — when they click play, the DNS+TCP+TLS
          handshake is already done. Saves ~200–500ms with zero downside. */}
      <link rel="preconnect" href="https://www.loom.com" />
      <link rel="dns-prefetch" href="https://www.loom.com" />
      <div
        className="relative rounded-xl border border-border-default shadow-[var(--shadow-elevated)] overflow-hidden transform rotate-1 hover:rotate-0 transition-transform duration-500 aspect-video"
      >
        {playing ? (
          <iframe
            src={LOOM_EMBED}
            title="Conduikt product demo"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full cursor-pointer"
            aria-label="Play Conduikt product demo"
          >
            <Image
              src="/images/conduikt-dashboard.png"
              alt="Conduikt AI marketing dashboard showing SEO score 87, CRO score 92, and 24 generated marketing assets"
              width={600}
              height={450}
              priority
              sizes="(max-width: 1024px) 100vw, 600px"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-surface-0/30 transition-opacity duration-200 group-hover:bg-surface-0/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-text-primary shadow-[var(--shadow-elevated)] ring-4 ring-accent/30 transition-transform duration-200 group-hover:scale-110">
                <Play
                  className="h-8 w-8 translate-x-0.5 fill-current"
                  aria-hidden="true"
                />
              </span>
            </div>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface-0/80 px-4 py-1.5 text-small font-medium text-text-primary backdrop-blur-sm">
              Watch the demo
            </span>
          </button>
        )}
      </div>
      <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-accent-secondary/10 blur-3xl pointer-events-none" />
    </div>
  );
}
