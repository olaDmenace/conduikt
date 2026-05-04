"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Loader2,
  X,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface Audience {
  id: string;
  name: string;
  description: string | null;
  resend_audience_id: string | null;
  contact_count: number;
  created_at: string;
}

export default function AudiencesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function fetchAudiences() {
    const res = await fetch(`/api/projects/${projectId}/audiences`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      setAudiences(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAudiences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleCreate() {
    if (!name.trim()) {
      toast("Name is required", "warning");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/audiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Failed to create audience", "error");
        return;
      }
      toast("Audience created", "success");
      setCreateOpen(false);
      setName("");
      setDescription("");
      await fetchAudiences();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Audiences"
        description="Mailing lists for email broadcasts. Each audience holds contacts you can send to."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Audience
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : audiences.length === 0 ? (
        <Card className="border-dashed border-border-strong animate-in">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 rounded-xl bg-accent-muted p-4">
              <Users className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-h2 text-text-primary">No audiences yet</h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Create an audience to start collecting contacts. Once you have one,
              you can send broadcasts from any generated email.
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create your first audience
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audiences.map((aud, i) => (
            <Link
              key={aud.id}
              href={`/projects/${projectId}/audiences/${aud.id}`}
              className="group block animate-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardContent>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Mail className="h-5 w-5 text-accent" />
                    <Badge variant="secondary">
                      {aud.contact_count}{" "}
                      {aud.contact_count === 1 ? "contact" : "contacts"}
                    </Badge>
                  </div>
                  <h3 className="text-h3 text-text-primary truncate">
                    {aud.name}
                  </h3>
                  {aud.description && (
                    <p className="mt-1 text-small text-text-secondary line-clamp-2">
                      {aud.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-caption text-text-tertiary">
                    <span>
                      Created{" "}
                      {new Date(aud.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-surface-0/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border-default bg-surface-1 p-6 shadow-[var(--shadow-elevated)]">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-h2 text-text-primary mb-1">New Audience</h2>
            <p className="text-small text-text-secondary mb-6">
              Give your list a name. You can import contacts from CSV after creating it.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-caption text-text-tertiary mb-2 block">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  placeholder="e.g., Newsletter, Beta Users"
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-caption text-text-tertiary mb-2 block">
                  Description <span className="text-text-tertiary">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Who's on this list? What kind of emails go to them?"
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {creating ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
