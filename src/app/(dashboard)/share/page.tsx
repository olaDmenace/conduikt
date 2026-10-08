"use client";

// Share Conduikt — a self-serve marketing kit page for any logged-in
// user (or their friends, when the user forwards the downloaded assets).
//
// Three deliverables on this page:
//   1. Downloadable one-pager PDF (full pitch in print form)
//   2. Two social cards (square 1080×1080 + landscape 1200×627)
//   3. Three copy-paste pitch templates (X, LinkedIn, WhatsApp)
//
// Visual goals: show the v2 palette (one orange accent, teal for data,
// ink and sand surfaces) so an advocate can see it before they share.

import { useState } from "react";
import {
  Megaphone,
  Download,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  Twitter,
  Linkedin,
  MessageCircle,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";

interface PitchTemplate {
  id: string;
  channel: string;
  icon: React.ElementType;
  charLimit?: number;
  text: string;
  hint: string;
}

const PITCHES: PitchTemplate[] = [
  {
    id: "x",
    channel: "X / Twitter",
    icon: Twitter,
    charLimit: 280,
    text: "Just discovered Conduikt — AI marketing automation built for SaaS founders. SEO audits, content generation, multi-channel publishing all from one dashboard. Worth a look if marketing eats time you don't have → https://conduikt.com",
    hint: "Drop into a fresh tweet or as a reply.",
  },
  {
    id: "linkedin",
    channel: "LinkedIn",
    icon: Linkedin,
    text: `If you're a SaaS founder doing your own marketing, this is the tool I wish I had two products ago.

Conduikt automates the parts of marketing that eat the most time: SEO audits, AI content generation across channels (X, LinkedIn, email, blog), scheduled multi-channel publishing, and analytics that actually improve your output over time.

You stay in your codebase. Conduikt runs the marketing motion.

Free tier to try. Pro at $49/mo. → https://conduikt.com`,
    hint: "LinkedIn rewards posts with white space, so keep the line breaks.",
  },
  {
    id: "whatsapp",
    channel: "WhatsApp / DM",
    icon: MessageCircle,
    text: "Hey 👋 Found a tool I think you'd like — Conduikt. It's basically a marketing team for SaaS founders but without the cost. Runs SEO audits, generates content for every channel, schedules everything from one dashboard. Free tier to try → https://conduikt.com",
    hint: "Great for casual one-on-one shares.",
  },
];

export default function SharePage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyTo(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      // navigator.clipboard can throw on insecure origins; fall back to
      // selecting in a hidden textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    }
  }

  return (
    <div className="space-y-10 pb-12">
      <PageHeader
        title="Share Conduikt"
        description="A ready-made kit you can DM, post or forward to anyone. Every asset is on-brand and free to use."
      />

      {/* Brand palette: reassures advocates the kit is on-brand. */}
      <section className="grid grid-cols-1 overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-2">
        {/* Left: copy */}
        <div className="space-y-3 p-6 lg:p-8">
          <div className="flex items-center gap-2 text-text-3">
            <Megaphone className="h-4 w-4" aria-hidden />
            <span className="text-label">
              Brand kit
            </span>
          </div>
          <h2 className="text-heading text-text">
            Conduikt&apos;s palette, ready to share
          </h2>
          <p className="max-w-[64ch] text-body text-text-2">
            One orange accent for actions, teal for data and good news, on
            warm sand and deep ink. Every asset on this page already uses them.
          </p>
        </div>

        {/* Right: swatches */}
        <div className="space-y-4 border-t border-line bg-ground p-6 lg:border-l lg:border-t-0 lg:p-8">
          <SwatchRow
            label="Accent"
            role="Orange"
            swatches={[
              { hex: "#B24E27", token: "accent" },
              { hex: "#D9663A", token: "accent-display" },
            ]}
          />
          <SwatchRow
            label="Data and surfaces"
            role="Teal and ink"
            swatches={[
              { hex: "#1F6B66", token: "teal" },
              { hex: "#1E2A2E", token: "ink" },
            ]}
          />
        </div>
      </section>

      {/* Asset downloads */}
      <section className="space-y-4">
        <div>
          <h2 className="text-heading text-text">Downloadable assets</h2>
          <p className="mt-1 text-body-s text-text-2">
            Download, then drag straight into a DM, post or email.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetCard
            title="One-pager PDF"
            description="A4 portrait. The full pitch (features, pricing, how to start) for DMs, email attachments or print."
            badge="A4 · 1 page"
            icon={FileText}
            preview={
              <object
                data="/api/marketing-kit/pdf"
                type="application/pdf"
                aria-label="Conduikt one-pager PDF preview"
                className="h-full w-full"
              >
                <div className="flex h-full items-center justify-center text-caption text-text-3">
                  The preview isn&apos;t available here. Use Download.
                </div>
              </object>
            }
            downloadHref="/api/marketing-kit/pdf"
            downloadName="conduikt-one-pager.pdf"
          />

          <AssetCard
            title="Square card"
            description="1080 × 1080 PNG. Instagram, WhatsApp status, square thumbnails."
            badge="1080 × 1080"
            icon={ImageIcon}
            preview={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/marketing-kit/social-card?variant=square"
                alt="Conduikt square social card preview"
                className="h-full w-full object-cover"
              />
            }
            downloadHref="/api/marketing-kit/social-card?variant=square"
            downloadName="conduikt-square.png"
          />

          <AssetCard
            title="Landscape card"
            description="1200 × 627 PNG. Sized for X, LinkedIn and Facebook link previews."
            badge="1200 × 627"
            icon={ImageIcon}
            preview={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/marketing-kit/social-card?variant=landscape"
                alt="Conduikt landscape social card preview"
                className="h-full w-full object-cover"
              />
            }
            downloadHref="/api/marketing-kit/social-card?variant=landscape"
            downloadName="conduikt-landscape.png"
          />
        </div>
      </section>

      {/* Pitch templates */}
      <section className="space-y-4">
        <div>
          <h2 className="text-heading text-text">Pitch templates</h2>
          <p className="mt-1 text-body-s text-text-2">
            Copy, paste, make it yours. Change anything you like. The part
            that matters is the link to conduikt.com.
          </p>
        </div>

        <div className="space-y-4">
          {PITCHES.map((p) => {
            const Icon = p.icon;
            const copied = copiedId === p.id;
            const charCount = p.text.length;
            const overLimit = p.charLimit ? charCount > p.charLimit : false;
            return (
              <Card key={p.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-text-3" aria-hidden />
                    <span className="text-title text-text">
                      {p.channel}
                    </span>
                    {p.charLimit && (
                      <Badge variant={overLimit ? "error" : "secondary"}>
                        {charCount}/{p.charLimit}
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => copyTo(p.text, p.id)}
                    variant={copied ? "outline" : "quiet"}
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-teal" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-md border border-line bg-ground p-4 font-sans text-body text-text">
                  {p.text}
                </pre>
                <p className="mt-2 text-caption text-text-3">
                  {p.hint}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SwatchRow({
  label,
  role,
  swatches,
}: {
  label: string;
  role: string;
  swatches: Array<{ hex: string; token: string }>;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-label text-text-3">
          {label}
        </span>
        <span className="text-caption font-medium text-text-2">
          {role}
        </span>
      </div>
      <div className="flex gap-2">
        {swatches.map((sw) => (
          <div
            key={sw.hex}
            className="flex-1 overflow-hidden rounded-md border border-line"
          >
            {/* Swatch fill is the brand value being shown, not UI colour. */}
            <div
              className="h-12"
              style={{ backgroundColor: sw.hex }}
              aria-label={`${role} ${sw.token}`}
            />
            <div className="bg-surface px-2 py-1.5">
              <p className="text-label text-text-3">
                {sw.token}
              </p>
              <p className="mt-1 font-mono text-caption text-text-2">
                {sw.hex}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetCard({
  title,
  description,
  badge,
  icon: Icon,
  preview,
  downloadHref,
  downloadName,
}: {
  title: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  preview: React.ReactNode;
  downloadHref: string;
  downloadName: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="relative aspect-square overflow-hidden border-b border-line bg-ground">
        {preview}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-text-3" aria-hidden />
            <h3 className="truncate text-title text-text">
              {title}
            </h3>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {badge}
          </Badge>
        </div>
        <p className="text-body-s text-text-2">
          {description}
        </p>
        <Button asChild variant="outline" className="mt-auto w-full">
          <a href={downloadHref} download={downloadName}>
            <Download className="h-4 w-4" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}
