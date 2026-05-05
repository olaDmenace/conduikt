"use client";

import { useEffect, useState, use } from "react";
import {
  Mail,
  Loader2,
  FileText,
  Send,
  Clock,
  CheckCircle2,
  Inbox,
  Copy,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
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
      const skippedNote = skipped > 0 ? ` (${skipped} already enrolled)` : "";
      toast(
        `Enrolled ${enrolled} contact${enrolled === 1 ? "" : "s"}${skippedNote}. First step sends shortly.`,
        "success"
      );
      setEnrollOpen(false);
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Could not enroll", "error");
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
      toast("That doesn't look like a valid email address", "error");
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
      toast(data.error || "Failed to send", "error");
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
    toast("Email copied — paste into your ESP", "success");
  }

  const totalSteps = sequences.reduce((s, seq) => s + seq.step_count, 0);
  const activeCount = sequences.filter((s) => s.status === "active").length;
  const draftCount = sequences.filter((s) => s.status === "draft").length;

  return (
    <div>
      <PageHeader
        title="Email Sequences"
        description="Preview each step, send test emails to yourself, and copy content into your ESP for scheduled sends."
      >
        <Button asChild>
          <Link
            href={`/projects/${projectId}/content?skill=email-sequence`}
          >
            Create Sequence
          </Link>
        </Button>
      </PageHeader>


      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Sequences",
            value: sequences.length,
            icon: Inbox,
            color: "text-accent",
          },
          {
            label: "Active",
            value: activeCount,
            icon: CheckCircle2,
            color: "text-success",
          },
          {
            label: "Draft",
            value: draftCount,
            icon: FileText,
            color: "text-warning",
          },
          {
            label: "Total Emails",
            value: totalSteps,
            icon: Mail,
            color: "text-info",
          },
        ].map((stat, i) => (
          <Card
            key={stat.label}
            className="animate-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="py-4 flex items-center gap-3">
              <div className="rounded-lg bg-surface-2 p-2 shrink-0">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-text-primary">
                  {stat.value}
                </p>
                <p className="text-caption text-text-tertiary">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : sequences.length === 0 ? (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Mail className="h-12 w-12 text-text-tertiary mb-4" />
            <h3 className="text-h3 text-text-primary">
              No email sequences yet
            </h3>
            <p className="mt-2 text-body text-text-secondary max-w-md">
              Use the Email agent to generate a nurture or onboarding sequence.
              Once saved, you can preview each step, send yourself a test, and
              copy the email into your own ESP to broadcast to your list.
            </p>
            <Button className="mt-6" asChild>
              <Link href={`/projects/${projectId}/content?skill=email-sequence`}>
                Create Your First Sequence
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences.map((seq, i) => (
            <Card
              key={seq.id}
              className="animate-in hover:border-accent/40 transition-colors flex flex-col"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg bg-surface-2 p-2.5">
                    <Mail className="h-4 w-4 text-accent" />
                  </div>
                  <Badge variant={statusVariant(seq.status)}>{seq.status}</Badge>
                </div>
                <h3 className="text-body font-medium text-text-primary mb-1 truncate">
                  {seq.name}
                </h3>
                <div className="flex items-center gap-2 text-small text-text-tertiary">
                  <Badge variant="secondary">{typeLabel(seq.type)}</Badge>
                  <span>
                    {seq.step_count} email{seq.step_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-caption text-text-tertiary mt-2 mb-4">
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
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send to audience
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDetail(seq.id)}
                  >
                    Preview
                  </Button>
                </div>
              </CardContent>
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
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-accent animate-spin" />
            </div>
          ) : selectedSeq ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSeq.name}</DialogTitle>
                <DialogDescription>
                  {typeLabel(selectedSeq.type)} sequence &middot;{" "}
                  {selectedSeq.email_sequence_steps?.length ?? 0} email
                  {(selectedSeq.email_sequence_steps?.length ?? 0) !== 1
                    ? "s"
                    : ""}
                </DialogDescription>
                <div className="pt-3">
                  <Button size="sm" onClick={() => openEnroll(selectedSeq.id)}>
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Send to audience
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedSeq.email_sequence_steps?.map((step, i) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-border-default bg-surface-0 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-accent/10 text-accent text-caption font-mono font-bold">
                          {i + 1}
                        </span>
                        <h4 className="text-body font-medium text-text-primary">
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
                          <Copy className="h-3.5 w-3.5 mr-1" />
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
                          {sendingStep === step.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Send className="h-3.5 w-3.5 mr-1" />
                          )}
                          Send Test
                        </Button>
                      </div>
                    </div>

                    {(step.preview_text || step.assets?.content?.preview_text) && (
                      <p className="text-small text-text-secondary mb-2">
                        {step.preview_text || step.assets?.content?.preview_text}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-caption text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {describeDelay(step.delay_hours)}
                      </span>
                      {step.assets?.content?.cta_text && (
                        <span>CTA: {step.assets.content.cta_text}</span>
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
            <DialogTitle>Send sequence to an audience</DialogTitle>
            <DialogDescription>
              Every subscribed contact will be enrolled. Steps fire on their
              configured delays. Unsubscribed and bounced contacts are
              skipped.
            </DialogDescription>
          </DialogHeader>

          {audiences.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-default p-6 text-center">
              <p className="text-body text-text-secondary mb-4">
                No audiences yet — create one before enrolling.
              </p>
              <Button asChild size="sm">
                <Link href={`/projects/${projectId}/audiences`}>
                  Create Audience
                </Link>
              </Button>
            </div>
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
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? "border-accent bg-accent/5"
                          : "border-border-default hover:border-border-strong"
                      } ${isEmpty ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-body font-medium text-text-primary truncate">
                          {aud.name}
                        </span>
                        <span className="text-caption text-text-tertiary font-mono shrink-0 ml-2">
                          {aud.contact_count} subscribed
                        </span>
                      </div>
                      {isEmpty && (
                        <p className="text-caption text-text-tertiary mt-1">
                          No subscribed contacts to send to.
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedAudienceId && enrollForSeqId && (
                <div className="rounded-lg bg-surface-2 p-3 text-small">
                  <p className="text-text-secondary">
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
                          About to enroll{" "}
                          <span className="font-mono text-text-primary">
                            {a?.contact_count}
                          </span>{" "}
                          contact{(a?.contact_count ?? 0) === 1 ? "" : "s"} across{" "}
                          <span className="font-mono text-text-primary">
                            {stepCount}
                          </span>{" "}
                          step{stepCount === 1 ? "" : "s"} —{" "}
                          <span className="font-mono text-accent">{total}</span>{" "}
                          email{total === 1 ? "" : "s"} total over the
                          sequence's lifetime.
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
                  {enrolling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Enrolling...
                    </>
                  ) : (
                    "Enroll & start sending"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
