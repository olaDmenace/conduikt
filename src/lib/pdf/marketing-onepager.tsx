// Single-page A4 marketing one-pager (docs/DESIGN.md Direction C). Pitches
// Conduikt to a cold audience; designed to be DM'd or attached over
// WhatsApp/email. No personalisation: every advocate sends the same kit.
//
// Layout:
//   - Ink band with the homepage headline, so the copy matches what people
//     see when they click through.
//   - The four-step loop from the homepage ("Check. Write. Post. Learn.").
//   - Pricing for all four plans, read from src/lib/plans.ts so it can't
//     drift from the product.
//   - One call to action in the accent colour.

import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PDF_BRAND as C, PDF_FONTS as F, registerPdfFonts } from "./brand";
import { BrandMark, s } from "./kit";
import { PLAN_PRICING, getGenerationLimit, getProjectLimit, isUnlimited, type PlanTier } from "../plans";

registerPdfFonts();

const PAD = 40;

const LOOP = [
  { n: "01", job: "Check your website", body: "Reads your site the way Google does and tells you exactly what to fix." },
  { n: "02", job: "Plan what to say", body: "Finds the topics people already search for, so you never start from a blank page." },
  { n: "03", job: "Write it and post it", body: "Blog posts, social posts and emails in your voice. Posted to X and LinkedIn on a schedule." },
  { n: "04", job: "Learn what worked", body: "Views, likes and replies come back in. Next week starts from what worked." },
];

const TIERS: PlanTier[] = ["free", "pro", "growth", "agency"];
const TIER_LABEL: Record<PlanTier, string> = { free: "Free", pro: "Pro", growth: "Growth", agency: "Agency" };
const TIER_EXTRA: Record<PlanTier, string> = {
  free: "Site check and social posts",
  pro: "Posts to X and LinkedIn for you",
  growth: "Campaigns, video ads and split tests",
  agency: "Client reports and team seats",
};

function tierLines(tier: PlanTier): string[] {
  const limit = getGenerationLimit(tier);
  const sites = getProjectLimit(tier);
  return [
    isUnlimited(limit) ? "No monthly limit" : `${limit} pieces a month`,
    isUnlimited(sites) ? "Unlimited websites" : `${sites} website${sites === 1 ? "" : "s"}`,
    TIER_EXTRA[tier],
  ];
}

const mono = (size: number, color: string) => ({
  fontFamily: F.mono,
  fontSize: size,
  letterSpacing: 0.9,
  textTransform: "uppercase" as const,
  color,
});

export function MarketingOnePagerDocument() {
  return (
    <Document title="Conduikt: your marketing, done every week" author="Conduikt">
      <Page size="A4" style={{ backgroundColor: C.ground, fontFamily: F.body, fontSize: 10, color: C.text }}>
        {/* Ink band */}
        <View style={{ backgroundColor: C.ink, paddingHorizontal: PAD, paddingTop: 34, paddingBottom: 34 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 46 }}>
            <BrandMark inverse size={16} />
            <Text style={mono(8, C.inkText3)}>conduikt.com</Text>
          </View>
          <Text style={[mono(8.5, C.inkAccent), { marginBottom: 12 }]}>For founders without a marketing team</Text>
          <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 34, lineHeight: 1.08, letterSpacing: -0.9, color: C.inkText }}>
            Your marketing, done every week.
          </Text>
          <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 34, lineHeight: 1.08, letterSpacing: -0.9, color: C.inkAccent, marginBottom: 14 }}>
            Better every time.
          </Text>
          <Text style={{ fontSize: 11, lineHeight: 1.5, color: C.inkText2, maxWidth: 420 }}>
            Conduikt checks your website, writes your posts and emails, publishes them for you, then watches what worked
            and uses it next week.
          </Text>
        </View>

        <View style={{ paddingHorizontal: PAD, paddingTop: 26 }}>
          {/* Loop */}
          <Text style={s.label}>How it works</Text>
          <Text style={[s.h2, { fontSize: 17, marginBottom: 12 }]}>Check. Write. Post. Learn. Then do it again next week.</Text>
          <View style={{ flexDirection: "row", marginHorizontal: -4, marginBottom: 22 }}>
            {LOOP.map((step) => (
              <View key={step.n} style={{ flex: 1, paddingHorizontal: 4 }}>
                <View style={[s.card, { height: 112, marginBottom: 0, padding: 11 }]}>
                  <Text style={[mono(8, C.accent), { marginBottom: 6 }]}>{step.n}</Text>
                  <Text style={[s.h3, { fontSize: 10, marginBottom: 4 }]}>{step.job}</Text>
                  <Text style={{ fontSize: 8.5, lineHeight: 1.45, color: C.text2 }}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <Text style={s.label}>Pricing</Text>
          <Text style={[s.h2, { fontSize: 17, marginBottom: 12 }]}>Start free. Pay when it&apos;s working for you.</Text>
          <View style={{ flexDirection: "row", marginHorizontal: -4, marginBottom: 22 }}>
            {TIERS.map((tier) => {
              const ink = tier === "pro";
              return (
                <View key={tier} style={{ flex: 1, paddingHorizontal: 4 }}>
                  <View
                    style={[
                      s.card,
                      { height: 138, marginBottom: 0, padding: 11 },
                      ink ? { backgroundColor: C.ink, borderColor: C.ink } : {},
                    ]}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={mono(7.5, ink ? C.inkText3 : C.text3)}>{TIER_LABEL[tier]}</Text>
                      {ink ? <Text style={mono(6.5, C.inkAccent)}>Most picked</Text> : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }}>
                      <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 26, lineHeight: 1, color: ink ? C.inkText : C.text }}>
                        {PLAN_PRICING[tier].label}
                      </Text>
                      <Text style={{ fontSize: 8, color: ink ? C.inkText3 : C.text3, marginLeft: 3, marginBottom: 2 }}>/ month</Text>
                    </View>
                    {tierLines(tier).map((line) => (
                      <View key={line} style={{ flexDirection: "row", marginBottom: 3 }}>
                        <Text style={{ width: 9, fontSize: 8, color: ink ? C.inkTeal : C.teal }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 8, lineHeight: 1.35, color: ink ? C.inkText2 : C.text2 }}>{line}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Call to action */}
          <View style={[s.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, marginBottom: 0 }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 18, color: C.text, marginBottom: 3 }}>
                See what your site needs, free.
              </Text>
              <Text style={s.muted}>Type your address at conduikt.com and get a full check in a few minutes. No card needed.</Text>
            </View>
            <Text
              style={{
                backgroundColor: C.accent,
                color: C.white,
                fontFamily: F.body,
                fontWeight: 500,
                fontSize: 10.5,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
              }}
            >
              Start free at conduikt.com
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View
          style={{
            position: "absolute",
            left: PAD,
            right: PAD,
            bottom: 22,
            flexDirection: "row",
            justifyContent: "space-between",
            borderTopWidth: 1,
            borderTopColor: C.line,
            paddingTop: 8,
          }}
        >
          <Text style={mono(7, C.text3)}>Conduikt · Your marketing, done every week</Text>
          <Text style={mono(7, C.text3)}>hello@conduikt.com</Text>
        </View>
      </Page>
    </Document>
  );
}
