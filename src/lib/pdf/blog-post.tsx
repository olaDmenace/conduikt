import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const C = {
  bg: "#0C0C0E",
  surface1: "#141418",
  surface2: "#1C1C22",
  accent: "#D9663A",
  textPrimary: "#E8E4DE",
  textSecondary: "#9B958C",
  textTertiary: "#5E5A54",
  success: "#6B9E78",
};

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 48, fontFamily: "Helvetica", color: C.textPrimary },
  coverPage: { backgroundColor: C.bg, padding: 60, fontFamily: "Helvetica", color: C.textPrimary, display: "flex", flexDirection: "column", justifyContent: "center" },
  brand: { width: 44, height: 44, backgroundColor: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 48 },
  brandText: { color: C.bg, fontSize: 22, fontFamily: "Helvetica-Bold" },
  label: { fontSize: 9, color: C.accent, textTransform: "uppercase" as const, letterSpacing: 1, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  coverTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginBottom: 16, lineHeight: 1.3 },
  coverDesc: { fontSize: 11, color: C.textSecondary, marginBottom: 40, lineHeight: 1.5 },
  metaRow: { flexDirection: "row", marginBottom: 5 },
  metaLabel: { fontSize: 9, color: C.textTertiary, width: 100, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  metaValue: { fontSize: 9, color: C.textSecondary, flex: 1 },
  divider: { height: 1, backgroundColor: C.surface2, marginVertical: 20 },
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 12, marginTop: 8 },
  bodyText: { fontSize: 9.5, color: C.textSecondary, lineHeight: 1.65 },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginTop: 16, marginBottom: 8 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginTop: 12, marginBottom: 6 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.textPrimary, marginTop: 10, marginBottom: 4 },
  paragraph: { fontSize: 9.5, color: C.textSecondary, lineHeight: 1.65, marginBottom: 8 },
  listItem: { fontSize: 9.5, color: C.textSecondary, lineHeight: 1.65, marginBottom: 3, paddingLeft: 12 },
  seoBox: { backgroundColor: C.surface1, borderRadius: 6, padding: 12, marginBottom: 10 },
  seoLabel: { fontSize: 8, color: C.textTertiary, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  seoValue: { fontSize: 9.5, color: C.textPrimary, lineHeight: 1.4 },
  seoDesc: { fontSize: 9, color: C.textSecondary, lineHeight: 1.5 },
  serpPreview: { backgroundColor: C.surface2, borderRadius: 6, padding: 14, marginBottom: 16 },
  serpTitle: { fontSize: 12, color: C.accent, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  serpUrl: { fontSize: 9, color: C.success, marginBottom: 4 },
  serpDesc: { fontSize: 9.5, color: C.textSecondary, lineHeight: 1.4 },
  socialCard: { backgroundColor: C.surface1, borderRadius: 6, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.accent },
  socialLabel: { fontSize: 8, color: C.accent, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  socialText: { fontSize: 9.5, color: C.textSecondary, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: C.textTertiary },
});

interface BlogPostData {
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  content_markdown?: string;
  word_count?: number;
  reading_time_minutes?: number;
  social_promotion?: {
    x_post?: string;
    linkedin_post?: string;
    email_subject?: string;
  };
}

/** Convert markdown to simple structured blocks for PDF rendering */
function parseMarkdown(md: string): Array<{ type: "h1" | "h2" | "h3" | "paragraph" | "listitem"; text: string }> {
  const lines = md.split("\n");
  const blocks: Array<{ type: "h1" | "h2" | "h3" | "paragraph" | "listitem"; text: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("### ")) blocks.push({ type: "h3", text: trimmed.slice(4) });
    else if (trimmed.startsWith("## ")) blocks.push({ type: "h2", text: trimmed.slice(3) });
    else if (trimmed.startsWith("# ")) blocks.push({ type: "h1", text: trimmed.slice(2) });
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) blocks.push({ type: "listitem", text: trimmed.slice(2) });
    else if (/^\d+\.\s/.test(trimmed)) blocks.push({ type: "listitem", text: trimmed.replace(/^\d+\.\s/, "") });
    else {
      // Strip bold/italic markers for PDF plain text
      const clean = trimmed.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");
      blocks.push({ type: "paragraph", text: clean });
    }
  }
  return blocks;
}

export function BlogPostDocument({
  projectName,
  date,
  data,
}: {
  projectName: string;
  date: string;
  data: BlogPostData;
}) {
  const contentBlocks = data.content_markdown ? parseMarkdown(data.content_markdown) : [];

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.brand}><Text style={s.brandText}>C</Text></View>
        <Text style={s.label}>Blog Post</Text>
        <Text style={s.coverTitle}>{data.meta_title ?? "Untitled Post"}</Text>
        {data.meta_description ? <Text style={s.coverDesc}>{data.meta_description}</Text> : null}
        <View style={s.metaRow}><Text style={s.metaLabel}>Project</Text><Text style={s.metaValue}>{projectName}</Text></View>
        <View style={s.metaRow}><Text style={s.metaLabel}>Generated</Text><Text style={s.metaValue}>{date}</Text></View>
        {data.word_count ? <View style={s.metaRow}><Text style={s.metaLabel}>Word Count</Text><Text style={s.metaValue}>{data.word_count.toLocaleString()} words</Text></View> : null}
        {data.reading_time_minutes ? <View style={s.metaRow}><Text style={s.metaLabel}>Reading Time</Text><Text style={s.metaValue}>{data.reading_time_minutes} min read</Text></View> : null}
        {data.slug ? <View style={s.metaRow}><Text style={s.metaLabel}>URL Slug</Text><Text style={s.metaValue}>/{data.slug}</Text></View> : null}
        <View style={s.footer}><Text style={s.footerText}>Generated by Conduikt · conduikt.com</Text></View>
      </Page>

      {/* Article content */}
      {contentBlocks.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitle}>Article</Text>
          {contentBlocks.map((block, i) => {
            if (block.type === "h1") return <Text key={i} style={s.h1}>{block.text}</Text>;
            if (block.type === "h2") return <Text key={i} style={s.h2}>{block.text}</Text>;
            if (block.type === "h3") return <Text key={i} style={s.h3}>{block.text}</Text>;
            if (block.type === "listitem") return <Text key={i} style={s.listItem}>· {block.text}</Text>;
            return <Text key={i} style={s.paragraph}>{block.text}</Text>;
          })}
          <View style={s.footer}><Text style={s.footerText}>{projectName}</Text><Text style={s.footerText}>conduikt.com</Text></View>
        </Page>
      ) : null}

      {/* SEO Meta */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>SEO & Meta</Text>

        {/* SERP preview */}
        <View style={s.serpPreview}>
          <Text style={s.seoLabel}>SERP Preview</Text>
          <Text style={s.serpTitle}>{data.meta_title ?? ""}</Text>
          {data.slug ? <Text style={s.serpUrl}>conduikt.com/{data.slug}</Text> : null}
          <Text style={s.serpDesc}>{data.meta_description ?? ""}</Text>
        </View>

        <View style={s.seoBox}>
          <Text style={s.seoLabel}>Meta Title</Text>
          <Text style={s.seoValue}>{data.meta_title ?? "—"}</Text>
        </View>
        <View style={s.seoBox}>
          <Text style={s.seoLabel}>Meta Description</Text>
          <Text style={s.seoDesc}>{data.meta_description ?? "—"}</Text>
        </View>
        {data.slug ? (
          <View style={s.seoBox}>
            <Text style={s.seoLabel}>URL Slug</Text>
            <Text style={s.seoValue}>/{data.slug}</Text>
          </View>
        ) : null}

        {/* Social promo */}
        {data.social_promotion ? (
          <>
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>Social Promotion</Text>
            {data.social_promotion.x_post ? (
              <View style={s.socialCard}>
                <Text style={s.socialLabel}>X / Twitter</Text>
                <Text style={s.socialText}>{data.social_promotion.x_post}</Text>
              </View>
            ) : null}
            {data.social_promotion.linkedin_post ? (
              <View style={s.socialCard}>
                <Text style={s.socialLabel}>LinkedIn</Text>
                <Text style={s.socialText}>{data.social_promotion.linkedin_post}</Text>
              </View>
            ) : null}
            {data.social_promotion.email_subject ? (
              <View style={s.socialCard}>
                <Text style={s.socialLabel}>Email Subject</Text>
                <Text style={s.socialText}>{data.social_promotion.email_subject}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        <View style={s.footer}><Text style={s.footerText}>{projectName}</Text><Text style={s.footerText}>conduikt.com</Text></View>
      </Page>
    </Document>
  );
}
