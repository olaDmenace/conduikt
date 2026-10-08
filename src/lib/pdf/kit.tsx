import React from "react";
import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PDF_BRAND as C, PDF_FONTS as F } from "./brand";

// Shared building blocks for every Conduikt PDF (docs/DESIGN.md Direction C):
// an ink cover, sand pages with a thin header and numbered footer, mono
// labels, Space Grotesk light headings, flat cards with 1px lines.

export const s = StyleSheet.create({
  page: {
    backgroundColor: C.ground,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: F.body,
    fontSize: 10,
    lineHeight: 1.5,
    color: C.text,
  },
  runHead: {
    position: "absolute",
    top: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: F.mono,
    fontSize: 7,
    letterSpacing: 0.8,
    color: C.text3,
    textTransform: "uppercase",
  },
  foot: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
    fontFamily: F.mono,
    fontSize: 7,
    color: C.text3,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 7.5,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: C.text3,
    marginBottom: 6,
  },
  h1: { fontFamily: F.display, fontWeight: 300, fontSize: 26, lineHeight: 1.1, letterSpacing: -0.6, color: C.text, marginBottom: 10 },
  h2: { fontFamily: F.display, fontWeight: 300, fontSize: 18, lineHeight: 1.15, letterSpacing: -0.3, color: C.text, marginBottom: 8 },
  h3: { fontFamily: F.body, fontWeight: 600, fontSize: 11, color: C.text, marginBottom: 4 },
  body: { fontSize: 10, color: C.text, lineHeight: 1.5 },
  muted: { fontSize: 9, color: C.text2, lineHeight: 1.5 },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
  },
  cardAccent: { borderColor: C.accent },
  section: { marginBottom: 22 },
  row: { flexDirection: "row" },
  chip: {
    lineHeight: 1.2,
    fontFamily: F.mono,
    fontSize: 7,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 10, color: C.accent, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.5, color: C.text },
  cover: { backgroundColor: C.ink, padding: 56, fontFamily: F.body, color: C.inkText },
});

export function BrandMark({ inverse = false, size = 14 }: { inverse?: boolean; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: size, height: size, borderRadius: 3, backgroundColor: C.accentDisplay, marginRight: 6 }} />
      <Text style={{ fontFamily: F.display, fontWeight: 500, fontSize: size * 0.95, color: inverse ? C.inkText : C.text }}>
        Conduikt
      </Text>
    </View>
  );
}

/** Ink cover page. `children` render under the title (score, meta…). */
export function CoverPage({
  eyebrow,
  title,
  subtitle,
  meta,
  logoUrl,
  accent,
  children,
}: {
  /** Client accent for white-label reports; defaults to the brand accent. */
  accent?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  meta?: Array<[string, string]>;
  logoUrl?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <Page size="A4" style={s.cover}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {logoUrl ? (
          // Light plate: client logos are usually drawn for white
          // backgrounds and disappear on ink.
          <View style={{ backgroundColor: C.surface, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={{ height: 24, maxWidth: 150, objectFit: "contain" }} />
          </View>
        ) : (
          <BrandMark inverse size={16} />
        )}
        <Text style={{ fontFamily: F.mono, fontSize: 8, color: C.inkText3, letterSpacing: 0.8 }}>
          {new Date().getFullYear()}
        </Text>
      </View>

      <View style={{ marginTop: 150 }}>
        <Text style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: accent ?? C.inkAccent, marginBottom: 14 }}>
          {eyebrow}
        </Text>
        <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 40, lineHeight: 1.05, letterSpacing: -1, color: C.inkText }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: C.inkText2, marginTop: 14, maxWidth: 420, lineHeight: 1.5 }}>{subtitle}</Text>
        ) : null}
        {children ? <View style={{ marginTop: 36 }}>{children}</View> : null}
      </View>

      {meta && meta.length > 0 ? (
        <View style={{ position: "absolute", left: 56, right: 56, bottom: 56, flexDirection: "row", borderTopWidth: 1, borderTopColor: C.inkLine, paddingTop: 14 }}>
          {meta.map(([k, v]) => (
            <View key={k} style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: 0.8, textTransform: "uppercase", color: C.inkText3, marginBottom: 3 }}>{k}</Text>
              <Text style={{ fontSize: 10, color: C.inkText }}>{v}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Page>
  );
}

/** A sand content page with running header and numbered footer. */
export function ReportPage({ title, children, footerNote }: { title: string; children: React.ReactNode; footerNote?: string }) {
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={s.runHead} fixed>
        <Text>{title}</Text>
        <Text>{new Date().getFullYear()}</Text>
      </View>
      {children}
      <View style={s.foot} fixed>
        <Text>{footerNote ?? "conduikt.com"}</Text>
        {/* No page numbers: react-pdf's render-prop text in a fixed footer
            crashes layout on long outputs ("unsupported number"). */}
        <Text>Conduikt</Text>
      </View>
    </Page>
  );
}

export function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <Text style={[s.label, color ? { color } : {}]}>{children}</Text>;
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "ink" }) {
  const t = {
    neutral: { backgroundColor: C.surface2, color: C.text2 },
    good: { backgroundColor: C.tealSoft, color: C.teal },
    warn: { backgroundColor: C.accentSoft, color: C.accent },
    bad: { backgroundColor: C.accentSoft, color: C.error },
    ink: { backgroundColor: C.ink, color: C.inkText },
  }[tone];
  return <Text style={[s.chip, t]}>{children}</Text>;
}

export function Bullets({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={s.bulletRow} wrap={false}>
          <Text style={[s.bulletDot, numbered ? { fontFamily: F.mono, fontSize: 9, width: 16 } : {}]}>{numbered ? `${i + 1}` : "•"}</Text>
          <Text style={s.bulletText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

/** Big score with a thin bar: teal at 80+, accent below. */
export function ScoreBlock({ score, label, inverse = false }: { score: number; label: string; inverse?: boolean }) {
  const good = score >= 80;
  const bar = good ? (inverse ? C.inkTeal : C.teal) : inverse ? C.inkAccent : C.accent;
  return (
    <View>
      <Text style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: 0.9, textTransform: "uppercase", color: inverse ? C.inkText3 : C.text3, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 54, lineHeight: 1, color: inverse ? C.inkText : C.text }}>{score}</Text>
        <Text style={{ fontFamily: F.display, fontWeight: 300, fontSize: 18, color: inverse ? C.inkText3 : C.text3, marginLeft: 4, marginBottom: 6 }}>/ 100</Text>
      </View>
      <View style={{ height: 3, backgroundColor: inverse ? C.inkLine : C.line, marginTop: 10, width: 220 }}>
        <View style={{ height: 3, width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: bar }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Generic output renderer — the PDF twin of components/first-week/agent-output.
// Any agent's parsed JSON becomes readable sections without a per-agent template.

const SKIP = new Set(["type", "usage", "id", "raw", "_meta", "conduiktRoute", "projectPath", "route"]);
const TITLE_KEYS = ["title", "name", "headline", "subject", "keyword", "term", "angle", "hook", "day", "label", "phase", "step", "week"];

export function humanize(key: string): string {
  const w = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
}
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function empty(v: unknown): boolean {
  if (v == null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (isObj(v)) return Object.keys(v).filter((k) => !SKIP.has(k)).every((k) => empty(v[k]));
  return false;
}
const short = (v: unknown) => typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length <= 40 && !v.includes("\n"));

function OValue({ v, depth }: { v: unknown; depth: number }): React.ReactElement | null {
  if (empty(v) || depth > 5) return null;
  if (typeof v === "string") return <Text style={s.body}>{v}</Text>;
  if (typeof v === "number" || typeof v === "boolean") return <Text style={s.body}>{String(v)}</Text>;
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== "object" || x === null)) return <Bullets items={v.map(String)} />;
    return (
      <View>
        {v.map((x, i) => (isObj(x) ? <OBlock key={i} o={x} depth={depth + 1} /> : <OValue key={i} v={x} depth={depth + 1} />))}
      </View>
    );
  }
  if (isObj(v)) return <OFields o={v} depth={depth} />;
  return null;
}

function OBlock({ o, depth }: { o: Record<string, unknown>; depth: number }) {
  const key = TITLE_KEYS.find((k) => typeof o[k] === "string" || typeof o[k] === "number") ?? null;
  const rest = Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));
  return (
    // Only top-level items get card chrome. Cards nested in cards that
    // break across pages trip a react-pdf layout bug ("unsupported
    // number"), and read worse anyway; deeper levels get a left rule.
    <View
      style={
        depth <= 1
          ? [s.card, { padding: 10 }]
          : { borderLeftWidth: 1, borderLeftColor: C.line, paddingLeft: 8, marginBottom: 8 }
      }
    >
      {key ? <Text style={s.h3}>{String(o[key])}</Text> : null}
      <OFields o={rest} depth={depth} />
    </View>
  );
}

function OFields({ o, depth }: { o: Record<string, unknown>; depth: number }) {
  const entries = Object.entries(o).filter(([k, v]) => !SKIP.has(k) && !empty(v));
  const shorts = entries.filter(([, v]) => short(v));
  const longs = entries.filter(([, v]) => !short(v));
  return (
    <View>
      {shorts.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }} wrap={false}>
          {shorts.map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", marginRight: 12, marginBottom: 2 }}>
              <Text style={[s.label, { marginBottom: 0, marginRight: 4 }]}>{humanize(k)}</Text>
              <Text style={{ fontSize: 9, color: C.text }}>{String(v)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {longs.map(([k, v]) => (
        <View key={k} style={{ marginBottom: 8 }}>
          <Text style={s.label}>{humanize(k)}</Text>
          <OValue v={v} depth={depth + 1} />
        </View>
      ))}
    </View>
  );
}

export function OutputView({ output }: { output: unknown }) {
  if (empty(output)) return <Text style={s.muted}>This agent returned nothing to show.</Text>;
  return <OValue v={output} depth={0} />;
}
