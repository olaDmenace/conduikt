"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Loader2,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  FileEdit,
  Globe,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";

interface Broadcast {
  id: string;
  audience_id: string;
  subject: string;
  from_name: string;
  from_email: string;
  scheduled_for: string | null;
  sent_at: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";
  totals: Record<string, number>;
  created_at: string;
  updated_at: string;
}

function statusBadge(status: Broadcast["status"]) {
  const variants: Record<Broadcast["status"], "default" | "success" | "warning" | "secondary" | "info" | "error"> = {
    draft: "secondary",
    scheduled: "info",
    sending: "warning",
    sent: "success",
    failed: "error",
    cancelled: "secondary",
  };
  const icons: Record<Broadcast["status"], React.ReactNode> = {
    draft: <FileEdit className="h-3 w-3 mr-1" />,
    scheduled: <Calendar className="h-3 w-3 mr-1" />,
    sending: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
    sent: <CheckCircle2 className="h-3 w-3 mr-1" />,
    failed: <AlertTriangle className="h-3 w-3 mr-1" />,
    cancelled: <XCircle className="h-3 w-3 mr-1" />,
  };
  return (
    <Badge variant={variants[status]}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatRelative(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.abs(diffMs) / 1000;
  const past = diffMs >= 0;

  if (diffSec < 60) return past ? "just now" : "in a moment";
  if (diffSec < 3600) {
    const m = Math.round(diffSec / 60);
    return past ? `${m}m ago` : `in ${m}m`;
  }
  if (diffSec < 86400) {
    const h = Math.round(diffSec / 3600);
    return past ? `${h}h ago` : `in ${h}h`;
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BroadcastsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/projects/${projectId}/broadcasts`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setBroadcasts(Array.isArray(data) ? data : []);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div>
      <PageHeader
        title="Broadcasts"
        description="One-shot email campaigns sent to your audiences. Send a new broadcast from any generated email sequence."
      />

      {/* Sender info — sets expectations about which domain emails come from
          and previews the upcoming custom-domain feature for paid users. */}
      <Card className="mb-6 border-accent/20 bg-accent-muted/40">
        <CardContent>
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-body font-medium text-text-primary">
                Sending from{" "}
                <code className="font-mono text-accent">mail@contacts.conduikt.com</code>
              </p>
              <p className="text-small text-text-secondary mt-1">
                Free and Pro tiers send from our shared domain.{" "}
                <strong>Custom sending domain</strong> (verify your own
                e.g. <code className="font-mono">mail.yourcompany.com</code>) is
                shipping soon as a Pro+ feature for better deliverability and
                brand consistency.
              </p>
              <Badge variant="secondary" className="mt-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Coming soon
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : broadcasts.length === 0 ? (
        <Card className="border-dashed border-border-strong animate-in">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 rounded-xl bg-accent-muted p-4">
              <Send className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-h2 text-text-primary">No broadcasts yet</h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Generate an email sequence from the Content tab, then click <strong>Send Broadcast</strong> to launch your first campaign.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b, i) => {
            const sent = b.totals?.sent ?? 0;
            const delivered = b.totals?.delivered ?? 0;
            const opened = b.totals?.opened ?? 0;
            const clicked = b.totals?.clicked ?? 0;
            const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
            const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0;

            return (
              <Link
                key={b.id}
                href={`/projects/${projectId}/broadcasts/${b.id}`}
                className="group block animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Card className="transition-colors group-hover:border-accent">
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Mail className="h-4 w-4 text-accent shrink-0" />
                          {statusBadge(b.status)}
                        </div>
                        <h3 className="text-h3 text-text-primary truncate">
                          {b.subject}
                        </h3>
                        <p className="mt-1 text-small text-text-tertiary">
                          From {b.from_name} · {b.from_email}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5" />
                    </div>

                    {(b.status === "sent" || b.status === "sending") && sent > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-3 pt-4 border-t border-border-subtle">
                        <Stat label="Sent" value={sent} />
                        <Stat label="Delivered" value={delivered} />
                        <Stat label="Open rate" value={`${openRate}%`} />
                        <Stat label="Click rate" value={`${clickRate}%`} />
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-caption text-text-tertiary">
                      {b.sent_at && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Sent {formatRelative(b.sent_at)}
                        </span>
                      )}
                      {b.scheduled_for && b.status === "scheduled" && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Scheduled {formatRelative(b.scheduled_for)}
                        </span>
                      )}
                      {!b.sent_at && !b.scheduled_for && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatRelative(b.created_at)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-caption text-text-tertiary uppercase tracking-wider">
        {label}
      </p>
      <p className="text-body text-text-primary font-mono mt-0.5">{value}</p>
    </div>
  );
}
