import React from "react";
import { Document, Text, View } from "@react-pdf/renderer";
import { PDF_BRAND as C, PDF_FONTS as F, registerPdfFonts } from "./brand";
import { Chip, CoverPage, Label, ReportPage, s } from "./kit";

registerPdfFonts();

// Blog post export (docs/DESIGN.md Direction C). Ink cover, the article set
// for reading, then a page with the search snippet and social copy.

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

type Block = { type: "h1" | "h2" | "h3" | "paragraph" | "listitem" | "numbered" | "quote"; text: string; n?: number };

/** Drop inline markdown (bold, italics, code, links) for plain PDF text. */
function inline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

/**
 * Markdown to simple blocks. Consecutive plain lines join into one
 * paragraph, or keep their line breaks when `keepLineBreaks` is set
 * (emails, posts and other copy where the breaks matter).
 */
export function parseMarkdown(md: string, keepLineBreaks = false): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "paragraph", text: inline(para.join(keepLineBreaks ? "\n" : " ")) });
    para = [];
  };
  for (const line of md.split("\n")) {
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    const num = /^(\d+)[.)]\s+(.*)$/.exec(t);
    let block: Block | null = null;
    if (t.startsWith("### ")) block = { type: "h3", text: inline(t.slice(4)) };
    else if (t.startsWith("## ")) block = { type: "h2", text: inline(t.slice(3)) };
    else if (t.startsWith("# ")) block = { type: "h1", text: inline(t.slice(2)) };
    else if (t.startsWith("- ") || t.startsWith("* ")) block = { type: "listitem", text: inline(t.slice(2)) };
    else if (num) block = { type: "numbered", text: inline(num[2]), n: Number(num[1]) };
    else if (t.startsWith("> ")) block = { type: "quote", text: inline(t.slice(2)) };
    else if (/^(-{3,}|\*{3,})$/.test(t)) {
      flush();
      continue;
    } else {
      para.push(t);
      continue;
    }
    flush();
    blocks.push(block);
  }
  flush();
  return blocks;
}

/** Renders parsed markdown blocks in the report type scale. */
export function MarkdownBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <View>
      {blocks.map((b, i) => {
        if (b.type === "h1")
          return (
            <Text key={i} style={[s.h2, { fontSize: 20, marginTop: i === 0 ? 0 : 14 }]} minPresenceAhead={40}>
              {b.text}
            </Text>
          );
        if (b.type === "h2")
          return (
            <Text key={i} style={[s.h2, { fontSize: 16, marginTop: 14, marginBottom: 8 }]} minPresenceAhead={40}>
              {b.text}
            </Text>
          );
        if (b.type === "h3")
          return (
            <Text key={i} style={[s.h3, { marginTop: 8 }]} minPresenceAhead={30}>
              {b.text}
            </Text>
          );
        if (b.type === "listitem" || b.type === "numbered")
          return (
            <View key={i} style={[s.bulletRow, { paddingLeft: 4 }]} wrap={false}>
              <Text style={b.type === "numbered" ? [s.bulletDot, { fontFamily: F.mono, fontSize: 9, width: 18 }] : s.bulletDot}>
                {b.type === "numbered" ? `${b.n}.` : "•"}
              </Text>
              <Text style={[s.bulletText, { lineHeight: 1.6 }]}>{b.text}</Text>
            </View>
          );
        if (b.type === "quote")
          return (
            <View key={i} style={{ borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 12, marginVertical: 8 }}>
              <Text style={[s.body, { color: C.text2, lineHeight: 1.6 }]}>{b.text}</Text>
            </View>
          );
        return (
          <Text key={i} style={[s.body, { lineHeight: 1.65, marginBottom: 9 }]}>
            {b.text}
          </Text>
        );
      })}
    </View>
  );
}

/** A field with a character count, teal when inside the range search engines show. */
function CountedField({ label, value, min, max }: { label: string; value?: string; min: number; max: number }) {
  const len = value?.length ?? 0;
  const ok = len >= min && len <= max;
  return (
    <View style={s.card} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Label>{label}</Label>
        {value ? <Chip tone={ok ? "good" : "warn"}>{`${len} chars · aim ${min}–${max}`}</Chip> : null}
      </View>
      <Text style={s.body}>{value || "Not set."}</Text>
    </View>
  );
}

function SocialCard({ label, text }: { label: string; text: string }) {
  return (
    <View style={s.card} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Label>{label}</Label>
        <Text style={{ fontFamily: F.mono, fontSize: 7, color: C.text3 }}>{`${text.length} chars`}</Text>
      </View>
      <Text style={[s.body, { lineHeight: 1.55 }]}>{text}</Text>
    </View>
  );
}

export function BlogPostDocument({ projectName, date, data }: { projectName: string; date: string; data: BlogPostData }) {
  const blocks = data.content_markdown ? parseMarkdown(data.content_markdown) : [];
  const title = data.meta_title || "Untitled post";
  const length = [
    data.word_count ? `${data.word_count.toLocaleString("en-US")} words` : null,
    data.reading_time_minutes ? `${data.reading_time_minutes} min read` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const social = data.social_promotion;
  const hasSocial = !!(social && (social.x_post || social.linkedin_post || social.email_subject));

  const meta: Array<[string, string]> = [
    ["Project", projectName],
    ["Date", date],
  ];
  if (length) meta.push(["Length", length]);
  if (data.slug) meta.push(["Address", `/${data.slug}`]);

  return (
    <Document title={title} author="Conduikt">
      <CoverPage eyebrow="Blog post" title={title} subtitle={data.meta_description} meta={meta} />

      {blocks.length > 0 ? (
        <ReportPage title={`Blog post · ${projectName}`}>
          <Label>The article</Label>
          <Text style={[s.h1, { marginBottom: 18 }]}>{title}</Text>
          <MarkdownBlocks blocks={blocks[0]?.type === "h1" && blocks[0].text === title ? blocks.slice(1) : blocks} />
        </ReportPage>
      ) : null}

      <ReportPage title={`Blog post · ${projectName}`}>
        <View style={s.section}>
          <Label>Search</Label>
          <Text style={s.h2}>How it shows in Google</Text>
          <View style={[s.card, { backgroundColor: C.white, marginTop: 6 }]} wrap={false}>
            {data.slug ? (
              <Text style={{ fontSize: 8.5, color: C.teal, marginBottom: 3 }}>{`yoursite.com › ${data.slug}`}</Text>
            ) : null}
            <Text style={{ fontFamily: F.body, fontWeight: 500, fontSize: 13, color: C.text, marginBottom: 4 }}>{title}</Text>
            <Text style={[s.muted, { lineHeight: 1.45 }]}>{data.meta_description || "No description set."}</Text>
          </View>
        </View>

        <View style={s.section}>
          <CountedField label="Page title" value={data.meta_title} min={30} max={60} />
          <CountedField label="Description" value={data.meta_description} min={120} max={160} />
          {data.slug ? (
            <View style={s.card} wrap={false}>
              <Label>Address</Label>
              <Text style={{ fontFamily: F.mono, fontSize: 9, color: C.text }}>{`/${data.slug}`}</Text>
            </View>
          ) : null}
        </View>

        {hasSocial ? (
          <View style={s.section}>
            <Label>Promotion</Label>
            <Text style={[s.h2, { marginBottom: 10 }]}>Posts to share it</Text>
            {social?.x_post ? <SocialCard label="X" text={social.x_post} /> : null}
            {social?.linkedin_post ? <SocialCard label="LinkedIn" text={social.linkedin_post} /> : null}
            {social?.email_subject ? <SocialCard label="Email subject line" text={social.email_subject} /> : null}
          </View>
        ) : null}
      </ReportPage>
    </Document>
  );
}
