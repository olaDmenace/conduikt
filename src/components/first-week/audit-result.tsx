"use client";

import { Card } from "@/src/components/ui/card";
import { LinkedInCard } from "@/src/components/social/linkedin-card";
import { cn } from "@/src/lib/utils/cn";

// The site audit result, shared by the public /check page and the signed-in
// Magic Audit page: score with the three fixes, the brand voice we heard,
// and three posts in that voice.

export interface AuditResultData {
  seoScore: number;
  seoGrade: "A" | "B" | "C" | "D" | "F";
  topIssues: string[];
  brandVoice: { tone: string; audience: string; valueProposition: string };
  sampleLinkedInPosts: Array<{ angle: string; text: string }>;
}

export function AuditResult({ audit, host, className }: { audit: AuditResultData; host: string; className?: string }) {
  const good = audit.seoScore >= 80;
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="space-y-4">
          <p className="text-label text-text-3">Site score · {host}</p>
          <p className="text-display-s text-text">
            {audit.seoScore}
            <span className="text-text-3"> / 100</span>
          </p>
          <p className={cn("text-body-s", good ? "text-teal" : "text-text-2")}>
            Grade {audit.seoGrade}. {good ? "A solid base to build on." : "A few fixes will lift this quickly."}
          </p>
          {audit.topIssues.length > 0 && (
            <div className="space-y-2 border-t border-line pt-4">
              <p className="text-label text-text-3">Fix these first</p>
              <ol className="space-y-2">
                {audit.topIssues.map((issue, i) => (
                  <li key={i} className="flex gap-2 text-body-s text-text">
                    <span className="font-mono text-accent">{i + 1}</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <p className="text-label text-text-3">How you sound</p>
          <dl className="space-y-3">
            <div>
              <dt className="text-caption text-text-3">Tone</dt>
              <dd className="text-body text-text">{audit.brandVoice.tone}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-3">Who it&apos;s for</dt>
              <dd className="text-body text-text">{audit.brandVoice.audience}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-3">What you promise</dt>
              <dd className="text-body text-text">{audit.brandVoice.valueProposition}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {audit.sampleLinkedInPosts.length > 0 && (
        <section className="space-y-3" aria-labelledby="sample-posts">
          <h2 id="sample-posts" className="text-label text-text-3">
            Three posts in your voice, ready today
          </h2>
          <div className="grid gap-4 rail:grid-cols-3">
            {audit.sampleLinkedInPosts.map((post, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-caption text-accent">{post.angle}</p>
                <LinkedInCard text={post.text} author={{ name: host, headline: "Draft by Conduikt" }} className="max-w-none" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
