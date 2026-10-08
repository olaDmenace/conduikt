"use client";

import { useEffect, useState } from "react";
import { X, Mail, ExternalLink, Calendar, Send } from "@/src/components/ui/lucide-icons";
import { Button, IconButton } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Field, Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";

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
          toast("Couldn't load your subscriber lists. Try again.", "error");
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
      toast("Pick a list first", "warning");
      return;
    }
    if (!subject.trim()) {
      toast("Add a subject line first", "warning");
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
        toast(err.error ?? "Couldn't set up the email. Try again.", "error");
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
        toast(err.error ?? "Couldn't send the email. Try again.", "error");
        return;
      }
      const sendResult = await sendRes.json();

      const targetAudience = audiences.find((a) => a.id === audienceId);
      const audienceLabel = targetAudience?.name ?? "your list";
      if (sendResult.status === "scheduled") {
        toast(
          `Scheduled to ${audienceLabel} (${sendResult.audience_size} people) for ${new Date(scheduledFor).toLocaleString()}`,
          "success"
        );
      } else {
        toast(
          `Sent to ${audienceLabel} (${sendResult.audience_size} people)`,
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-broadcast-title"
        className="relative w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
      >
        <IconButton
          label="Close"
          size="sm"
          onClick={onClose}
          className="absolute right-4 top-4"
        >
          <X className="h-4 w-4" />
        </IconButton>

        <div className="mb-1 flex items-center gap-2">
          <Mail className="h-5 w-5 text-text-3" />
          <h2 id="send-broadcast-title" className="text-heading text-text">
            Send to a list
          </h2>
        </div>
        <p className="mb-6 text-body-s text-text-2">
          Send this email once to one of your subscriber lists. Free and Pro send
          from our shared address; sending from your own address is coming on
          higher plans.
        </p>

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Loading">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : audiences.length === 0 ? (
          <EmptyState
            title="No subscriber lists yet. Make one and add people before sending."
            action={
              <Button size="sm" variant="outline" asChild>
                <a href={`/projects/${projectId}/audiences`}>
                  Go to subscribers
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {/* List picker */}
            <Field
              label="Subscriber list"
              htmlFor="broadcast-audience"
              error={
                selectedAudience && selectedAudience.contact_count === 0
                  ? "This list is empty. Add people before sending."
                  : undefined
              }
            >
              <select
                id="broadcast-audience"
                value={audienceId}
                onChange={(e) => setAudienceId(e.target.value)}
                className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Pick one…</option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.contact_count} {a.contact_count === 1 ? "person" : "people"})
                  </option>
                ))}
              </select>
            </Field>

            {/* Subject */}
            <Input
              label="Subject line"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              hint={`${subject.length} of 200 characters`}
            />

            {/* When */}
            <div>
              <p className="mb-1.5 text-body-s text-text-2">When</p>
              <div className="mb-2 grid grid-cols-2 gap-2" role="group" aria-label="When">
                <button
                  type="button"
                  onClick={() => setScheduleMode("now")}
                  aria-pressed={scheduleMode === "now"}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-body-s font-medium transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                    scheduleMode === "now"
                      ? "border-line-strong bg-surface-2 text-text"
                      : "border-line text-text-2 hover:bg-surface-2"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send now
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("later")}
                  aria-pressed={scheduleMode === "later"}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-body-s font-medium transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                    scheduleMode === "later"
                      ? "border-line-strong bg-surface-2 text-text"
                      : "border-line text-text-2 hover:bg-surface-2"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule
                </button>
              </div>
              {scheduleMode === "later" && (
                <>
                  <label htmlFor="broadcast-when" className="sr-only">
                    Date and time
                  </label>
                  <input
                    id="broadcast-when"
                    type="datetime-local"
                    min={minDateTime}
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                </>
              )}
            </div>

            {/* Quota note */}
            <p className="text-caption text-text-3">
              Counts toward your monthly email limit.
            </p>

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
                {submitting ? null : scheduleMode === "later" ? (
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
