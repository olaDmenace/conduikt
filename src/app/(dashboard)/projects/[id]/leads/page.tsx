"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Users, Mail, Smartphone, MessageCircle } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/src/lib/leads/stages";
import type { LeadRow, LeadsResponse } from "@/src/lib/leads/types";
import { bookingMessage } from "@/src/lib/leads/booking-message";

// Five-column pipeline: New, Contacted, Qualified, Won, Lost. Every
// contact across the project's subscriber lists is a lead. The score is
// rule-based (src/lib/leads/score.ts) and the stage moves with the select
// on each card. "Send booking link" copies a ready message with the
// project's booking link; nothing is sent from here.

const MAX_LEADS = 200;

function displayName(lead: LeadRow): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  return name || lead.email;
}

function agoLabel(iso: string | null): string {
  if (!iso) return "No activity yet";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "No activity yet";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "Active today";
  if (days === 1) return "Active yesterday";
  if (days < 30) return `Active ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Active ${months} ${months === 1 ? "month" : "months"} ago`;
}

function sourceLabel(source: string | null): string {
  switch ((source ?? "").toLowerCase()) {
    case "form":
      return "Sign-up form";
    case "import":
    case "csv":
      return "Imported";
    case "manual":
      return "Added by you";
    case "whatsapp":
      return "WhatsApp";
    case "":
      return "Subscriber";
    default:
      return source as string;
  }
}

// audience_contacts.status: subscribed, pending (double opt-in, not yet
// confirmed), unsubscribed, bounced, complained, suppressed. Only the
// states where email will not reach them are a warning.
function statusNote(status: string): { label: string; warn: boolean } | null {
  switch (status) {
    case "subscribed":
      return null;
    case "pending":
      return { label: "Waiting to confirm", warn: false };
    case "unsubscribed":
      return { label: "Unsubscribed", warn: true };
    case "bounced":
      return { label: "Email bounced", warn: true };
    case "complained":
      return { label: "Complained", warn: true };
    case "suppressed":
      return { label: "Suppressed", warn: true };
    default:
      return status ? { label: status, warn: false } : null;
  }
}

function scoreVariant(score: number): "success" | "default" | "secondary" {
  if (score >= 70) return "success";
  if (score >= 40) return "default";
  return "secondary";
}

export default function LeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { toast } = useToast();

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("us");
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [res, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/leads?limit=${MAX_LEADS}`, { cache: "no-store" }).catch(() => null),
        fetch(`/api/projects/${projectId}`, { cache: "no-store" }).catch(() => null),
      ]);
      if (cancelled) return;
      if (res?.ok) {
        const data = (await res.json()) as LeadsResponse;
        setLeads(data.leads);
        setTotal(data.total);
        setBookingUrl(data.booking_url);
      } else {
        toast("Couldn't load your leads. Refresh to try again.", "error");
      }
      if (projectRes?.ok) {
        const p = await projectRes.json();
        if (typeof p?.name === "string" && p.name.trim()) setProjectName(p.name.trim());
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, toast]);

  const byStage = useMemo(() => {
    const groups: Record<PipelineStage, LeadRow[]> = { new: [], contacted: [], qualified: [], won: [], lost: [] };
    for (const lead of leads) groups[lead.stage].push(lead);
    return groups;
  }, [leads]);

  async function moveStage(lead: LeadRow, stage: PipelineStage) {
    if (stage === lead.stage || moving) return;
    const previous = lead.stage;
    setMoving(lead.id);
    setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, stage } : l)));
    const res = await fetch(`/api/projects/${projectId}/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, stage, stage_changed_at: data.stage_changed_at ?? l.stage_changed_at } : l)));
      toast(`${displayName(lead)}: ${STAGE_LABELS[stage]}`, "success");
    } else {
      setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, stage: previous } : l)));
      toast("Couldn't move that lead. Try again.", "error");
    }
    setMoving(null);
  }

  async function copyBookingMessage(lead: LeadRow) {
    if (!bookingUrl) return;
    const message = bookingMessage(lead, projectName, bookingUrl);
    try {
      await navigator.clipboard.writeText(message);
      toast("Message copied. Paste it into WhatsApp or email.", "success");
    } catch {
      toast("Couldn't copy. Select the text and copy it yourself.", "error");
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Leads" description="Everyone who got in touch, from first hello to booked." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" role="status" aria-label="Loading leads">
          {PIPELINE_STAGES.map((s) => (
            <Skeleton key={s} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description={
          total === 0
            ? "Everyone who got in touch, from first hello to booked."
            : `${total} ${total === 1 ? "lead" : "leads"} across your subscriber lists.${total > MAX_LEADS ? ` Showing the latest ${MAX_LEADS}.` : ""}`
        }
      >
        {!bookingUrl && (
          <Link href={`/projects/${projectId}/settings`} className="hover-link text-body-s text-accent hover:text-accent-hover">
            Add a booking link to send it from here
          </Link>
        )}
      </PageHeader>

      {leads.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No leads yet. Subscribers and sign-up form entries show up here."
          action={
            <Button asChild size="sm">
              <Link href={`/projects/${projectId}/audiences`}>Add subscribers</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {PIPELINE_STAGES.map((stage, i) => {
            const column = byStage[stage];
            return (
              <section
                key={stage}
                aria-labelledby={`stage-${stage}`}
                className="animate-in flex min-h-[200px] flex-col gap-3 rounded-lg border border-line bg-ground p-3"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center justify-between px-1">
                  <h2 id={`stage-${stage}`} className="text-title text-text">
                    {STAGE_LABELS[stage]}
                  </h2>
                  <span className="font-mono text-xs text-text-3">{column.length}</span>
                </div>

                {column.length === 0 ? (
                  <p className="px-1 text-caption text-text-3">Nobody here yet.</p>
                ) : (
                  column.map((lead) => {
                    const note = statusNote(lead.status);
                    return (
                      <Card key={lead.id} className="flex flex-col gap-2.5 p-3 md:p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-title text-text">{displayName(lead)}</p>
                            {displayName(lead) !== lead.email && (
                              <p className="flex items-center gap-1 truncate text-caption text-text-2">
                                <Mail className="h-3 w-3 shrink-0" />
                                {lead.email}
                              </p>
                            )}
                            {lead.phone && (
                              <p className="flex items-center gap-1 truncate text-caption text-text-2">
                                <Smartphone className="h-3 w-3 shrink-0" />
                                {lead.phone}
                                {lead.whatsapp_opt_in && <span className="text-text-3">· WhatsApp ok</span>}
                              </p>
                            )}
                          </div>
                          <Badge variant={scoreVariant(lead.score)} title={lead.score_reasons.join(". ")}>
                            {lead.score} of 100
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-3">
                          <span>{sourceLabel(lead.source)}</span>
                          <span aria-hidden>·</span>
                          <span>{agoLabel(lead.last_activity_at)}</span>
                          {note && (
                            <>
                              <span aria-hidden>·</span>
                              <span className={note.warn ? "text-danger" : undefined}>{note.label}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <label htmlFor={`stage-select-${lead.id}`} className="sr-only">
                            Stage for {displayName(lead)}
                          </label>
                          <select
                            id={`stage-select-${lead.id}`}
                            value={lead.stage}
                            disabled={moving === lead.id}
                            onChange={(e) => moveStage(lead, e.target.value as PipelineStage)}
                            className="h-8 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2 text-[13px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            disabled={!bookingUrl}
                            title={bookingUrl ? "Copy a message with your booking link" : "Add a booking link in settings first"}
                            onClick={() => copyBookingMessage(lead)}
                            className="shrink-0 px-2"
                            aria-label={`Send booking link to ${displayName(lead)}`}
                          >
                            {lead.whatsapp_opt_in ? <MessageCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            <span className="hidden xl:inline">Send booking link</span>
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
