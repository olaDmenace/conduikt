"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Calendar,
  FileEdit,
  Send as SendIcon,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface Broadcast {
  id: string;
  audience_id: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";
  resend_broadcast_id: string | null;
  error_message: string | null;
  totals: Record<string, number>;
  created_at: string;
  updated_at: string;
  audiences: { name: string };
}

function StatusBadge({ status }: { status: Broadcast["status"] }) {
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

export default function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string; broadcastId: string }>;
}) {
  const { id: projectId, broadcastId } = use(params);
  const { toast } = useToast();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function fetchBroadcast() {
    const res = await fetch(
      `/api/projects/${projectId}/broadcasts/${broadcastId}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      setBroadcast(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBroadcast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  async function handleSendNow() {
    if (!broadcast) return;
    if (!confirm(`Send "${broadcast.subject}" to ${broadcast.audiences.name} now?`))
      return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/broadcasts/${broadcastId}/send`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Send failed", "error");
        return;
      }
      toast(
        `Sent to ${data.audience_size} ${data.audience_size === 1 ? "contact" : "contacts"}`,
        "success"
      );
      await fetchBroadcast();
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!broadcast) return;
    if (!confirm("Delete this broadcast? This cannot be undone.")) return;
    const res = await fetch(
      `/api/projects/${projectId}/broadcasts/${broadcastId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast("Broadcast deleted", "success");
      window.location.href = `/projects/${projectId}/broadcasts`;
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error ?? "Delete failed", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }
  if (!broadcast) {
    return (
      <div>
        <PageHeader title="Broadcast not found" />
        <Button asChild variant="ghost">
          <Link href={`/projects/${projectId}/broadcasts`}>
            <ArrowLeft className="h-4 w-4" />
            Back to broadcasts
          </Link>
        </Button>
      </div>
    );
  }

  const t = broadcast.totals ?? {};
  const sent = t.sent ?? 0;
  const delivered = t.delivered ?? 0;
  const opened = t.opened ?? 0;
  const clicked = t.clicked ?? 0;
  const bounced = t.bounced ?? 0;
  const complained = t.complained ?? 0;
  const unsubscribed = t.unsubscribed ?? 0;

  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
  const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0;
  const bounceRate = sent > 0 ? Math.round((bounced / sent) * 100) : 0;

  const canSendNow = broadcast.status === "draft";
  const canDelete =
    broadcast.status === "draft" ||
    broadcast.status === "cancelled" ||
    broadcast.status === "failed";

  return (
    <div>
      <Link
        href={`/projects/${projectId}/broadcasts`}
        className="inline-flex items-center gap-1.5 text-small text-text-tertiary hover:text-text-primary mb-3 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All broadcasts
      </Link>

      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-accent" />
            <StatusBadge status={broadcast.status} />
          </div>
          <h1 className="text-h1 text-text-primary">{broadcast.subject}</h1>
          <p className="mt-1 text-body text-text-secondary">
            To <strong>{broadcast.audiences.name}</strong> · From {broadcast.from_name}{" "}
            &lt;{broadcast.from_email}&gt;
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canSendNow && (
            <Button onClick={handleSendNow} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              {sending ? "Sending…" : "Send now"}
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" onClick={handleDelete} className="text-error hover:bg-error/10">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Error message if failed */}
      {broadcast.status === "failed" && broadcast.error_message && (
        <Card className="mb-6 border-error/40 bg-error/5">
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-body font-medium text-error">Send failed</p>
                <p className="text-small text-text-secondary mt-1">
                  {broadcast.error_message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats — only meaningful after send */}
      {(broadcast.status === "sent" || broadcast.status === "sending") && sent > 0 && (
        <>
          <h2 className="text-h2 text-text-primary mt-8 mb-3">Delivery</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Sent" value={sent} sub="Total recipients" />
            <StatCard
              label="Delivered"
              value={delivered}
              sub={`${deliveryRate}% delivery rate`}
            />
            <StatCard
              label="Opened"
              value={opened}
              sub={`${openRate}% open rate`}
              accent="success"
            />
            <StatCard
              label="Clicked"
              value={clicked}
              sub={`${clickRate}% click rate`}
              accent="success"
            />
          </div>

          <h2 className="text-h2 text-text-primary mt-8 mb-3">Issues</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Bounced"
              value={bounced}
              sub={`${bounceRate}% bounce rate`}
              accent={bounceRate > 5 ? "error" : "default"}
            />
            <StatCard
              label="Complaints"
              value={complained}
              accent={complained > 0 ? "error" : "default"}
            />
            <StatCard label="Unsubscribed" value={unsubscribed} />
          </div>
        </>
      )}

      {/* HTML preview */}
      <h2 className="text-h2 text-text-primary mt-8 mb-3">Preview</h2>
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border-default px-4 py-3 bg-surface-1 space-y-1">
            <div className="text-small text-text-secondary">
              <span className="font-medium text-text-primary">Subject:</span>{" "}
              {broadcast.subject}
            </div>
            <div className="text-small text-text-tertiary">
              <span>From:</span> {broadcast.from_name} &lt;{broadcast.from_email}&gt;
              {broadcast.reply_to && (
                <span className="ml-3">
                  <span>Reply-To:</span> {broadcast.reply_to}
                </span>
              )}
            </div>
            {broadcast.scheduled_for && (
              <div className="text-small text-text-tertiary">
                <span>Scheduled for:</span>{" "}
                {new Date(broadcast.scheduled_for).toLocaleString()}
              </div>
            )}
            {broadcast.sent_at && (
              <div className="text-small text-text-tertiary">
                <span>Sent at:</span> {new Date(broadcast.sent_at).toLocaleString()}
              </div>
            )}
          </div>
          <div className="p-1 bg-white">
            <iframe
              srcDoc={broadcast.html_body}
              title="Broadcast preview"
              className="w-full min-h-[500px] border-0 rounded-lg"
              sandbox=""
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "success" | "error";
}) {
  const colorMap = {
    default: "text-text-primary",
    success: "text-success",
    error: "text-error",
  };
  return (
    <Card>
      <CardContent>
        <p className="text-caption text-text-tertiary uppercase tracking-wider">
          {label}
        </p>
        <p className={`text-h1 font-mono mt-1 ${colorMap[accent]}`}>{value}</p>
        {sub && (
          <p className="text-caption text-text-tertiary mt-1">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
