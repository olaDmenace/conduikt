"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Globe,
  Zap,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Button, IconButton } from "@/src/components/ui/button";
import { Input, Field } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Badge } from "@/src/components/ui/badge";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface Webhook {
  id: string;
  name: string;
  type: string;
  endpoint_url: string;
  active: boolean;
  created_at: string;
}

const TYPE_OPTIONS = [
  { value: "wordpress", label: "WordPress", desc: "Post as draft to WP REST API" },
  { value: "webflow", label: "Webflow", desc: "Push to Webflow CMS" },
  { value: "buffer", label: "Buffer", desc: "Queue social content in Buffer" },
  { value: "generic", label: "Generic (Zapier/Make)", desc: "POST JSON to any URL" },
];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "generic",
    endpoint_url: "",
    auth_token: "",
  });

  async function fetchWebhooks() {
    const res = await fetch("/api/webhooks");
    if (res.ok) {
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : data.webhooks ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast("Webhook created", "success");
      setForm({ name: "", type: "generic", endpoint_url: "", auth_token: "" });
      setShowForm(false);
      fetchWebhooks();
    } else {
      const err = await res.json();
      toast(err.error || "We couldn't create the webhook. Try again.", "error");
    }
    setSaving(false);
  }

  async function handleToggle(id: string, active: boolean) {
    const res = await fetch(`/api/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "We couldn't update the webhook. Try again.", "error");
      return;
    }
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !active } : w))
    );
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "We couldn't delete the webhook. Try again.", "error");
      return;
    }
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    toast("Webhook deleted", "info");
  }

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Send what Conduikt writes to your other tools automatically."
      >
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add webhook
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="animate-in mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                placeholder="My WordPress blog"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Field label="Type" htmlFor="webhook-type">
                <select
                  id="webhook-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}: {opt.desc}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Input
              label="Endpoint URL"
              type="url"
              placeholder="https://mysite.com/wp-json/wp/v2/posts"
              value={form.endpoint_url}
              onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
              required
            />
            <div className="relative">
              <Input
                label="Auth token (optional)"
                type={showAuthToken ? "text" : "password"}
                placeholder="Bearer token or application password"
                className="pr-10"
                value={form.auth_token}
                onChange={(e) => setForm({ ...form, auth_token: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowAuthToken((v) => !v)}
                aria-label={showAuthToken ? "Hide token" : "Show token"}
                className="absolute right-3 top-[37px] text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-text"
              >
                {showAuthToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create webhook"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading webhooks">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState
          className="animate-in"
          icon={<Zap className="h-8 w-8" />}
          title="No webhooks yet. Connect WordPress, Webflow, Buffer or any URL that accepts JSON."
          action={
            !showForm ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Add webhook
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook, i) => (
            <Card
              key={webhook.id}
              className="animate-in flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Globe className="h-4 w-4 shrink-0 text-text-3" aria-hidden />
                <div className="min-w-0">
                  <h3 className="text-title text-text">{webhook.name}</h3>
                  <p className="max-w-[300px] truncate font-mono text-caption text-text-3">
                    {webhook.endpoint_url}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{webhook.type}</Badge>
                <IconButton
                  label={webhook.active ? `Turn off ${webhook.name}` : `Turn on ${webhook.name}`}
                  aria-pressed={webhook.active}
                  onClick={() => handleToggle(webhook.id, webhook.active)}
                >
                  {webhook.active ? (
                    <ToggleRight className="h-5 w-5 text-teal" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </IconButton>
                <IconButton
                  label={`Delete ${webhook.name}`}
                  onClick={() => handleDelete(webhook.id)}
                  className="hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
