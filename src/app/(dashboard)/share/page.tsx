"use client";

// Share Conduikt — a self-serve marketing kit page for any logged-in
// user (or their friends, when the user forwards the downloaded assets).
//
// Three deliverables on this page:
//   1. Downloadable one-pager PDF (full pitch in print form)
//   2. Two social cards (square 1080×1080 + landscape 1200×627)
//   3. Three copy-paste pitch templates (X, LinkedIn, WhatsApp)
//
// Visual goals: showcase the brand teal as primary and copper as the
// secondary accent. The page itself doubles as a brand sample so an
// advocate can see the palette before they share.

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
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
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
    hint: "LinkedIn rewards posts with whitespace — keep the line breaks.",
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
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Share Conduikt"
        description="A ready-made marketing kit you can DM, post, or forward to anyone. Every asset is on-brand and free to use."
      />

      {/* Brand palette banner — satisfies the "show primary + secondary"
          requirement and reassures advocates the kit is on-brand. */}
      <Card className="border-accent/20 bg-gradient-to-br from-surface-1 to-surface-0 overflow-hidden p-0">
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: copy */}
            <div className="p-6 lg:p-8 space-y-3">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Megaphone className="h-4 w-4" />
                <span className="text-caption uppercase tracking-wider">
                  Brand kit
                </span>
              </div>
              <h2 className="text-h2 text-text-primary">
                Conduikt&apos;s palette, ready to share
              </h2>
              <p className="text-body text-text-secondary leading-relaxed">
                Brand teal is our primary; copper is the secondary accent
                — used sparingly for warmth and texture. Every asset on
                this page already uses both.
              </p>
            </div>

            {/* Right: swatches */}
            <div className="p-6 lg:p-8 bg-surface-1/40 border-t lg:border-t-0 lg:border-l border-border-subtle space-y-4">
              <SwatchRow
                label="Primary"
                role="Teal"
                swatches={[
                  { hex: "#2F8C85", token: "accent-400" },
                  { hex: "#1F6B66", token: "accent-500" },
                ]}
              />
              <SwatchRow
                label="Secondary"
                role="Copper"
                swatches={[
                  { hex: "#D9663A", token: "accent-secondary" },
                  { hex: "#F4E2C9", token: "accent-cream" },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset downloads */}
      <section className="space-y-4">
        <div>
          <h2 className="text-h2 text-text-primary">Downloadable assets</h2>
          <p className="text-small text-text-secondary mt-1">
            Click to download. Drag straight into a DM, post, or email.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AssetCard
            title="One-pager PDF"
            description="A4 portrait. The full pitch — features, pricing, CTA — for DMs, email attachments, or print."
            badge="A4 · 1 page"
            icon={FileText}
            preview={
              <object
                data="/api/marketing-kit/pdf"
                type="application/pdf"
                aria-label="Conduikt one-pager PDF preview"
                className="w-full h-full"
              >
                <div className="flex h-full items-center justify-center text-text-tertiary text-caption">
                  PDF preview unavailable — click download.
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
                className="w-full h-full object-cover"
              />
            }
            downloadHref="/api/marketing-kit/social-card?variant=square"
            downloadName="conduikt-square.png"
          />

          <AssetCard
            title="Landscape card"
            description="1200 × 627 PNG. Optimised for X, LinkedIn, Facebook share previews."
            badge="1200 × 627"
            icon={ImageIcon}
            preview={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/marketing-kit/social-card?variant=landscape"
                alt="Conduikt landscape social card preview"
                className="w-full h-full object-cover"
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
          <h2 className="text-h2 text-text-primary">Pitch templates</h2>
          <p className="text-small text-text-secondary mt-1">
            Copy, paste, personalise. Tweak as you like — the heart of
            the pitch is the link to conduikt.com.
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
                <CardContent>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-md bg-accent-muted p-1.5">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-body font-medium text-text-primary">
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
                      variant={copied ? "secondary" : "primary"}
                      size="sm"
                      className="shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-body text-text-secondary leading-relaxed bg-surface-1 rounded-md p-4 border border-border-subtle">
                    {p.text}
                  </pre>
                  <p className="mt-2 text-caption text-text-tertiary">
                    {p.hint}
                  </p>
                </CardContent>
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
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-caption uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className="text-caption text-text-secondary font-medium">
          {role}
        </span>
      </div>
      <div className="flex gap-2">
        {swatches.map((sw) => (
          <div
            key={sw.hex}
            className="flex-1 rounded-md border border-border-subtle overflow-hidden"
          >
            <div
              className="h-12"
              style={{ backgroundColor: sw.hex }}
              aria-label={`${role} ${sw.token}`}
            />
            <div className="px-2 py-1.5 bg-surface-0">
              <p className="text-caption text-text-tertiary uppercase tracking-wide">
                {sw.token}
              </p>
              <p className="text-caption font-mono text-text-secondary">
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
    <Card className="overflow-hidden p-0">
      <CardContent>
        <div className="aspect-square bg-surface-1 border-b border-border-subtle relative overflow-hidden">
          {preview}
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-accent shrink-0" />
              <h3 className="text-body font-medium text-text-primary truncate">
                {title}
              </h3>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {badge}
            </Badge>
          </div>
          <p className="text-small text-text-secondary leading-relaxed">
            {description}
          </p>
          <a
            href={downloadHref}
            download={downloadName}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-small font-medium text-surface-0 hover:bg-accent-hover transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
