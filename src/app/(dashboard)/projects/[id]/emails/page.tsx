"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Send,
  Clock,
  Copy,
  Users,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import Link from "next/link";

interface EmailSequence {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  step_count: number;
}

interface SequenceStep {
  id: string;
  step_order: number;
  subject_line: string | null;
  preview_text: string | null;
  delay_hours: number;
  asset_id: string | null;
  assets: {
    id: string;
    content: {
      subject?: string;
      preview_text?: string;
      html?: string;
      body_html?: string;
      cta_text?: string;
      cta_url?: string;
    };
    title: string | null;
    status: string;
  } | null;
}

interface AudienceOption {
  id: string;
  name: string;
  contact_count: number;
}

interface SequenceDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  email_sequence_steps: SequenceStep[];
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    nurture: "Nurture",
    onboarding: "Onboarding",
    sales: "Sales",
    re_engagement: "Re-engagement",
    newsletter: "Newsletter",
  };
  return labels[type] ?? type;
}

function statusVariant(
  status: string
): "success" | "warning" | "secondary" {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  return "secondary";
}

export default function EmailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeq, setSelectedSeq] = useState<SequenceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendingStep, setSendingStep] = useState<string | null>(null);
  // Enroll-audience flow state. The dialog opens from either the sequence
  // detail dialog OR directly from a card's Send button — `enrollForSeqId`
  // is the single source of truth for which sequence we're enrolling into.
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForSeqId, setEnrollForSeqId] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchSequences();
  }, [projectId]);

  // Hand-off from /content?skill=email-sequence — when the user clicks
  // "Save & Schedule Drip", we redirect here with ?enroll=<seqId> so the
  // audience picker opens automatically. The user picks an audience and
  // the drip starts. We only auto-open once per page load, hence the
  // ref-style guard via state.
  const [autoEnrollHandled, setAutoEnrollHandled] = useState(false);
  useEffect(() => {
    if (autoEnrollHandled) return;
    const enrollSeqId = searchParams.get("enroll");
    if (!enrollSeqId) return;
    // Wait until the sequence list has loaded so the picker shows the
    // right step count in its preview.
    if (loading) return;
    setAutoEnrollHandled(true);
    openEnroll(enrollSeqId);
  }, [searchParams, loading, autoEnrollHandled]);

  async function fetchSequences() {
    const res = await fetch(`/api/projects/${projectId}/email-sequences`);
    if (res.ok) setSequences(await res.json());
    setLoading(false);
  }

  async function openDetail(seqId: string) {
    setDetailLoading(true);
    setSelectedSeq(null);
    const res = await fetch(
      `/api/projects/${projectId}/email-sequences/${seqId}`
    );
    if (res.ok) setSelectedSeq(await res.json());
    setDetailLoading(false);
  }

  async function openEnroll(seqId: string) {
    setEnrollForSeqId(seqId);
    setEnrollOpen(true);
    setSelectedAudienceId(null);
    if (audiences.length === 0) {
      const res = await fetch(`/api/projects/${projectId}/audiences`);
      if (res.ok) setAudiences(await res.json());
    }
  }

  async function handleEnroll() {
    if (!enrollForSeqId || !selectedAudienceId) return;
    setEnrolling(true);
    const res = await fetch(
      `/api/projects/${projectId}/email-sequences/${enrollForSeqId}/enroll`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audienceId: selectedAudienceId }),
      }
    );
    setEnrolling(false);
    if (res.ok) {
      const data = await res.json();
      const enrolled = data.enrolled ?? 0;
      const skipped = data.skipped ?? 0;
      const skippedNote = skipped > 0 ? ` (${skipped} were already on it)` : "";
      toast(
        `Added ${enrolled} ${enrolled === 1 ? "person" : "people"}${skippedNote}. The first email goes out shortly.`,
        "success"
      );
      setEnrollOpen(false);
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Couldn't start the series. Try again.", "error");
    }
  }

  function describeDelay(hours: number) {
    if (!hours || hours <= 0) return "Immediately";
    if (hours < 24) return `+${hours}h`;
    const days = Math.round(hours / 24);
    return `+${days}d`;
  }

  async function handleSendTest(step: SequenceStep) {
    if (!step.assets?.content) return;
    const to = window.prompt(
      "Send a test of this email to which address?",
      ""
    );
    if (!to) return;
    const trimmed = to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast("That doesn't look like an email address", "error");
      return;
    }
    const subject =
      step.subject_line ||
      step.assets?.content?.subject ||
      "(no subject)";
    const html =
      step.assets?.content?.body_html ||
      step.assets?.content?.html ||
      `<p>${subject}</p>`;
    setSendingStep(step.id);
    const res = await fetch("/api/publish/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: trimmed,
        subject,
        html,
        projectId,
      }),
    });
    if (res.ok) {
      toast(`Test sent to ${trimmed}`, "success");
    } else {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Couldn't send the test. Try again.", "error");
    }
    setSendingStep(null);
  }

  function handleCopyStep(step: SequenceStep) {
    const c = step.assets?.content;
    if (!c) return;
    const subject = step.subject_line || c.subject || "";
    const html = c.body_html || c.html || "";
    const preview = step.preview_text || c.preview_text || "";
    const parts: string[] = [];
    if (subject) parts.push(`Subject: ${subject}`);
    if (preview) parts.push(`Preview: ${preview}`);
    if (html) parts.push("", html);
    if (c.cta_text || c.cta_url) {
      parts.push("", `CTA: ${c.cta_text ?? ""}${c.cta_url ? ` (${c.cta_url})` : ""}`);
    }
    navigator.clipboard.writeText(parts.join("\n").trim());
    toast("Email copied. Paste it into Mailchimp, Resend, or whatever you use for email.", "success");
  }

  const totalSteps = sequences.reduce((s, seq) => s + seq.step_count, 0);
  const activeCount = sequences.filter((s) => s.status === "active").length;
  const draftCount = sequences.filter((s) => s.status === "draft").length;

  return (
    <div>
      <PageHeader
        title="Email series"
        description="Welcome and follow-up emails. Preview each one, send yourself a test, or send the series to a subscriber list."
      >
        <Button asChild>
          <Link
            href={`/projects/${projectId}/content?skill=email-sequence`}
          >
            New email series
          </Link>
        </Button>
      </PageHeader>

      {/* Stats */}
      <KpiStrip
        className="mb-8 animate-in rail:grid-cols-4"
        cells={[
          { label: "Email series", value: sequences.length.toLocaleString() },
          { label: "Sending", value: activeCount.toLocaleString() },
          { label: "Drafts", value: draftCount.toLocaleString() },
          { label: "Emails in all", value: totalSteps.toLocaleString() },
        ]}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="No email series yet. Have the Email agent write a welcome or follow-up series, then preview it, test it, and send it here."
          action={
            <Button asChild>
              <Link href={`/projects/${projectId}/content?skill=email-sequence`}>
                Write your first series
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences.map((seq, i) => (
            <Card
              key={seq.id}
              className="animate-in hover-card hover-card-quiet flex flex-col"
              style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
            >
              <div className="flex flex-1 flex-col">
                <div className="mb-3 flex items-start justify-between">
                  <Mail className="h-4 w-4 text-text-3" />
                  <Badge variant={statusVariant(seq.status)}>{seq.status}</Badge>
                </div>
                <h3 className="mb-1 truncate text-title text-text">
                  {seq.name}
                </h3>
                <div className="flex items-center gap-2 text-body-s text-text-3">
                  <Badge variant="secondary">{typeLabel(seq.type)}</Badge>
                  <span>
                    {seq.step_count} email{seq.step_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-caption text-text-3 mt-2 mb-4">
                  Created{" "}
                  {new Date(seq.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {/* Inline actions — both clearly labeled so users don't have
                    to click into the detail dialog just to find Send. */}
                <div className="mt-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={seq.step_count === 0}
                    onClick={() => openEnroll(seq.id)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send to a list
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDetail(seq.id)}
                  >
                    Preview
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sequence Detail Dialog */}
      <Dialog
        open={!!selectedSeq || detailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSeq(null);
            setDetailLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-3 py-2" role="status" aria-label="Loading">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : selectedSeq ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSeq.name}</DialogTitle>
                <DialogDescription>
                  {typeLabel(selectedSeq.type)} series &middot;{" "}
                  {selectedSeq.email_sequence_steps?.length ?? 0} email
                  {(selectedSeq.email_sequence_steps?.length ?? 0) !== 1
                    ? "s"
                    : ""}
                </DialogDescription>
                <div className="pt-3">
                  <Button size="sm" onClick={() => openEnroll(selectedSeq.id)}>
                    <Users className="h-3.5 w-3.5" />
                    Send to a list
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedSeq.email_sequence_steps?.map((step, i) => (
                  <div
                    key={step.id}
                    className="rounded-md border border-line bg-ground p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-caption text-text-2">
                          {i + 1}
                        </span>
                        <h4 className="text-title text-text">
                          {step.subject_line ||
                            step.assets?.content?.subject ||
                            "(no subject)"}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyStep(step);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendTest(step);
                          }}
                          disabled={sendingStep === step.id}
                        >
                          {sendingStep !== step.id && (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {sendingStep === step.id ? "Sending…" : "Send a test"}
                        </Button>
                      </div>
                    </div>

                    {(step.preview_text || step.assets?.content?.preview_text) && (
                      <p className="text-body-s text-text-2 mb-2">
                        {step.preview_text || step.assets?.content?.preview_text}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-caption text-text-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {describeDelay(step.delay_hours)}
                      </span>
                      {step.assets?.content?.cta_text && (
                        <span>Button: {step.assets.content.cta_text}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Enroll Audience Dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send this series to a list</DialogTitle>
            <DialogDescription>
              Everyone subscribed gets the series, one email at a time on the
              delays you set. People who unsubscribed or bounced are skipped.
            </DialogDescription>
          </DialogHeader>

          {audiences.length === 0 ? (
            <EmptyState
              title="No subscriber lists yet. Make one first."
              action={
                <Button asChild size="sm">
                  <Link href={`/projects/${projectId}/audiences`}>
                    Make a list
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {audiences.map((aud) => {
                  const isSelected = selectedAudienceId === aud.id;
                  const isEmpty = aud.contact_count === 0;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => !isEmpty && setSelectedAudienceId(aud.id)}
                      disabled={isEmpty}
                      aria-pressed={isSelected}
                      className={`w-full rounded-md border p-3 text-left transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                        isSelected
                          ? "border-accent bg-accent-soft"
                          : "border-line hover:bg-surface-2"
                      } ${isEmpty ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate text-title text-text">
                          {aud.name}
                        </span>
                        <span className="text-caption text-text-3 font-mono shrink-0 ml-2">
                          {aud.contact_count} subscribed
                        </span>
                      </div>
                      {isEmpty && (
                        <p className="text-caption text-text-3 mt-1">
                          No one subscribed to send to yet.
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedAudienceId && enrollForSeqId && (
                <div className="rounded-md bg-surface-2 p-3 text-body-s">
                  <p className="text-text-2">
                    {(() => {
                      const a = audiences.find((x) => x.id === selectedAudienceId);
                      // Step count from whichever source we have. The
                      // detail-loaded selectedSeq has the full steps array;
                      // the list view only has step_count. Either is fine
                      // because we matched on enrollForSeqId.
                      const detailMatches =
                        selectedSeq?.id === enrollForSeqId
                          ? selectedSeq.email_sequence_steps?.length
                          : undefined;
                      const listMatch = sequences.find((s) => s.id === enrollForSeqId);
                      const stepCount =
                        detailMatches ?? listMatch?.step_count ?? 0;
                      const total = (a?.contact_count ?? 0) * stepCount;
                      return (
                        <>
                          This sends{" "}
                          <span className="font-mono text-text">
                            {stepCount}
                          </span>{" "}
                          email{stepCount === 1 ? "" : "s"} to{" "}
                          <span className="font-mono text-text">
                            {a?.contact_count}
                          </span>{" "}
                          {(a?.contact_count ?? 0) === 1 ? "person" : "people"}:{" "}
                          <span className="font-mono text-text">{total}</span>{" "}
                          email{total === 1 ? "" : "s"} in all over the life
                          of the series.
                        </>
                      );
                    })()}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnrollOpen(false)}
                  disabled={enrolling}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleEnroll}
                  disabled={!selectedAudienceId || enrolling}
                >
                  {enrolling ? "Starting…" : "Start sending"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
