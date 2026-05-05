// Single-page A4 marketing one-pager. Pitches Conduikt to a cold audience,
// designed to be DM'd or attached over WhatsApp/email. No personalisation —
// the same kit goes out to every advocate.
//
// Layout decisions:
//   - One A4 page, portrait. Anything taller is hard to skim on a phone.
//   - Hero with the brand mark + the existing homepage headline. Keeps
//     copy aligned with what visitors see when they click through.
//   - Six features as compact 3×2 grid. Mirrors the homepage feature grid
//     so the kit doesn't surprise anyone who lands on the site.
//   - Pricing strip with all four tiers visible — answers the first
//     question every founder asks ("how much?").
//   - A swatch row at the bottom showing the primary + secondary brand
//     colours, satisfying the "show primary + secondary" brief while
//     doubling as a wordless brand signature.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PDF_BRAND as B } from "./brand";

const s = StyleSheet.create({
  page: {
    backgroundColor: B.surface0,
    padding: 40,
    fontFamily: "Helvetica",
    color: B.textPrimary,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  brandMark: {
    width: 36,
    height: 36,
    backgroundColor: B.accent,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandLetter: {
    color: B.surface0,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  brandName: {
    color: B.textPrimary,
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.3,
  },
  brandTag: {
    color: B.textTertiary,
    fontSize: 9,
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: B.surface2,
    paddingTop: 2,
    paddingBottom: 2,
  },
  // Hero
  hero: {
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 8,
    color: B.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  headline: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: B.textPrimary,
    lineHeight: 1.18,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  headlineAccent: {
    color: B.accent,
  },
  subhead: {
    fontSize: 11,
    color: B.textSecondary,
    lineHeight: 1.55,
    maxWidth: "92%",
  },
  // Problem block
  problem: {
    backgroundColor: B.surface1,
    borderLeftWidth: 3,
    borderLeftColor: B.accentSecondary,
    borderRadius: 4,
    padding: 12,
    marginBottom: 22,
  },
  problemText: {
    fontSize: 10,
    color: B.textSecondary,
    lineHeight: 1.5,
  },
  // Section title
  sectionLabel: {
    fontSize: 8,
    color: B.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  // Feature grid (3 col x 2 row)
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 22,
    marginHorizontal: -4,
  },
  featureCell: {
    width: "33.333%",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  featureCard: {
    backgroundColor: B.surface1,
    borderRadius: 6,
    padding: 10,
    height: 78,
    borderTopWidth: 2,
    borderTopColor: B.accent,
  },
  featureNum: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: B.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: B.textPrimary,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  featureBody: {
    fontSize: 8.5,
    color: B.textSecondary,
    lineHeight: 1.4,
  },
  // Pricing strip
  pricingStrip: {
    flexDirection: "row",
    marginBottom: 22,
    marginHorizontal: -3,
  },
  pricingCol: {
    flex: 1,
    paddingHorizontal: 3,
  },
  pricingCard: {
    backgroundColor: B.surface1,
    borderRadius: 6,
    padding: 10,
    height: 78,
    borderWidth: 1,
    borderColor: B.surface2,
  },
  pricingCardFeatured: {
    backgroundColor: B.surface2,
    borderColor: B.accent,
    borderWidth: 1,
  },
  pricingTier: {
    fontSize: 9,
    color: B.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  pricingTierFeatured: {
    color: B.accent,
  },
  pricingPrice: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: B.textPrimary,
    marginBottom: 2,
  },
  pricingPer: {
    fontSize: 8,
    color: B.textTertiary,
    marginBottom: 4,
  },
  pricingNote: {
    fontSize: 7.5,
    color: B.textSecondary,
    lineHeight: 1.3,
  },
  // CTA strip
  cta: {
    backgroundColor: B.accentDark,
    borderRadius: 6,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  ctaTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: B.textPrimary,
    marginBottom: 2,
  },
  ctaSub: {
    fontSize: 9.5,
    color: B.cream,
  },
  ctaBadge: {
    backgroundColor: B.accent,
    color: B.surface0,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  // Brand swatch row (the "show primary + secondary" requirement)
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  swatchLabel: {
    fontSize: 7,
    color: B.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    width: 80,
  },
  swatch: {
    width: 36,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  swatchHex: {
    fontSize: 7.5,
    color: B.textTertiary,
    fontFamily: "Courier-Bold",
    marginRight: 14,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7.5,
    color: B.textTertiary,
  },
});

interface FeatureItem {
  num: string;
  title: string;
  body: string;
}

const FEATURES: FeatureItem[] = [
  { num: "01", title: "AI SEO Audits", body: "Surface what's broken in your site in minutes — not in a 60-page report nobody reads." },
  { num: "02", title: "AI Content Generator", body: "Copy, emails, social posts, ad variants. One prompt, every channel." },
  { num: "03", title: "Multi-Channel Publishing", body: "Schedule once to X, LinkedIn, email, and your blog from a single dashboard." },
  { num: "04", title: "Marketing Analytics", body: "Track what's working over time. Conduikt learns and improves your output." },
  { num: "05", title: "AI Email Marketing", body: "Drip sequences and broadcasts wired up to your audiences out of the box." },
  { num: "06", title: "Campaign Builder", body: "Multi-step automations that turn one idea into a full marketing motion." },
];

interface PricingTier {
  tier: string;
  price: string;
  note: string;
  featured?: boolean;
}

const PRICING: PricingTier[] = [
  { tier: "Free", price: "$0", note: "5 free AI generations / month" },
  { tier: "Pro", price: "$49", note: "Unlimited generations, 1 channel", featured: true },
  { tier: "Growth", price: "$99", note: "All channels, advanced analytics" },
  { tier: "Agency", price: "$249", note: "Unlimited clients, white-label" },
];

export function MarketingOnePagerDocument() {
  return (
    <Document title="Conduikt — AI Marketing Automation" author="Conduikt">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.brandMark}>
            <Text style={s.brandLetter}>C</Text>
          </View>
          <Text style={s.brandName}>Conduikt</Text>
          <Text style={s.brandTag}>conduikt.com</Text>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.eyebrow}>Now in beta · No credit card required</Text>
          <Text style={s.headline}>
            AI Marketing Automation{"\n"}for{" "}
            <Text style={s.headlineAccent}>SaaS Founders</Text>
          </Text>
          <Text style={s.subhead}>
            Generate, schedule, and ship marketing content across X, LinkedIn,
            email, and your website — all from one dashboard. Built by a SaaS
            founder for SaaS founders who can&apos;t afford a marketing team.
          </Text>
        </View>

        {/* Problem */}
        <View style={s.problem}>
          <Text style={s.problemText}>
            Marketing eats time you don&apos;t have. Conduikt automates SEO
            audits, content generation, multi-channel publishing, and
            analytics — so you can stay in your codebase and still ship a
            marketing motion that works.
          </Text>
        </View>

        {/* Features */}
        <Text style={s.sectionLabel}>What&apos;s inside</Text>
        <View style={s.featureGrid}>
          {FEATURES.map((f) => (
            <View key={f.num} style={s.featureCell}>
              <View style={s.featureCard}>
                <Text style={s.featureNum}>{f.num}</Text>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <Text style={s.sectionLabel}>Pricing</Text>
        <View style={s.pricingStrip}>
          {PRICING.map((p) => (
            <View key={p.tier} style={s.pricingCol}>
              <View
                style={
                  p.featured
                    ? [s.pricingCard, s.pricingCardFeatured]
                    : s.pricingCard
                }
              >
                <Text
                  style={
                    p.featured
                      ? [s.pricingTier, s.pricingTierFeatured]
                      : s.pricingTier
                  }
                >
                  {p.featured ? "Most Popular · " : ""}
                  {p.tier}
                </Text>
                <Text style={s.pricingPrice}>{p.price}</Text>
                <Text style={s.pricingPer}>per month</Text>
                <Text style={s.pricingNote}>{p.note}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={s.cta}>
          <View>
            <Text style={s.ctaTitle}>Start free at conduikt.com</Text>
            <Text style={s.ctaSub}>
              5 AI generations a month — no card, no hassle.
            </Text>
          </View>
          <Text style={s.ctaBadge}>Get Started →</Text>
        </View>

        {/* Brand swatch row */}
        <View style={s.swatchRow}>
          <Text style={s.swatchLabel}>Primary</Text>
          <View style={[s.swatch, { backgroundColor: B.accent }]} />
          <Text style={s.swatchHex}>{B.accent}</Text>
          <View style={[s.swatch, { backgroundColor: B.accentDark }]} />
          <Text style={s.swatchHex}>{B.accentDark}</Text>
        </View>
        <View style={s.swatchRow}>
          <Text style={s.swatchLabel}>Secondary</Text>
          <View style={[s.swatch, { backgroundColor: B.accentSecondary }]} />
          <Text style={s.swatchHex}>{B.accentSecondary}</Text>
          <View style={[s.swatch, { backgroundColor: B.cream }]} />
          <Text style={s.swatchHex}>{B.cream}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Conduikt · AI Marketing Automation for SaaS Founders
          </Text>
          <Text style={s.footerText}>conduikt.com</Text>
        </View>
      </Page>
    </Document>
  );
}
