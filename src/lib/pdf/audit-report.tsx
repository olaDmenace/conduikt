import React from "react";
import { Document, Text, View } from "@react-pdf/renderer";
import { PDF_BRAND as C, PDF_FONTS as F, registerPdfFonts } from "./brand";
import { CoverPage, Label, ReportPage, ScoreBlock, s } from "./kit";

registerPdfFonts();

// Site audit report (docs/DESIGN.md Direction C). Ink cover with the score,
// then sand pages: a summary, the fixes to make first, then every finding
// grouped by how serious it is. Agencies can swap in a client logo, name
// and accent colour.

interface Finding {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  fix: string;
  impact: "high" | "medium" | "low";
}

interface ClientBranding {
  clientName?: string | null;
  clientLogoUrl?: string | null;
  reportAccentColor?: string | null;
  agencyName?: string | null;
}

interface AuditReportProps {
  projectName: string;
  url: string;
  date: string;
  score: number;
  findings: Finding[];
  branding?: ClientBranding;
}

const ACCENT_RE = /^#[0-9a-fA-F]{6}$/;

/** A client accent only counts if it's a full six-digit hex colour. */
function resolveAccent(value?: string | null): string {
  return value && ACCENT_RE.test(value.trim()) ? value.trim() : C.accent;
}

const SEVERITY = {
  critical: { title: "Broken", blurb: "These stop pages from ranking or loading properly. Fix them first." },
  warning: { title: "Needs work", blurb: "These hold the site back. Worth fixing in the next few weeks." },
  info: { title: "Good to know", blurb: "Small improvements. Pick these up when you have time." },
} as const;

function severityColor(sev: Finding["severity"], accent: string): string {
  if (sev === "critical") return C.error;
  if (sev === "warning") return accent;
  return C.text3;
}

function scoreVerdict(score: number): string {
  if (score >= 80) return "In good shape. A few things to tidy up.";
  if (score >= 50) return "Solid base, but some issues are costing you traffic.";
  return "Several problems are holding this site back.";
}

/** Small mono tag. `color` sets the text and border; fill stays the card colour. */
function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <Text style={[s.chip, { color, borderWidth: 1, borderColor: color, marginRight: 6, lineHeight: 1.2 }]}>{children}</Text>
  );
}

function SectionHead({ kicker, title, accent }: { kicker: string; title: string; accent: string }) {
  return (
    <View style={{ marginBottom: 12 }} minPresenceAhead={80}>
      <Label color={accent}>{kicker}</Label>
      <Text style={s.h2}>{title}</Text>
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[s.card, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
      <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 30, lineHeight: 1, color }}>{value}</Text>
      <Text style={[s.label, { marginTop: 8, marginBottom: 0 }]}>{label}</Text>
    </View>
  );
}

function FindingCard({ finding, accent }: { finding: Finding; accent: string }) {
  const color = severityColor(finding.severity, accent);
  return (
    <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: color }]} wrap={false}>
      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        <Tag color={C.text2}>{finding.category}</Tag>
        <Tag color={finding.impact === "high" ? color : C.text3}>{`${finding.impact} impact`}</Tag>
      </View>
      <Text style={s.h3}>{finding.title}</Text>
      {finding.detail ? <Text style={[s.muted, { marginBottom: 6 }]}>{finding.detail}</Text> : null}
      {finding.fix ? (
        <View style={{ backgroundColor: C.ground, borderRadius: 4, padding: 8, marginTop: 2 }}>
          <Text style={[s.label, { marginBottom: 3 }]}>How to fix</Text>
          <Text style={s.body}>{finding.fix}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function AuditReportDocument({ projectName, url, date, score, findings, branding }: AuditReportProps) {
  const accent = resolveAccent(branding?.reportAccentColor);
  const subject = branding?.clientName || projectName;
  const preparedBy = branding?.agencyName ? `Prepared by ${branding.agencyName} with Conduikt` : "Made with Conduikt";
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));

  const groups = (["critical", "warning", "info"] as const).map((sev) => ({
    sev,
    items: findings.filter((f) => f.severity === sev),
  }));
  const [critical, warnings, info] = groups.map((g) => g.items);

  // Fix these first: everything broken, then high-impact warnings. Max 5.
  const firstFixes = [...critical, ...warnings.filter((f) => f.impact === "high")].slice(0, 5);

  // Findings per area, for the bar rows.
  const byArea = Object.entries(
    findings.reduce<Record<string, number>>((acc, f) => {
      const k = f.category || "Other";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxArea = byArea[0]?.[1] ?? 1;

  const runTitle = `Site audit · ${subject}`;

  return (
    <Document title={`Site audit: ${subject}`} author={branding?.agencyName || "Conduikt"}>
      <CoverPage
        eyebrow="Site audit"
        title={subject}
        subtitle={url || undefined}
        logoUrl={branding?.clientLogoUrl}
        accent={branding?.reportAccentColor && accent !== C.accent ? accent : undefined}
        meta={[
          ["Date", date],
          ["Findings", `${findings.length}`],
          ["Broken", `${critical.length}`],
          ["Prepared by", branding?.agencyName || "Conduikt"],
        ]}
      >
        <ScoreBlock score={safeScore} label="Overall score" inverse />
        <Text style={{ fontSize: 11, color: C.inkText2, marginTop: 14, maxWidth: 360 }}>{scoreVerdict(safeScore)}</Text>
      </CoverPage>

      <ReportPage title={runTitle} footerNote={preparedBy}>
        <View style={s.section}>
          <SectionHead kicker="Summary" title="What we found" accent={accent} />
          <Text style={[s.body, { marginBottom: 14, maxWidth: 440 }]}>
            {findings.length === 0
              ? `We checked ${url || subject} and found nothing to fix. Nice work.`
              : `We checked ${url || subject} and found ${findings.length} thing${findings.length === 1 ? "" : "s"} to look at. ${
                  critical.length > 0
                    ? `Start with the ${critical.length} broken item${critical.length === 1 ? "" : "s"}.`
                    : "Nothing is broken, so start with the high-impact items."
                }`}
          </Text>
          <View style={{ flexDirection: "row", marginRight: -8 }}>
            <Stat value={critical.length} label="Broken" color={critical.length > 0 ? C.error : C.teal} />
            <Stat value={warnings.length} label="Needs work" color={warnings.length > 0 ? accent : C.teal} />
            <Stat value={info.length} label="Good to know" color={C.text} />
          </View>
        </View>

        {byArea.length > 0 ? (
          <View style={s.section} wrap={false}>
            <Label>Findings by area</Label>
            {byArea.map(([area, n]) => (
              <View key={area} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ width: 130, fontSize: 9, color: C.text }}>{area}</Text>
                <View style={{ flex: 1, height: 6, backgroundColor: C.surface2, borderRadius: 3 }}>
                  <View style={{ width: `${(n / maxArea) * 100}%`, height: 6, backgroundColor: C.teal, borderRadius: 3 }} />
                </View>
                <Text style={{ width: 28, textAlign: "right", fontFamily: F.mono, fontSize: 8, color: C.text2 }}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {firstFixes.length > 0 ? (
          <View style={s.section}>
            <SectionHead kicker="Start here" title="Fix these first" accent={accent} />
            {firstFixes.map((f, i) => (
              <View key={i} style={[s.card, { flexDirection: "row", paddingVertical: 10 }]} wrap={false}>
                <Text style={{ width: 22, fontFamily: F.mono, fontSize: 10, color: severityColor(f.severity, accent) }}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.h3, { marginBottom: 2 }]}>{f.title}</Text>
                  <Text style={s.muted}>{f.fix || f.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {groups
          .filter((g) => g.items.length > 0)
          .map((g, gi) => (
            <View key={g.sev} style={s.section} break={gi === 0}>
              <View minPresenceAhead={120}>
                <Label color={severityColor(g.sev, accent)}>{`${g.items.length} item${g.items.length === 1 ? "" : "s"}`}</Label>
                <Text style={s.h2}>{SEVERITY[g.sev].title}</Text>
                <Text style={[s.muted, { marginBottom: 12 }]}>{SEVERITY[g.sev].blurb}</Text>
              </View>
              {g.items.map((f, i) => (
                <FindingCard key={i} finding={f} accent={accent} />
              ))}
            </View>
          ))}
      </ReportPage>
    </Document>
  );
}
