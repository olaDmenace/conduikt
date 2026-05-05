import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const C = {
  bg: "#0C0C0E",
  surface1: "#141418",
  surface2: "#1C1C22",
  accent: "#2F8C85",
  textPrimary: "#E8E4DE",
  textSecondary: "#9B958C",
  textTertiary: "#5E5A54",
  success: "#6B9E78",
  warning: "#C9A84C",
  error: "#B85C5C",
  critical: "#B85C5C",
  high: "#C9A84C",
  medium: "#6B8FAD",
};

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 48, fontFamily: "Helvetica", color: C.textPrimary },
  coverPage: { backgroundColor: C.bg, padding: 60, fontFamily: "Helvetica", color: C.textPrimary, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" },
  brand: { width: 44, height: 44, backgroundColor: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 48 },
  brandText: { color: C.bg, fontSize: 22, fontFamily: "Helvetica-Bold" },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginBottom: 8 },
  coverSub: { fontSize: 14, color: C.textSecondary, marginBottom: 48 },
  metaRow: { flexDirection: "row", marginBottom: 5 },
  metaLabel: { fontSize: 9, color: C.textTertiary, width: 90, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  metaValue: { fontSize: 9, color: C.textSecondary },
  divider: { height: 1, backgroundColor: C.surface2, marginVertical: 24 },
  sectionTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 14, marginTop: 6 },
  sectionBody: { fontSize: 9.5, color: C.textSecondary, lineHeight: 1.6 },
  phaseHeader: { backgroundColor: C.surface2, borderRadius: 6, padding: 12, marginBottom: 10 },
  phaseNumber: { fontSize: 9, color: C.accent, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  phaseName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginBottom: 4 },
  phaseTimeline: { fontSize: 9, color: C.textTertiary },
  phaseTheme: { fontSize: 9.5, color: C.textSecondary, marginTop: 6, lineHeight: 1.5 },
  actionCard: { borderLeftWidth: 2, borderLeftColor: C.surface2, paddingLeft: 10, marginBottom: 12 },
  actionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginBottom: 3 },
  actionDesc: { fontSize: 9, color: C.textSecondary, lineHeight: 1.5, marginBottom: 4 },
  actionMeta: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 4 },
  badgeText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  metricRow: { backgroundColor: C.surface1, borderRadius: 4, padding: 8, marginTop: 4 },
  metricLabel: { fontSize: 7.5, color: C.textTertiary, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 },
  metricValue: { fontSize: 8.5, color: C.textSecondary, lineHeight: 1.4 },
  kpiBox: { backgroundColor: C.surface2, borderRadius: 4, padding: 8, marginTop: 8 },
  kpiLabel: { fontSize: 7.5, color: C.accent, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  kpiValue: { fontSize: 8.5, color: C.textSecondary, lineHeight: 1.4 },
  leverCard: { backgroundColor: C.surface1, borderRadius: 6, padding: 12, marginBottom: 10 },
  leverTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginBottom: 8 },
  leverLabel: { fontSize: 8, color: C.textTertiary, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  leverValue: { fontSize: 8.5, color: C.textSecondary, lineHeight: 1.4, marginBottom: 8 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: C.textTertiary },
});

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

function priorityColor(p: string) {
  if (p === "critical") return C.critical;
  if (p === "high") return C.high;
  return C.medium;
}

function ActionBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.badge, { backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}44` }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function GrowthPlaybookDocument({
  projectName,
  date,
  data,
}: {
  projectName: string;
  date: string;
  data: GrowthPlaybookData;
}) {
  const phases = data.phases ?? [];
  const levers = data.growth_levers ?? [];

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.brand}><Text style={s.brandText}>C</Text></View>
        <Text style={s.coverTitle}>{data.title ?? "90-Day Growth Playbook"}</Text>
        <Text style={s.coverSub}>{projectName}</Text>
        <View style={s.metaRow}><Text style={s.metaLabel}>Generated</Text><Text style={s.metaValue}>{date}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>Phases</Text><Text style={s.metaValue}>{phases.length}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>Total Actions</Text><Text style={s.metaValue}>{phases.reduce((n, ph) => n + (ph.actions?.length ?? 0), 0)}</Text></View>
        <View style={s.footer}><Text style={s.footerText}>Generated by Conduikt · conduikt.com</Text></View>
      </Page>

      {/* Executive Summary */}
      {data.executive_summary ? (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitle}>Executive Summary</Text>
          <Text style={s.sectionBody}>{data.executive_summary}</Text>
          <View style={s.footer}><Text style={s.footerText}>{projectName}</Text><Text style={s.footerText}>conduikt.com</Text></View>
        </Page>
      ) : null}

      {/* One page per phase */}
      {phases.map((phase) => (
        <Page key={phase.phase} size="A4" style={s.page}>
          <View style={s.phaseHeader}>
            <Text style={s.phaseNumber}>Phase {phase.phase} · {phase.timeline}</Text>
            <Text style={s.phaseName}>{phase.name}</Text>
            <Text style={s.phaseTimeline}>{phase.theme}</Text>
          </View>

          {(phase.actions ?? []).map((action) => (
            <View key={action.id} style={[s.actionCard, { borderLeftColor: priorityColor(action.priority) }]}>
              <Text style={s.actionTitle}>{action.title}</Text>
              <Text style={s.actionDesc}>{action.description}</Text>
              <View style={s.actionMeta}>
                <ActionBadge label={action.priority} color={priorityColor(action.priority)} />
                <ActionBadge label={`Effort: ${action.effort}`} color={C.textTertiary} />
                <ActionBadge label={`Impact: ${action.impact}`} color={C.success} />
                {action.conduikt_tool ? <ActionBadge label={action.conduikt_tool} color={C.accent} /> : null}
              </View>
              {action.success_metric ? (
                <View style={s.metricRow}>
                  <Text style={s.metricLabel}>Success Metric</Text>
                  <Text style={s.metricValue}>{action.success_metric}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {phase.phase_kpi ? (
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Phase KPI</Text>
              <Text style={s.kpiValue}>{phase.phase_kpi}</Text>
            </View>
          ) : null}

          <View style={s.footer}><Text style={s.footerText}>{projectName}</Text><Text style={s.footerText}>conduikt.com</Text></View>
        </Page>
      ))}

      {/* Growth Levers */}
      {levers.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitle}>Growth Levers</Text>
          {levers.map((lever, i) => (
            <View key={i} style={s.leverCard}>
              <Text style={s.leverTitle}>{lever.lever}</Text>
              <Text style={s.leverLabel}>Current State</Text>
              <Text style={s.leverValue}>{lever.current_state}</Text>
              <Text style={s.leverLabel}>Target State</Text>
              <Text style={s.leverValue}>{lever.target_state}</Text>
              {(lever.key_actions ?? []).length > 0 ? (
                <>
                  <Text style={s.leverLabel}>Key Actions</Text>
                  {(lever.key_actions ?? []).map((a, j) => (
                    <Text key={j} style={[s.leverValue, { marginBottom: 2 }]}>· {a}</Text>
                  ))}
                </>
              ) : null}
            </View>
          ))}
          <View style={s.footer}><Text style={s.footerText}>{projectName}</Text><Text style={s.footerText}>conduikt.com</Text></View>
        </Page>
      ) : null}
    </Document>
  );
}
