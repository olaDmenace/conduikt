"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Mail, ExternalLink, Calendar, Send } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

// Modal that turns a generated email-sequence email into a Resend-backed
// broadcast send. Wired from EmailPreview's "Send Broadcast" button.
//
// Flow:
//   1. Fetch user's audiences for this project (GET /api/projects/[id]/audiences)
//   2. User picks an audience, edits subject if needed, picks "now" or schedule
//   3. POST /api/projects/[id]/broadcasts to create a draft
//   4. POST /api/projects/[id]/broadcasts/[broadcastId]/send to fire it
//   5. Toast result back, close modal

interface Audience {
  id: string;
  name: string;
  description: string | null;
  contact_count: number;
}

export interface SendBroadcastModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultSubject: string;
  htmlBody: string;
  textBody?: string;
  toast: (message: string, variant?: "success" | "error" | "warning" | "info") => void;
}

export function SendBroadcastModal({
  open,
  onClose,
  projectId,
  defaultSubject,
  htmlBody,
  textBody,
  toast,
}: SendBroadcastModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [audienceId, setAudienceId] = useState<string>("");
  const [subject, setSubject] = useState(defaultSubject);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledFor, setScheduledFor] = useState("");

  // Min datetime for the picker — 5 minutes from now.
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  useEffect(() => {
    if (!open) return;
    setSubject(defaultSubject);
    setScheduleMode("now");
    setScheduledFor("");
  }, [open, defaultSubject]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function fetchAudiences() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/audiences`);
        if (!res.ok) {
          toast("Failed to load audiences", "error");
          return;
        }
        const data = (await res.json()) as Audience[];
        if (cancelled) return;
        setAudiences(data);
        // Auto-select if exactly one audience exists.
        if (data.length === 1) setAudienceId(data[0].id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAudiences();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, toast]);

  if (!open) return null;

  async function handleSend() {
    if (!audienceId) {
      toast("Pick an audience first", "warning");
      return;
    }
    if (!subject.trim()) {
      toast("Subject is required", "warning");
      return;
    }
    if (scheduleMode === "later" && !scheduledFor) {
      toast("Pick a time to schedule for", "warning");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the draft broadcast.
      const createRes = await fetch(`/api/projects/${projectId}/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_id: audienceId,
          subject: subject.trim(),
          html_body: htmlBody,
          text_body: textBody,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        toast(err.error ?? "Failed to create broadcast", "error");
        return;
      }
      const broadcast = await createRes.json();

      // 2. Send (or schedule) it.
      const sendBody: Record<string, string> = {};
      if (scheduleMode === "later" && scheduledFor) {
        sendBody.scheduled_for = new Date(scheduledFor).toISOString();
      }
      const sendRes = await fetch(
        `/api/projects/${projectId}/broadcasts/${broadcast.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sendBody),
        }
      );
      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        toast(err.error ?? "Failed to send broadcast", "error");
        return;
      }
      const sendResult = await sendRes.json();

      const targetAudience = audiences.find((a) => a.id === audienceId);
      const audienceLabel = targetAudience?.name ?? "your audience";
      if (sendResult.status === "scheduled") {
        toast(
          `Scheduled to ${audienceLabel} (${sendResult.audience_size} contacts) for ${new Date(scheduledFor).toLocaleString()}`,
          "success"
        );
      } else {
        toast(
          `Sent to ${audienceLabel} (${sendResult.audience_size} contacts)`,
          "success"
        );
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAudience = audiences.find((a) => a.id === audienceId);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-surface-0/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border-default bg-surface-1 p-6 shadow-[var(--shadow-elevated)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-5 w-5 text-accent" />
          <h2 className="text-h2 text-text-primary">Send Broadcast</h2>
        </div>
        <p className="text-small text-text-secondary mb-6">
          Send this email to one of your audiences. Free tier sends from our shared
          domain; Pro+ gets a custom sending domain.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : audiences.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-0 p-6 text-center space-y-3">
            <p className="text-body text-text-primary font-medium">
              No audiences yet.
            </p>
            <p className="text-small text-text-secondary">
              Create an audience and add contacts before sending.
            </p>
            <Button size="sm" variant="secondary" asChild>
              <a href={`/projects/${projectId}/audiences`}>
                Manage audiences
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Audience picker */}
            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Audience
              </label>
              <select
                value={audienceId}
                onChange={(e) => setAudienceId(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">Pick one…</option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.contact_count} {a.contact_count === 1 ? "contact" : "contacts"})
                  </option>
                ))}
              </select>
              {selectedAudience && selectedAudience.contact_count === 0 && (
                <p className="text-caption text-warning mt-1.5">
                  This audience has no contacts. Add some before sending.
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Subject line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-caption text-text-tertiary mt-1.5">
                {subject.length}/200
              </p>
            </div>

            {/* When */}
            <div>
              <label className="text-caption text-text-tertiary mb-2 block">When</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setScheduleMode("now")}
                  className={`rounded-lg border px-3 py-2 text-small font-medium transition-colors ${
                    scheduleMode === "now"
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border-default text-text-secondary hover:border-border-strong"
                  }`}
                >
                  <Send className="inline h-3.5 w-3.5 mr-1.5" />
                  Send now
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("later")}
                  className={`rounded-lg border px-3 py-2 text-small font-medium transition-colors ${
                    scheduleMode === "later"
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border-default text-text-secondary hover:border-border-strong"
                  }`}
                >
                  <Calendar className="inline h-3.5 w-3.5 mr-1.5" />
                  Schedule
                </button>
              </div>
              {scheduleMode === "later" && (
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none"
                />
              )}
            </div>

            {/* Quota note */}
            <Badge variant="secondary" className="text-text-tertiary">
              Counts against your monthly email quota.
            </Badge>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={
                  submitting ||
                  !audienceId ||
                  !subject.trim() ||
                  (scheduleMode === "later" && !scheduledFor) ||
                  (selectedAudience?.contact_count ?? 0) === 0
                }
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : scheduleMode === "later" ? (
                  <Calendar className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting
                  ? "Sending…"
                  : scheduleMode === "later"
                  ? "Schedule"
                  : "Send now"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
