"use client";

import { use, useEffect, useState } from "react";
import {
  ClipboardList,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
} from "@/src/components/ui/lucide-icons";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";

interface LeadForm {
  id: string;
  name: string;
  headline: string | null;
  audience_id: string;
  sequence_id: string | null;
  redirect_url: string | null;
  submit_label: string;
  thank_you_message: string;
  is_active: boolean;
  submission_count: number;
  created_at: string;
  audiences: { id: string; name: string } | { id: string; name: string }[] | null;
  email_sequences:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
}

interface AudienceOption {
  id: string;
  name: string;
}

interface SequenceOption {
  id: string;
  name: string;
}

function pickRel<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export default function FormsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [sequences, setSequences] = useState<SequenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [submitLabel, setSubmitLabel] = useState("Subscribe");
  const [embedFor, setEmbedFor] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [fRes, aRes, sRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/forms`),
      fetch(`/api/projects/${projectId}/audiences`),
      fetch(`/api/projects/${projectId}/email-sequences`),
    ]);
    if (fRes.ok) setForms(await fRes.json());
    if (aRes.ok) setAudiences(await aRes.json());
    if (sRes.ok) setSequences(await sRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !audienceId) {
      toast("Form name and audience are required", "warning");
      return;
    }
    setCreating(true);
    const res = await fetch(`/api/projects/${projectId}/forms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        audience_id: audienceId,
        sequence_id: sequenceId || null,
        headline: headline.trim() || null,
        submit_label: submitLabel.trim() || "Subscribe",
      }),
    });
    setCreating(false);
    if (res.ok) {
      const created = await res.json();
      setCreateOpen(false);
      setName("");
      setHeadline("");
      setAudienceId("");
      setSequenceId("");
      setSubmitLabel("Subscribe");
      await loadAll();
      setEmbedFor(created.id);
      toast("Form created. Copy the snippet onto your site.", "success");
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Could not create form", "error");
    }
  }

  async function handleDelete(formId: string, formName: string) {
    if (
      !window.confirm(
        `Delete the "${formName}" form? Existing submissions stay in the audience but the form will stop accepting new ones.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/projects/${projectId}/forms/${formId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setForms((prev) => prev.filter((f) => f.id !== formId));
      toast("Form deleted", "success");
    } else {
      toast("Could not delete form", "error");
    }
  }

  async function handleToggleActive(form: LeadForm) {
    const res = await fetch(
      `/api/projects/${projectId}/forms/${form.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !form.is_active }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setForms((prev) =>
        prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
      );
      toast(
        updated.is_active ? "Form is now accepting submissions" : "Form paused",
        "success"
      );
    }
  }

  function embedSnippet(formId: string): string {
    // Prefer the deployment's actual host so dev users see localhost; in
    // SSR we won't have window so this falls back to the prod URL.
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://conduikt.com";
    return `<div data-conduikt-form="${formId}"></div>\n<script src="${origin}/embed/form.js" defer></script>`;
  }

  function copyEmbed(formId: string) {
    navigator.clipboard.writeText(embedSnippet(formId));
    toast("Embed snippet copied", "success");
  }

  const totalSubs = forms.reduce((sum, f) => sum + f.submission_count, 0);

  return (
    <div>
      <PageHeader
        title="Signup forms"
        description="Put a form on your site. Signups go straight into an audience and can start an email sequence."
      >
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={audiences.length === 0}
        >
          <Plus className="h-4 w-4" />
          New form
        </Button>
      </PageHeader>

      {audiences.length === 0 && !loading && (
        <EmptyState
          className="mb-6"
          title="You need an audience before you can make a form."
          action={
            <Button asChild size="sm">
              <a href={`/projects/${projectId}/audiences`}>
                Create an audience
              </a>
            </Button>
          }
        />
      )}

      {/* Stats */}
      <KpiStrip
        className="mb-8 rail:grid-cols-3"
        cells={[
          { label: "Forms", value: String(forms.length) },
          { label: "Active", value: String(forms.filter((f) => f.is_active).length) },
          { label: "Signups", value: String(totalSubs) },
        ]}
      />

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading forms">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No forms yet. Make one to collect email signups from your site or blog."
          action={
            audiences.length > 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                Create your first form
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {forms.map((form, i) => {
            const audience = pickRel(form.audiences);
            const sequence = pickRel(form.email_sequences);
            return (
              <Card
                key={form.id}
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-title text-text truncate">
                          {form.name}
                        </h3>
                        <Badge
                          variant={form.is_active ? "success" : "secondary"}
                        >
                          {form.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <div className="text-body-s text-text-2 space-x-3">
                        {audience && (
                          <span>
                            Audience:{" "}
                            <span className="text-text">
                              {audience.name}
                            </span>
                          </span>
                        )}
                        {sequence && (
                          <span>
                            Sequence:{" "}
                            <span className="text-text">
                              {sequence.name}
                            </span>
                          </span>
                        )}
                        <span className="text-text-3 font-mono">
                          {form.submission_count} submission
                          {form.submission_count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEmbedFor(form.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Embed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(form)}
                      >
                        {form.is_active ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(form.id, form.name)}
                        aria-label={`Delete ${form.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New form</DialogTitle>
            <DialogDescription>
              Pick which audience receives signups, and optionally trigger a
              welcome sequence on submit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Form name"
              placeholder="Newsletter signup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Headline (optional)"
              placeholder="Get weekly insights"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
            <div>
              <label className="text-body-s text-text-2 block mb-1.5">
                Audience
              </label>
              <select
                value={audienceId}
                onChange={(e) => setAudienceId(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">Select an audience…</option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-body-s text-text-2 block mb-1.5">
                Trigger a sequence on submit (optional)
              </label>
              <select
                value={sequenceId}
                onChange={(e) => setSequenceId(e.target.value)}
                className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <option value="">None — just add to audience</option>
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Submit button label"
              value={submitLabel}
              onChange={(e) => setSubmitLabel(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating…" : "Create form"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Embed snippet dialog */}
      <Dialog open={!!embedFor} onOpenChange={(open) => !open && setEmbedFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed snippet</DialogTitle>
            <DialogDescription>
              Paste this anywhere on your site where the form should
              appear. The script fills in the empty div with your form.
            </DialogDescription>
          </DialogHeader>
          {embedFor && (
            <>
              <pre className="rounded-md border border-line bg-surface-2 p-4 text-caption font-mono text-text overflow-x-auto whitespace-pre-wrap">
                {embedSnippet(embedFor)}
              </pre>
              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/embed/form.js`, "_blank")}
                >
                  View widget script
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" onClick={() => copyEmbed(embedFor)}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy snippet
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
