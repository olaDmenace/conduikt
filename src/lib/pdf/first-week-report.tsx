import React from "react";
import { Document, Text, View } from "@react-pdf/renderer";
import { PDF_BRAND as C, PDF_FONTS as F, registerPdfFonts } from "./brand";
import { Bullets, Chip, CoverPage, Label, OutputView, ReportPage, ScoreBlock, s } from "./kit";

// "Check my site" report: the quick audit (score, fixes, how you sound,
// three posts) and, when the first-week pack ran, every agent's work —
// finished outputs in full, locked agents as their preview.

registerPdfFonts();

export interface QuickAudit {
  seoScore: number;
  seoGrade?: string;
  topIssues: string[];
  brandVoice: { tone: string; audience: string; valueProposition: string };
  sampleLinkedInPosts: Array<{ angle: string; text: string }>;
}

export interface ReportAgent {
  name: string;
  job: string;
  state: "done" | "failed" | "locked" | "queued" | "running";
  tier?: string;
  output?: unknown;
  preview?: { headline: string; items: string[] } | null;
}

export function FirstWeekReportDocument({
  host,
  date,
  audit,
  agents = [],
}: {
  host: string;
  date: string;
  audit: QuickAudit | null;
  agents?: ReportAgent[];
}) {
  const done = agents.filter((a) => a.state === "done");
  const locked = agents.filter((a) => a.state === "locked");
  const pending = agents.filter((a) => a.state === "queued" || a.state === "running" || a.state === "failed");
  const title = `Report for ${host}`;

  return (
    <Document title={`Conduikt — ${host}`} author="Conduikt" subject="Site check and first week">
      <CoverPage
        eyebrow={agents.length ? "Site check · first week" : "Site check"}
        title={host}
        subtitle={
          audit?.brandVoice.valueProposition && audit.brandVoice.valueProposition !== "unclear"
            ? audit.brandVoice.valueProposition
            : "What we found on your site, and what your agents made from it."
        }
        meta={[
          ["Prepared", date],
          ["Site score", audit ? `${audit.seoScore} / 100` : "Not checked"],
          ["Agents", agents.length ? `${done.length} finished${locked.length ? ` · ${locked.length} previewed` : ""}` : "Audit only"],
        ]}
      >
        {audit ? <ScoreBlock score={audit.seoScore} label="Site score" inverse /> : null}
      </CoverPage>

      {audit ? (
        <ReportPage title={title}>
          <View style={s.section}>
            <Label>The site check</Label>
            <Text style={s.h1}>What we found</Text>
            <View style={[s.row, { marginBottom: 14 }]}>
              <View style={{ marginRight: 8 }}>
                <Chip tone={audit.seoScore >= 80 ? "good" : "warn"}>{`Score ${audit.seoScore} / 100`}</Chip>
              </View>
              {audit.seoGrade ? <Chip>{`Grade ${audit.seoGrade}`}</Chip> : null}
            </View>
            {audit.topIssues.length > 0 ? (
              <View style={s.card}>
                <Text style={s.h3}>Fix these first</Text>
                <Bullets items={audit.topIssues} numbered />
              </View>
            ) : null}
          </View>

          <View style={s.section} wrap={false}>
            <Label>How you sound</Label>
            <View style={s.card}>
              {(
                [
                  ["Tone", audit.brandVoice.tone],
                  ["Who it's for", audit.brandVoice.audience],
                  ["What you promise", audit.brandVoice.valueProposition],
                ] as const
              ).map(([k, v]) => (
                <View key={k} style={{ marginBottom: 8 }}>
                  <Text style={[s.label, { marginBottom: 2 }]}>{k}</Text>
                  <Text style={s.body}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {audit.sampleLinkedInPosts.length > 0 ? (
            <View style={s.section}>
              <Label>Three posts in your voice</Label>
              {audit.sampleLinkedInPosts.map((p, i) => (
                <View key={i} style={s.card} wrap={false}>
                  <Text style={{ fontFamily: F.mono, fontSize: 7.5, color: C.accent, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                    {`${i + 1} · ${p.angle}`}
                  </Text>
                  <Text style={s.body}>{p.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ReportPage>
      ) : null}

      {done.map((a) => (
        <ReportPage key={a.name} title={title}>
          <Label color={C.teal}>Agent · finished</Label>
          <Text style={s.h1}>{a.name}</Text>
          <Text style={[s.muted, { marginBottom: 16 }]}>{a.job}</Text>
          <OutputView output={a.output} />
        </ReportPage>
      ))}

      {locked.length > 0 || pending.length > 0 ? (
        <ReportPage title={title}>
          {locked.length > 0 ? (
            <View style={s.section}>
              <Label>Not on your plan yet</Label>
              <Text style={s.h2}>A preview from each</Text>
              <Text style={[s.muted, { marginBottom: 12 }]}>Upgrade and these run in full on your site.</Text>
              {locked.map((a) => (
                <View key={a.name} style={s.card} wrap={false}>
                  <View style={[s.row, { justifyContent: "space-between", marginBottom: 4 }]}>
                    <Text style={s.h3}>{a.name}</Text>
                    {a.tier ? <Chip tone="ink">{a.tier}</Chip> : null}
                  </View>
                  {a.preview ? (
                    <>
                      <Text style={[s.body, { marginBottom: 4 }]}>{a.preview.headline}</Text>
                      {a.preview.items.length ? <Bullets items={a.preview.items} /> : null}
                    </>
                  ) : (
                    <Text style={s.muted}>{a.job}</Text>
                  )}
                </View>
              ))}
            </View>
          ) : null}
          {pending.length > 0 ? (
            <View style={s.section}>
              <Label>Still working when this was downloaded</Label>
              <Bullets items={pending.map((a) => `${a.name}: ${a.state === "failed" ? "didn't finish, try again in the app" : "still running"}`)} />
            </View>
          ) : null}
        </ReportPage>
      ) : null}
    </Document>
  );
}
