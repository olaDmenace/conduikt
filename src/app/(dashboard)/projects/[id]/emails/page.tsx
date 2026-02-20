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
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { ProjectNav } from "@/src/components/layout/project-nav";
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
  subject: string;
  delay_days: number;
  asset_id: string | null;
  assets: {
    id: string;
    content: {
      subject?: string;
      preview_text?: string;
      html?: string;
      cta_text?: string;
      cta_url?: string;
    };
    title: string | null;
    status: string;
  } | null;
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

  async function handleSendTest(step: SequenceStep) {
    if (!step.assets?.content) return;
    setSendingStep(step.id);
    const res = await fetch("/api/publish/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "test@example.com",
        subject: step.subject,
        html: step.assets.content.html || `<p>${step.subject}</p>`,
      }),
    });
    if (res.ok) {
      toast("Test email sent", "success");
    } else {
      const data = await res.json();
      toast(data.error || "Failed to send", "error");
    }
    setSendingStep(null);
  }

  const totalSteps = sequences.reduce((s, seq) => s + seq.step_count, 0);
  const activeCount = sequences.filter((s) => s.status === "active").length;
  const draftCount = sequences.filter((s) => s.status === "draft").length;

  return (
    <div>
      <PageHeader
        title="Email Sequences"
        description="Manage your automated email sequences"
      >
        <Button asChild>
          <Link
            href={`/projects/${projectId}/agents/email-sequence`}
          >
            Create Sequence
          </Link>
        </Button>
      </PageHeader>

      <ProjectNav projectId={projectId} />

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
              Use the Email agent to generate a nurture or onboarding sequence,
              then manage and send tests from here.
            </p>
            <Button className="mt-6" asChild>
              <Link href={`/projects/${projectId}/agents/email-sequence`}>
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
              className="animate-in cursor-pointer hover:border-accent/40 transition-colors"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => openDetail(seq.id)}
            >
              <CardContent className="p-5">
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
                <p className="text-caption text-text-tertiary mt-2">
                  Created{" "}
                  {new Date(seq.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
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
                          {step.subject}
                        </h4>
                      </div>
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

                    {step.assets?.content?.preview_text && (
                      <p className="text-small text-text-secondary mb-2">
                        {step.assets.content.preview_text}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-caption text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.delay_days === 0
                          ? "Immediately"
                          : `Day ${step.delay_days}`}
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
    </div>
  );
}
