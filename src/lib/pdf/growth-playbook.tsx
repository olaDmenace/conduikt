import React from "react";
import { Document, Text, View } from "@react-pdf/renderer";
import { PDF_BRAND as C, PDF_FONTS as F, registerPdfFonts } from "./brand";
import { Bullets, Chip, CoverPage, Label, ReportPage, s } from "./kit";

registerPdfFonts();

// Growth playbook export (docs/DESIGN.md Direction C). Ink cover, the short
// version and a plan-at-a-glance bar chart, then one section per phase and
// the growth levers. Priority: critical reads as "do now" (accent), high as
// "next", medium as "later" (neutral).

interface PlaybookAction {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium";
  effort: string;
  impact: string;
  description: string;
  conduikt_tool?: string;
  success_metric?: string;
}

interface PlaybookPhase {
  phase: number;
  name: string;
  timeline: string;
  theme: string;
  actions: PlaybookAction[];
  phase_kpi: string;
}

interface GrowthLever {
  lever: string;
  current_state: string;
  target_state: string;
  key_actions?: string[];
}

interface GrowthPlaybookData {
  title?: string;
  executive_summary?: string;
  phases?: PlaybookPhase[];
  growth_levers?: GrowthLever[];
}

const PRIORITY = {
  critical: { label: "Do now", color: C.accent, tone: "warn" as const },
  high: { label: "Next", color: C.teal, tone: "good" as const },
  medium: { label: "Later", color: C.text3, tone: "neutral" as const },
};

function priorityOf(p: string) {
  return PRIORITY[p as keyof typeof PRIORITY] ?? PRIORITY.medium;
}

function ActionCard({ action }: { action: PlaybookAction }) {
  const p = priorityOf(action.priority);
  return (
    <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: p.color }]} wrap={false}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
        <View style={{ marginRight: 4, marginBottom: 2 }}>
          <Chip tone={p.tone}>{p.label}</Chip>
        </View>
        {action.category ? (
          <View style={{ marginRight: 4, marginBottom: 2 }}>
            <Chip>{action.category}</Chip>
          </View>
        ) : null}
        {action.conduikt_tool ? (
          <View style={{ marginRight: 4, marginBottom: 2 }}>
            <Chip tone="ink">{action.conduikt_tool}</Chip>
          </View>
        ) : null}
      </View>
      <Text style={s.h3}>{action.title}</Text>
      {action.description ? <Text style={[s.muted, { marginBottom: 8 }]}>{action.description}</Text> : null}
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 }}>
        {action.effort ? (
          <View style={{ width: 110, paddingRight: 8 }}>
            <Text style={[s.label, { marginBottom: 1 }]}>Effort</Text>
            <Text style={{ fontSize: 9, color: C.text }}>{action.effort}</Text>
          </View>
        ) : null}
        {action.impact ? (
          <View style={{ width: 110, paddingRight: 8 }}>
            <Text style={[s.label, { marginBottom: 1 }]}>Impact</Text>
            <Text style={{ fontSize: 9, color: C.teal }}>{action.impact}</Text>
          </View>
        ) : null}
        {action.success_metric ? (
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { marginBottom: 1 }]}>How you&apos;ll know</Text>
            <Text style={{ fontSize: 9, color: C.text }}>{action.success_metric}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function GrowthPlaybookDocument({ projectName, date, data }: { projectName: string; date: string; data: GrowthPlaybookData }) {
  const phases = data.phases ?? [];
  const levers = data.growth_levers ?? [];
  const totalActions = phases.reduce((n, ph) => n + (ph.actions?.length ?? 0), 0);
  const maxActions = Math.max(1, ...phases.map((ph) => ph.actions?.length ?? 0));
  const title = data.title || "90-day growth plan";
  const runTitle = `Growth playbook · ${projectName}`;

  return (
    <Document title={title} author="Conduikt">
      <CoverPage
        eyebrow="Growth playbook"
        title={title}
        subtitle={`A step-by-step plan for ${projectName}.`}
        meta={[
          ["Project", projectName],
          ["Date", date],
          ["Phases", `${phases.length}`],
          ["Actions", `${totalActions}`],
        ]}
      />

      <ReportPage title={runTitle}>
        {data.executive_summary ? (
          <View style={s.section}>
            <Label color={C.accent}>The short version</Label>
            <Text style={s.h2}>Where to focus</Text>
            <Text style={[s.body, { lineHeight: 1.65, maxWidth: 460 }]}>{data.executive_summary}</Text>
          </View>
        ) : null}

        {phases.length > 0 ? (
          <View style={s.section} wrap={false}>
            <Label color={C.accent}>At a glance</Label>
            <Text style={[s.h2, { marginBottom: 4 }]}>The plan by phase</Text>
            <Text style={[s.muted, { marginBottom: 10 }]}>Actions in each phase, split by when to do them.</Text>
            <View style={s.card}>
              {phases.map((ph, i) => {
                const acts = ph.actions ?? [];
                const counts = (["critical", "high", "medium"] as const).map((k) => acts.filter((a) => priorityOf(a.priority) === PRIORITY[k]).length);
                return (
                  <View
                    key={ph.phase}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line }}
                  >
                    <View style={{ width: 150, paddingRight: 8 }}>
                      <Text style={{ fontFamily: F.mono, fontSize: 7, color: C.text3, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        {`Phase ${ph.phase} · ${ph.timeline}`}
                      </Text>
                      <Text style={{ fontSize: 9.5, fontWeight: 600, color: C.text }}>{ph.name}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: "row", height: 10 }}>
                      <View style={{ width: `${(acts.length / maxActions) * 100}%`, flexDirection: "row", height: 10 }}>
                        {counts.map((n, k) =>
                          n > 0 ? (
                            <View
                              key={k}
                              style={{ flex: n, height: 10, backgroundColor: [C.accent, C.teal, C.surface2][k], marginRight: 1 }}
                            />
                          ) : null,
                        )}
                      </View>
                    </View>
                    <Text style={{ width: 30, textAlign: "right", fontFamily: F.mono, fontSize: 8.5, color: C.text }}>{acts.length}</Text>
                  </View>
                );
              })}
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                {(["critical", "high", "medium"] as const).map((k, i) => (
                  <View key={k} style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}>
                    <View style={{ width: 8, height: 8, backgroundColor: [C.accent, C.teal, C.surface2][i], marginRight: 5 }} />
                    <Text style={{ fontFamily: F.mono, fontSize: 7, color: C.text2, textTransform: "uppercase" }}>{PRIORITY[k].label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {phases.map((ph) => (
          <View key={ph.phase} style={s.section} break>
            <View style={{ borderBottomWidth: 1, borderBottomColor: C.lineStrong, paddingBottom: 10, marginBottom: 12 }} minPresenceAhead={120}>
              <Label color={C.accent}>{`Phase ${ph.phase} · ${ph.timeline}`}</Label>
              <Text style={[s.h1, { marginBottom: 4 }]}>{ph.name}</Text>
              {ph.theme ? <Text style={s.muted}>{ph.theme}</Text> : null}
            </View>
            {(ph.actions ?? []).map((a, j) => (
              <ActionCard key={a.id || j} action={a} />
            ))}
            {ph.phase_kpi ? (
              <View style={[s.card, { backgroundColor: C.tealSoft, borderColor: C.teal }]} wrap={false}>
                <Label color={C.teal}>Goal for this phase</Label>
                <Text style={s.body}>{ph.phase_kpi}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {levers.length > 0 ? (
          <View style={s.section} break>
            <Label color={C.accent}>Growth levers</Label>
            <Text style={[s.h2, { marginBottom: 12 }]}>Where growth will come from</Text>
            {levers.map((lv, i) => (
              <View key={i} style={s.card} wrap={false}>
                <Text style={[s.h3, { marginBottom: 8 }]}>{lv.lever}</Text>
                <View style={{ flexDirection: "row", marginBottom: (lv.key_actions ?? []).length ? 8 : 0 }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[s.label, { marginBottom: 2 }]}>Now</Text>
                    <Text style={s.muted}>{lv.current_state}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: C.line }}>
                    <Text style={[s.label, { marginBottom: 2, color: C.teal }]}>Target</Text>
                    <Text style={[s.muted, { color: C.text }]}>{lv.target_state}</Text>
                  </View>
                </View>
                {(lv.key_actions ?? []).length > 0 ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 }}>
                    <Text style={s.label}>Key actions</Text>
                    <Bullets items={lv.key_actions ?? []} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ReportPage>
    </Document>
  );
}
