"use client";

import { useState } from "react";
import { Quote } from "lucide-react";

export interface Testimonial {
  name: string;
  quote: string;
}

interface Props {
  testimonials: Testimonial[];
  /** Animation duration in seconds for a single full loop. */
  durationSeconds?: number;
}

export function TestimonialMarquee({
  testimonials,
  durationSeconds = 60,
}: Props) {
  const [paused, setPaused] = useState(false);

  // Duplicate once so the translateX(-50%) loop is seamless.
  const track = [...testimonials, ...testimonials];

  return (
    <div
      className="group relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => setPaused((p) => !p)}
      role="region"
      aria-label="What users are saying about Conduikt. Click or hover to pause."
    >
      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-surface-0 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-surface-0 to-transparent" />

      <div
        className="flex w-max gap-6 items-stretch"
        style={{
          animation: `testimonial-marquee ${durationSeconds}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {track.map((t, i) => (
          <figure
            key={`${t.name}-${i}`}
            className="flex w-[22rem] sm:w-[26rem] shrink-0 flex-col rounded-2xl border border-border-default bg-surface-1 p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset]"
          >
            <Quote
              className="h-5 w-5 text-accent/60 mb-3"
              aria-hidden="true"
            />
            <blockquote className="flex-1 text-body text-text-secondary leading-relaxed tracking-wide">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 pt-4 border-t border-border-subtle text-small font-medium text-text-primary tracking-wide">
              {t.name}
            </figcaption>
          </figure>
        ))}
      </div>

      <style>{`
        @keyframes testimonial-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[role="region"] > div:last-of-type {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
