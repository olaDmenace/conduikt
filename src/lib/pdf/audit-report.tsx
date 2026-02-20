import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const colors = {
  surface0: "#0C0C0E",
  surface1: "#141418",
  surface2: "#1C1C22",
  accent: "#D4945A",
  textPrimary: "#E8E4DE",
  textSecondary: "#9B958C",
  textTertiary: "#5E5A54",
  success: "#6B9E78",
  warning: "#C9A84C",
  error: "#B85C5C",
  info: "#6B8FAD",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.surface0,
    padding: 40,
    fontFamily: "Helvetica",
    color: colors.textPrimary,
  },
  // Cover page
  coverPage: {
    backgroundColor: colors.surface0,
    padding: 60,
    fontFamily: "Helvetica",
    color: colors.textPrimary,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  brandMark: {
    width: 48,
    height: 48,
    backgroundColor: colors.accent,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  brandLetter: {
    color: colors.surface0,
    fontSize: 24,
    fontWeight: "bold",
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    width: 100,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  // Content pages
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.accent,
    marginBottom: 16,
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.surface2,
  },
  categoryText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  // Findings
  findingCard: {
    backgroundColor: colors.surface1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  findingTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  findingDetail: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  fixBox: {
    backgroundColor: colors.surface2,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  fixLabel: {
    fontSize: 8,
    color: colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fixText: {
    fontSize: 9,
    color: colors.info,
  },
  impactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  severityHeader: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface2,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: colors.textTertiary,
  },
});

interface Finding {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  fix: string;
  impact: "high" | "medium" | "low";
}

interface AuditReportProps {
  projectName: string;
  url: string;
  date: string;
  score: number;
  findings: Finding[];
}

function getScoreColor(score: number) {
  if (score >= 80) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.error;
}

function getSeverityColor(severity: string) {
  if (severity === "critical") return colors.error;
  if (severity === "warning") return colors.warning;
  return colors.info;
}

function getImpactStyle(impact: string) {
  if (impact === "high") return { backgroundColor: colors.error + "30", color: colors.error };
  if (impact === "medium") return { backgroundColor: colors.warning + "30", color: colors.warning };
  return { backgroundColor: colors.info + "30", color: colors.info };
}

export function AuditReportDocument({
  projectName,
  url,
  date,
  score,
  findings,
}: AuditReportProps) {
  const scoreColor = getScoreColor(score);

  // Group by severity
  const critical = findings.filter((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

  // Category summary
  const categories = [...new Set(findings.map((f) => f.category))];

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>C</Text>
        </View>
        <Text style={styles.coverTitle}>SEO Audit Report</Text>
        <Text style={styles.coverSubtitle}>{projectName}</Text>

        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
        </View>
        <Text style={styles.scoreLabel}>Overall SEO Score</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Website</Text>
          <Text style={styles.metaValue}>{url}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Audit Date</Text>
          <Text style={styles.metaValue}>{date}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Findings</Text>
          <Text style={styles.metaValue}>
            {critical.length} critical, {warnings.length} warnings,{" "}
            {info.length} info
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Conduikt</Text>
          <Text style={styles.footerText}>conduikt.com</Text>
        </View>
      </Page>

      {/* Score Summary Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <View key={cat} style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {cat}: {findings.filter((f) => f.category === cat).length}{" "}
                issues
              </Text>
            </View>
          ))}
        </View>

        {/* Critical Findings */}
        {critical.length > 0 && (
          <>
            <Text
              style={[styles.severityHeader, { color: colors.error }]}
            >
              Critical Issues ({critical.length})
            </Text>
            {critical.map((f, i) => (
              <FindingCard key={`c-${i}`} finding={f} />
            ))}
          </>
        )}

        {/* Warning Findings */}
        {warnings.length > 0 && (
          <>
            <Text
              style={[styles.severityHeader, { color: colors.warning }]}
            >
              Warnings ({warnings.length})
            </Text>
            {warnings.map((f, i) => (
              <FindingCard key={`w-${i}`} finding={f} />
            ))}
          </>
        )}

        {/* Info Findings */}
        {info.length > 0 && (
          <>
            <Text
              style={[styles.severityHeader, { color: colors.info }]}
            >
              Informational ({info.length})
            </Text>
            {info.map((f, i) => (
              <FindingCard key={`i-${i}`} finding={f} />
            ))}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by Conduikt</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const impactStyle = getImpactStyle(finding.impact);
  return (
    <View
      style={[
        styles.findingCard,
        { borderLeftColor: getSeverityColor(finding.severity) },
      ]}
      wrap={false}
    >
      <Text style={styles.findingTitle}>{finding.title}</Text>
      <Text style={styles.findingDetail}>{finding.detail}</Text>
      {finding.fix && (
        <View style={styles.fixBox}>
          <Text style={styles.fixLabel}>Recommended Fix</Text>
          <Text style={styles.fixText}>{finding.fix}</Text>
        </View>
      )}
      <View style={[styles.impactBadge, impactStyle]}>
        <Text style={{ fontSize: 8, color: impactStyle.color }}>
          {finding.impact.toUpperCase()} IMPACT
        </Text>
      </View>
    </View>
  );
}
