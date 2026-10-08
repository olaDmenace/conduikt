import React from "react";
import { Document, Text, View } from "@react-pdf/renderer";
import { PDF_BRAND as C, PDF_FONTS as F, registerPdfFonts } from "./brand";
import { CoverPage, Label, ReportPage, s } from "./kit";

registerPdfFonts();

// Client marketing report (docs/DESIGN.md Direction C). Ink cover, then
// sand pages with plain bar charts drawn from Views: what was made, the
// weekly pace, and how search keywords are doing. Teal carries the data;
// the (optionally client-supplied) accent only marks section kickers.

interface AgentBreakdown {
  agent: string;
  count: number;
  pct: number;
}

interface GscKeyword {
  term: string;
  clicks: number;
  impressions: number;
  position: number;
}

interface ClientBranding {
  clientName?: string | null;
  clientLogoUrl?: string | null;
  reportAccentColor?: string | null;
  agencyName?: string | null;
}

interface AnalyticsReportProps {
  projectName: string;
  url: string;
  date: string;
  totalGenerations: number;
  totalAssets: number;
  agentBreakdown: AgentBreakdown[];
  gscKeywords: GscKeyword[];
  contentVelocity: { week: string; count: number }[];
  branding?: ClientBranding;
}

const ACCENT_RE = /^#[0-9a-fA-F]{6}$/;

/** A client accent only counts if it's a full six-digit hex colour. */
function resolveAccent(value?: string | null): string {
  return value && ACCENT_RE.test(value.trim()) ? value.trim() : C.accent;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function SectionHead({ kicker, title, note, accent }: { kicker: string; title: string; note?: string; accent: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Label color={accent}>{kicker}</Label>
      <Text style={s.h2}>{title}</Text>
      {note ? <Text style={s.muted}>{note}</Text> : null}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={[s.card, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
      <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 28, lineHeight: 1, color: C.teal }}>{value}</Text>
      <Text style={[s.label, { marginTop: 8, marginBottom: 0 }]}>{label}</Text>
    </View>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <View style={[s.card, { borderStyle: "dashed" }]}>
      <Text style={s.muted}>{children}</Text>
    </View>
  );
}

export function AnalyticsReportDocument({
  projectName,
  url,
  date,
  totalGenerations,
  totalAssets,
  agentBreakdown,
  gscKeywords,
  contentVelocity,
  branding,
}: AnalyticsReportProps) {
  const accent = resolveAccent(branding?.reportAccentColor);
  const subject = branding?.clientName || projectName;
  const preparedBy = branding?.agencyName ? `Prepared by ${branding.agencyName} with Conduikt` : "Made with Conduikt";
  const runTitle = `Marketing report · ${subject}`;

  const maxAgent = Math.max(1, ...agentBreakdown.map((a) => a.count));
  const maxWeek = Math.max(1, ...contentVelocity.map((w) => w.count));
  const keywords = gscKeywords.slice(0, 20);
  const maxClicks = Math.max(1, ...keywords.map((k) => k.clicks));
  const totalClicks = keywords.reduce((n, k) => n + k.clicks, 0);
  const topTen = keywords.filter((k) => k.position > 0 && k.position <= 10).length;

  return (
    <Document title={`Marketing report: ${subject}`} author={branding?.agencyName || "Conduikt"}>
      <CoverPage
        eyebrow="Marketing report"
        title={subject}
        subtitle={url ? `What we made for ${url}, and how it's doing.` : "What we made, and how it's doing."}
        logoUrl={branding?.clientLogoUrl}
        accent={branding?.reportAccentColor && accent !== C.accent ? accent : undefined}
        meta={[
          ["Date", date],
          ["Pieces made", fmt(totalGenerations)],
          ["Saved", fmt(totalAssets)],
          ["Prepared by", branding?.agencyName || "Conduikt"],
        ]}
      />

      <ReportPage title={runTitle} footerNote={preparedBy}>
        <View style={s.section}>
          <SectionHead kicker="At a glance" title="The numbers" accent={accent} />
          <View style={{ flexDirection: "row", marginRight: -8 }}>
            <Stat value={fmt(totalGenerations)} label="Pieces made" />
            <Stat value={fmt(totalAssets)} label="Saved to library" />
            <Stat value={keywords.length > 0 ? fmt(totalClicks) : "–"} label="Search clicks" />
          </View>
        </View>

        <View style={s.section}>
          <View minPresenceAhead={140}>
            <SectionHead kicker="Pace" title="Pieces per week" note="The last eight weeks with activity." accent={accent} />
          </View>
          {contentVelocity.length === 0 ? (
            <Empty>No weekly activity to show yet.</Empty>
          ) : (
            <View style={[s.card, { paddingBottom: 10 }]} wrap={false}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, borderBottomWidth: 1, borderBottomColor: C.lineStrong }}>
                {contentVelocity.map((w) => (
                  <View key={w.week} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 100, paddingHorizontal: 6 }}>
                    <Text style={{ fontFamily: F.mono, fontSize: 8, color: C.text2, marginBottom: 3 }}>{w.count}</Text>
                    <View style={{ width: "100%", height: Math.max(2, (w.count / maxWeek) * 78), backgroundColor: C.teal, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                {contentVelocity.map((w) => (
                  <Text key={w.week} style={{ flex: 1, textAlign: "center", fontFamily: F.mono, fontSize: 7, color: C.text3 }}>
                    {w.week}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={s.section}>
          <View minPresenceAhead={80}>
            <SectionHead kicker="Output" title="What we made" note="Pieces by type, most first." accent={accent} />
          </View>
          {agentBreakdown.length === 0 ? (
            <Empty>Nothing made yet in this project.</Empty>
          ) : (
            <View style={s.card}>
              {agentBreakdown.map((a, i) => (
                <View
                  key={a.agent}
                  wrap={false}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line }}
                >
                  <Text style={{ width: 140, fontSize: 9.5, color: C.text }}>{a.agent}</Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: C.surface2, borderRadius: 2 }}>
                    <View style={{ width: `${(a.count / maxAgent) * 100}%`, height: 8, backgroundColor: C.teal, borderRadius: 2 }} />
                  </View>
                  <Text style={{ width: 40, textAlign: "right", fontFamily: F.mono, fontSize: 8.5, color: C.text }}>{fmt(a.count)}</Text>
                  <Text style={{ width: 36, textAlign: "right", fontFamily: F.mono, fontSize: 8.5, color: C.text3 }}>{`${a.pct}%`}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={s.section} break={keywords.length > 0}>
          <SectionHead
            kicker="Search"
            title="Keywords people found you with"
            note={
              keywords.length > 0
                ? `From Google Search Console. ${topTen} of ${keywords.length} sit on page one (position 10 or better).`
                : undefined
            }
            accent={accent}
          />
          {keywords.length === 0 ? (
            <Empty>Connect Google Search Console to see which searches bring people to the site.</Empty>
          ) : (
            <View style={[s.card, { padding: 0 }]}>
              <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Text style={[s.label, { marginBottom: 0, flex: 1 }]}>Keyword</Text>
                <Text style={[s.label, { marginBottom: 0, width: 130 }]}>Clicks</Text>
                <Text style={[s.label, { marginBottom: 0, width: 70, textAlign: "right" }]}>Shown</Text>
                <Text style={[s.label, { marginBottom: 0, width: 60, textAlign: "right" }]}>Position</Text>
              </View>
              {keywords.map((k, i) => {
                const onPageOne = k.position > 0 && k.position <= 10;
                return (
                  <View
                    key={`${k.term}-${i}`}
                    wrap={false}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line }}
                  >
                    <Text style={{ flex: 1, fontSize: 9.5, color: C.text, paddingRight: 8 }}>{k.term}</Text>
                    <View style={{ width: 130, flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 80, height: 6, backgroundColor: C.surface2, borderRadius: 2, marginRight: 8 }}>
                        <View style={{ width: `${(k.clicks / maxClicks) * 100}%`, height: 6, backgroundColor: C.teal, borderRadius: 2 }} />
                      </View>
                      <Text style={{ fontFamily: F.mono, fontSize: 8.5, color: C.text }}>{fmt(k.clicks)}</Text>
                    </View>
                    <Text style={{ width: 70, textAlign: "right", fontFamily: F.mono, fontSize: 8.5, color: C.text2 }}>{fmt(k.impressions)}</Text>
                    <Text style={{ width: 60, textAlign: "right", fontFamily: F.mono, fontSize: 8.5, color: onPageOne ? C.teal : accent }}>
                      {k.position > 0 ? k.position.toFixed(1) : "–"}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {keywords.length > 0 ? (
            <Text style={[s.muted, { marginTop: 6, fontSize: 8 }]}>
              Position is the average spot in Google results. Teal means page one; the rest are worth pushing up.
            </Text>
          ) : null}
        </View>
      </ReportPage>
    </Document>
  );
}
