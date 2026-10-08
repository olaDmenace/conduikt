import React from "react";
import { Document, Text, View } from "@react-pdf/renderer";
import { registerPdfFonts } from "./brand";
import { CoverPage, Label, OutputView, ReportPage, s } from "./kit";
import { MarkdownBlocks, parseMarkdown } from "./blog-post";

registerPdfFonts();

// Fallback export for any saved asset without its own template
// (docs/DESIGN.md Direction C). JSON content goes through the shared
// OutputView so it reads as sections, not code; text goes through the
// same light markdown renderer as blog posts.

const TYPE_LABELS: Record<string, string> = {
  copy_block: "Copy",
  email: "Email sequence",
  social_post: "Social posts",
  landing_page: "Landing page",
  headline: "Headlines",
  cta: "Calls to action",
  ad_copy: "Ad copy",
  meta_tags: "Meta tags",
  schema_markup: "Schema markup",
  audit_report: "Audit report",
  seo_page: "SEO page",
};

function typeLabel(type: string): string {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  const w = type.replace(/[_-]+/g, " ").trim();
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "Content";
}

/** JSON objects/arrays become structured output; anything else stays text. */
function parseJson(raw: string): unknown | null {
  const t = raw.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (v && typeof v === "object") {
      // Assets often wrap the real output as { parsed: {...} }.
      const o = v as Record<string, unknown>;
      return o.parsed && typeof o.parsed === "object" ? o.parsed : v;
    }
  } catch {
    // Not JSON: fall through to text.
  }
  return null;
}

export function GenericContentDocument({
  title,
  type,
  projectName,
  date,
  rawContent,
}: {
  title: string;
  type: string;
  projectName: string;
  date: string;
  rawContent: string;
}) {
  const label = typeLabel(type);
  const json = parseJson(rawContent ?? "");
  const blocks = json ? [] : parseMarkdown(rawContent ?? "", true);

  return (
    <Document title={title || label} author="Conduikt">
      <CoverPage
        eyebrow={label}
        title={title || label}
        subtitle={`Saved from ${projectName}.`}
        meta={[
          ["Project", projectName],
          ["Date", date],
          ["Type", label],
        ]}
      />
      <ReportPage title={`${label} · ${projectName}`}>
        <Label>Content</Label>
        <Text style={[s.h1, { marginBottom: 16 }]}>{title || label}</Text>
        {json ? (
          <OutputView output={json} />
        ) : blocks.length > 0 ? (
          <MarkdownBlocks blocks={blocks} />
        ) : (
          <View style={s.card}>
            <Text style={s.muted}>This item has no content to show.</Text>
          </View>
        )}
      </ReportPage>
    </Document>
  );
}
