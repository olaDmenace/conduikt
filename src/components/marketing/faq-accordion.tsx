"use client";

import { useId, useRef, useState } from "react";
import { Plus } from "lucide-react";

// Smoothly-animated FAQ accordion. The native <details>/<summary>
// element animates the chevron and toggles open/closed correctly, but
// it CAN'T animate the height transition reliably across browsers
// (interpolate-size + auto support is still patchy). This component
// drives the height with a controlled max-height transition pulled
// from the inner content's measured scrollHeight, so the open/close
// animation reads smooth in every browser.
//
// Behavior matches the previous markup:
//   - First item starts open.
//   - Only one item open at a time (single-select like the old
//     <details name=...> grouping).
//   - + glyph rotates 45° to × on open.

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  // Single-select: track the index of the open item, or null.
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="border-t border-border-subtle">
      {items.map((item, i) => (
        <FaqRow
          key={i}
          item={item}
          isOpen={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          delayMs={i * 60}
        />
      ))}
    </div>
  );
}

function FaqRow({
  item,
  isOpen,
  onToggle,
  delayMs,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  delayMs: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const buttonId = useId();

  // Read the measured content height so the transition has a real
  // target value; falling back to a generous max keeps things working
  // before measurement (initial render).
  const measured = panelRef.current?.scrollHeight ?? 999;

  return (
    <div
      className="animate-in border-b border-border-subtle"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:text-accent"
      >
        <h3
          className={`text-h3 transition-colors duration-[var(--duration-base)] ${
            isOpen ? "text-accent" : "text-text-primary"
          }`}
        >
          {item.question}
        </h3>
        <Plus
          className={`h-5 w-5 shrink-0 transition-transform duration-300 ease-[var(--ease-out-soft)] ${
            isOpen ? "rotate-45 text-accent" : "text-text-tertiary"
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        ref={panelRef}
        // Smooth height + opacity transition. We measure scrollHeight
        // on every render so adding/removing content (e.g., user-locale
        // wrapping) doesn't break the animation target.
        style={{
          maxHeight: isOpen ? `${measured}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
        className="overflow-hidden transition-[max-height,opacity] duration-[400ms] ease-[var(--ease-out-soft)]"
      >
        <p className="pb-6 pr-9 text-body text-text-secondary leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  );
}
