"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  FileEdit,
  Globe,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/page-header";

// What GET /api/email-domain tells us about the sender. One-off emails
// go out from the shared address today; the card says so and points at
// the domain settings.
interface SenderState {
  eligible: boolean;
  shared_from_email: string;
  domain: { domain: string; status: "pending" | "verified" | "failed"; from_email: string } | null;
}

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
    draft: <FileEdit className="h-3 w-3" />,
    scheduled: <Calendar className="h-3 w-3" />,
    sending: <span className="live-dot" aria-hidden />,
    sent: <CheckCircle2 className="h-3 w-3" />,
    failed: <AlertTriangle className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
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
  const [sender, setSender] = useState<SenderState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [res, senderRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/broadcasts`, { cache: "no-store" }),
        fetch("/api/email-domain", { cache: "no-store" }).catch(() => null),
      ]);
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setBroadcasts(Array.isArray(data) ? data : []);
      }
      if (senderRes?.ok) {
        const data = (await senderRes.json().catch(() => null)) as SenderState | null;
        if (!cancelled && data) setSender(data);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const senderDomain = sender?.domain ?? null;
  const domainLive = !!senderDomain && senderDomain.status === "verified" && sender?.eligible === true;
  const domainPaused = !!senderDomain && sender?.eligible === false;
  let senderNote: string;
  let senderCta: string;
  if (domainPaused) {
    senderNote = `Your domain ${senderDomain!.domain} is paused: your plan no longer includes sending from your own domain. Upgrade to use it again.`;
    senderCta = "Manage your sending domain";
  } else if (domainLive) {
    senderNote = `Your domain is verified and sign-up confirmations already go out from ${senderDomain!.from_email}. One-off emails still use the shared address for now.`;
    senderCta = "Manage your sending domain";
  } else if (senderDomain) {
    senderNote = `Your domain ${senderDomain.domain} is waiting for its records. Until it is verified, emails use the shared address.`;
    senderCta = "Finish setting up your domain";
  } else if (sender?.eligible) {
    senderNote =
      "You can send from your own address (like hello@yourcompany.com) so more emails land in the inbox under your name.";
    senderCta = "Set up your sending domain";
  } else {
    senderNote =
      "Free plans send from our shared address. On Pro and above you can set up your own domain (like hello@yourcompany.com) so more emails land in the inbox under your name.";
    senderCta = "Set up your sending domain";
  }

  return (
    <div>
      <PageHeader
        title="One-off emails"
        description="Emails sent once to a subscriber list. Send one from any email series we write for you."
      />

      {/* Sender info: which address one-off emails come from. */}
      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-text-3" />
          <div className="min-w-0 flex-1">
            {sender ? (
              <p className="text-title text-text">
                Sending from{" "}
                <code className="break-all font-mono text-text">{sender.shared_from_email}</code>
              </p>
            ) : (
              <Skeleton className="h-5 w-72" />
            )}
            <p className="mt-1 text-body-s text-text-2">{sender ? senderNote : "Checking where your one-off emails come from…"}</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/settings/email-domain">
                {senderCta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <EmptyState
          className="animate-in"
          icon={<Send className="h-6 w-6" />}
          title="No one-off emails yet. Write an email series in Content, then send one of its emails to a subscriber list from there."
        />
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
                style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
              >
                <Card className="hover-card hover-card-quiet">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Mail className="h-4 w-4 shrink-0 text-text-3" />
                          {statusBadge(b.status)}
                        </div>
                        <h3 className="text-title text-text truncate">
                          {b.subject}
                        </h3>
                        <p className="mt-1 text-body-s text-text-3">
                          From {b.from_name} · {b.from_email}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-3" />
                    </div>

                    {(b.status === "sent" || b.status === "sending") && sent > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-3 pt-4 border-t border-line">
                        <Stat label="Sent" value={sent} />
                        <Stat label="Delivered" value={delivered} />
                        <Stat label="Opened" value={`${openRate}%`} />
                        <Stat label="Clicked" value={`${clickRate}%`} />
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-caption text-text-3">
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
                  </div>
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
      <p className="text-label text-text-3">{label}</p>
      <p className="mt-1.5 font-mono text-body text-text">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
