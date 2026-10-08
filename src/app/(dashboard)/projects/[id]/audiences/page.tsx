"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  X,
  Mail,
  ArrowRight,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Field, Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
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
      toast("Give the list a name first", "warning");
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
        toast(err.error ?? "Couldn't make the list. Try again.", "error");
        return;
      }
      toast("List made", "success");
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
        title="Subscribers"
        description="Your email lists. Each list holds the people you can send one-off emails to."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New list
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : audiences.length === 0 ? (
        <EmptyState
          className="animate-in"
          icon={<Users className="h-6 w-6" />}
          title="No subscriber lists yet. Make one to start collecting emails, then send to it from any email we write."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Make your first list
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audiences.map((aud, i) => (
            <Link
              key={aud.id}
              href={`/projects/${projectId}/audiences/${aud.id}`}
              className="group block animate-in"
              style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
            >
              <Card className="hover-card hover-card-quiet h-full">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Mail className="h-5 w-5 text-text-3" />
                  <Badge variant="secondary">
                    {aud.contact_count}{" "}
                    {aud.contact_count === 1 ? "person" : "people"}
                  </Badge>
                </div>
                <h3 className="truncate text-title text-text">{aud.name}</h3>
                {aud.description && (
                  <p className="mt-1 line-clamp-2 text-body-s text-text-2">
                    {aud.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between text-caption text-text-3">
                  <span>
                    Made{" "}
                    {new Date(aud.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-list-title"
            className="relative w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
          >
            <IconButton
              label="Close"
              size="sm"
              onClick={() => setCreateOpen(false)}
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </IconButton>
            <h2 id="new-list-title" className="mb-1 text-heading text-text">
              New list
            </h2>
            <p className="mb-6 text-body-s text-text-2">
              Give your list a name. You can import people from a CSV once it&apos;s made.
            </p>
            <div className="space-y-4">
              <Input
                label="Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                placeholder="Try: Newsletter"
                autoFocus
              />
              <Field label="Description (optional)" htmlFor="new-list-description">
                <textarea
                  id="new-list-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Who's on this list? What kind of emails go to them?"
                  className="w-full resize-none rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={creating || !name.trim()}>
                  {!creating && <Plus className="h-4 w-4" />}
                  {creating ? "Making…" : "Make list"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
