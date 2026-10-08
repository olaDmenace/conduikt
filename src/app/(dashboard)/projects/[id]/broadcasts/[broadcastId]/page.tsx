"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Calendar,
  FileEdit,
  Send as SendIcon,
  Trash2,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
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
        toast(data.error ?? "Couldn't send. Try again.", "error");
        return;
      }
      toast(
        `Sent to ${data.audience_size} ${data.audience_size === 1 ? "person" : "people"}`,
        "success"
      );
      await fetchBroadcast();
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!broadcast) return;
    if (!confirm("Delete this email? You can't undo this.")) return;
    const res = await fetch(
      `/api/projects/${projectId}/broadcasts/${broadcastId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast("Email deleted", "success");
      window.location.href = `/projects/${projectId}/broadcasts`;
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error ?? "Couldn't delete. Try again.", "error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (!broadcast) {
    return (
      <div>
        <PageHeader title="We couldn't find this email" />
        <Button asChild variant="ghost">
          <Link href={`/projects/${projectId}/broadcasts`}>
            <ArrowLeft className="h-4 w-4" />
            Back to one-off emails
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
        className="hover-link mb-3 inline-flex items-center gap-1.5 text-body-s text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All one-off emails
      </Link>

      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Mail className="h-5 w-5 text-text-3" />
            <StatusBadge status={broadcast.status} />
          </div>
          <h1 className="text-display-s text-text">{broadcast.subject}</h1>
          <p className="mt-1 text-body text-text-2">
            To <span className="font-medium text-text">{broadcast.audiences.name}</span> · From {broadcast.from_name}{" "}
            &lt;{broadcast.from_email}&gt;
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canSendNow && (
            <Button onClick={handleSendNow} disabled={sending}>
              {!sending && <SendIcon className="h-4 w-4" />}
              {sending ? "Sending…" : "Send now"}
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Error message if failed */}
      {broadcast.status === "failed" && broadcast.error_message && (
        <Card className="mb-6 mt-4 border-danger bg-surface-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="text-title text-danger">This email didn&apos;t send</p>
              <p className="mt-1 text-body-s text-text-2">
                {broadcast.error_message}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats — only meaningful after send */}
      {(broadcast.status === "sent" || broadcast.status === "sending") && sent > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-heading text-text">How it went</h2>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
            <StatCard label="Sent" value={sent} sub="People it went to" />
            <StatCard
              label="Delivered"
              value={delivered}
              sub={`${deliveryRate}% reached the inbox`}
            />
            <StatCard
              label="Opened"
              value={opened}
              sub={`${openRate}% of emails opened`}
              accent="success"
            />
            <StatCard
              label="Clicked"
              value={clicked}
              sub={`${clickRate}% clicked a link`}
              accent="success"
            />
          </div>

          <h2 className="mb-3 mt-8 text-heading text-text">Problems</h2>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
            <StatCard
              label="Bounced"
              value={bounced}
              sub={`${bounceRate}% couldn't be delivered`}
              accent={bounceRate > 5 ? "error" : "default"}
            />
            <StatCard
              label="Marked as spam"
              value={complained}
              accent={complained > 0 ? "error" : "default"}
            />
            <StatCard label="Unsubscribed" value={unsubscribed} />
          </div>
        </>
      )}

      {/* HTML preview */}
      <h2 className="mb-3 mt-8 text-heading text-text">Preview</h2>
      <Card className="overflow-hidden p-0 md:p-0">
        <div>
          <div className="space-y-1 border-b border-line px-4 py-3">
            <div className="text-body-s text-text-2">
              <span className="font-medium text-text">Subject:</span>{" "}
              {broadcast.subject}
            </div>
            <div className="text-body-s text-text-3">
              <span>From:</span> {broadcast.from_name} &lt;{broadcast.from_email}&gt;
              {broadcast.reply_to && (
                <span className="ml-3">
                  <span>Replies go to:</span> {broadcast.reply_to}
                </span>
              )}
            </div>
            {broadcast.scheduled_for && (
              <div className="text-body-s text-text-3">
                <span>Scheduled for:</span>{" "}
                {new Date(broadcast.scheduled_for).toLocaleString()}
              </div>
            )}
            {broadcast.sent_at && (
              <div className="text-body-s text-text-3">
                <span>Sent at:</span> {new Date(broadcast.sent_at).toLocaleString()}
              </div>
            )}
          </div>
          <div className="bg-surface p-1">
            <iframe
              srcDoc={broadcast.html_body}
              title="Email preview"
              className="min-h-[500px] w-full rounded-md border-0"
              sandbox=""
            />
          </div>
        </div>
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
    default: "text-text",
    success: "text-teal",
    error: "text-danger",
  };
  return (
    <div className="flex flex-col gap-1.5 bg-surface p-4 md:p-5">
      <p className="text-label text-text-3">{label}</p>
      <p className={`text-numeric text-[1.75rem] ${colorMap[accent]}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-caption text-text-3">{sub}</p>}
    </div>
  );
}
