"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
      {tiers.map((tier, i) => (
        <PricingCard
          key={tier.name}
          tier={tier}
          index={i}
          expanded={expanded}
          onToggle={() => setExpanded((p) => !p)}
        />
      ))}
    </div>
  );
}

interface PricingCardProps {
  tier: PricingTier;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

function PricingCard({ tier, index, expanded, onToggle }: PricingCardProps) {
  const detailsId = useId();
  const hasExtras = (tier.extraFeatures?.length ?? 0) > 0;

  return (
    <Card
      className={`animate-in relative h-full transition-transform duration-300 ease-out ${
        tier.popular
          ? "border-accent shadow-[0_0_40px_var(--accent-glow)] lg:-translate-y-2"
          : ""
      }`}
      // Slightly longer per-card stagger (90ms) gives the entrance more
      // air than the previous 60ms — reads as "introduced one at a
      // time" rather than a fast slab.
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          {/* Solid pill — the default `<Badge>` uses a translucent
              accent-muted bg which read as "washed out" on the card.
              Solid orange + white text gives the pill the visual weight
              the spec calls for ("Most Popular pill positioned on its
              top edge"). Small shadow for lift. */}
          <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-caption font-semibold uppercase tracking-wide text-on-accent shadow-[0_4px_12px_var(--accent-glow)]">
            Most Popular
          </span>
        </div>
      )}
      {/* Internal flex column so the CTA stays anchored to the bottom
          regardless of how many bullets each tier has. h-full on the
          Card + this flex layout = uniform card heights across the row. */}
      <CardContent className="pt-7 flex flex-col h-full">
        <h3 className="text-h3 text-text-primary">{tier.name}</h3>
        <div className="mt-3 mb-6 flex items-baseline gap-1">
          <span
            className="text-4xl font-bold text-text-primary"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
            }}
          >
            {tier.price}
          </span>
          <span className="text-text-tertiary text-small">
            {tier.period ?? "/mo"}
          </span>
        </div>
        <ul className="space-y-2 text-small text-text-secondary list-none">
          {tier.features.map((feature) => (
            <li key={feature} className="leading-snug">
              {feature}
            </li>
          ))}
        </ul>
        {hasExtras && (
          <>
            <div
              id={detailsId}
              className={`overflow-hidden transition-all ease-out ${
                expanded
                  ? "max-h-[32rem] opacity-100 mt-2 duration-500"
                  : "max-h-0 opacity-0 duration-300"
              }`}
              aria-hidden={!expanded}
            >
              <ul className="space-y-2 text-small text-text-secondary list-none pt-1">
                {tier.extraFeatures!.map((feature) => (
                  <li key={feature} className="leading-snug">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={detailsId}
              className="mt-3 inline-flex items-center gap-1 self-start text-caption font-medium text-accent hover:text-accent-hover transition-colors duration-200"
            >
              {expanded ? "Show fewer features" : "Show all features"}
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-300 ease-out ${
                  expanded ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
          </>
        )}
        {/* mt-auto pushes the CTA to the bottom of the flex column,
            keeping it baseline-aligned with sibling cards even when one
            tier has more bullets than another. */}
        <div className="mt-auto pt-6">
          <Button
            variant={tier.popular ? "primary" : "secondary"}
            className="w-full"
            asChild
          >
            <Link href={tier.ctaHref ?? "/signup"}>{tier.cta}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
