"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils/cn";

export interface PricingTier {
  name: string;
  price: string;
  // Suffix shown after the price. Defaults to "/mo" (homepage compact
  // form) but the dedicated /pricing page passes "/forever" for Free
  // and "/per month" for paid tiers.
  period?: string;
  features: string[];
  // Optional second-tier feature list. Hidden behind the "Show all
  // features" toggle. Pass undefined or empty on pages that want the
  // full list shown by default (e.g. /pricing).
  extraFeatures?: string[];
  cta: string;
  popular: boolean;
  // Optional override for the CTA destination. Defaults to /signup.
  ctaHref?: string;
}

// Pricing grid wraps the cards so a single "Show all features" click on
// any card expands ALL cards in sync. Keeps the four cards equal height
// at every state so users can scan across tiers without the grid
// jumping. State lives at the grid level (not per-card) for that
// reason. Each card still renders its own toggle button for a familiar
// per-card UX, but they all flip the same flag.
export function PricingGrid({ tiers }: { tiers: PricingTier[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
      {tiers.map((tier, i) => (
        <PricingCard
          key={tier.name}
          tier={tier}
          index={i}
          expanded={expanded}
          onToggle={() => setExpanded((p) => !p)}
        />
      ))}
    </ul>
  );
}

interface PricingCardProps {
  tier: PricingTier;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

// docs/DESIGN.md §Pricing — the popular tier is the one ink card in a row
// of flat sand cards (same treatment as the homepage pricing band).
function PricingCard({ tier, index, expanded, onToggle }: PricingCardProps) {
  const detailsId = useId();
  const hasExtras = (tier.extraFeatures?.length ?? 0) > 0;
  const ink = tier.popular;

  return (
    <li
      className={cn(
        "hover-card animate-in flex h-full flex-col gap-4 rounded-lg border p-7",
        ink ? "hover-card-ink band-ink border-ink" : "hover-card-quiet border-line bg-surface"
      )}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <p className={cn("text-label", ink ? "text-ink-accent" : "text-text-3")}>
        {tier.name}
        {ink && " · most popular"}
      </p>
      <p className={cn("text-numeric text-[3.5rem]", ink ? "text-ink-text" : "text-text")}>
        {tier.price}
        <span className={cn("ml-1 font-sans text-[15px] tracking-normal", ink ? "text-ink-text-3" : "text-text-3")}>
          {tier.period ?? "/mo"}
        </span>
      </p>
      <ul className={cn("flex list-none flex-col gap-2 text-sm leading-snug", ink ? "text-ink-text-2" : "text-text-2")}>
        {tier.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {hasExtras && (
        <>
          <div
            id={detailsId}
            className={cn(
              "overflow-hidden transition-all ease-out",
              expanded ? "max-h-[32rem] opacity-100 duration-500" : "-mt-4 max-h-0 opacity-0 duration-300"
            )}
            aria-hidden={!expanded}
          >
            <ul className={cn("flex list-none flex-col gap-2 text-sm leading-snug", ink ? "text-ink-text-2" : "text-text-2")}>
              {tier.extraFeatures!.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className={cn(
              "hover-link inline-flex items-center gap-1 self-start text-caption font-medium",
              ink ? "text-ink-accent hover:text-ink-text" : "text-accent-hover hover:text-accent"
            )}
          >
            {expanded ? "Show fewer features" : "Show all features"}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-[var(--duration-base)]",
                expanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        </>
      )}
      {/* mt-auto pushes the CTA to the bottom of the flex column,
          keeping it baseline-aligned with sibling cards even when one
          tier has more bullets than another. */}
      <Button
        variant={ink ? "primary" : "outline"}
        size="lg"
        className="mt-auto w-full"
        asChild
      >
        <Link href={tier.ctaHref ?? "/signup"}>{tier.cta}</Link>
      </Button>
    </li>
  );
}
