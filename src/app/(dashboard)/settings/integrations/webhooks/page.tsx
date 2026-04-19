"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Globe,
  Zap,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
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
      toast("Webhook created!", "success");
      setForm({ name: "", type: "generic", endpoint_url: "", auth_token: "" });
      setShowForm(false);
      fetchWebhooks();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to create", "error");
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
      toast(err.error || "Failed to update webhook", "error");
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
      toast(err.error || "Failed to delete webhook", "error");
      return;
    }
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    toast("Webhook deleted", "info");
  }

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Push generated content to external tools automatically"
      >
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="animate-in mb-6">
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Name"
                  placeholder="My WordPress blog"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <div>
                  <label className="text-small font-medium text-text-secondary block mb-1.5">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-body text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>
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
                  label="Auth Token (optional)"
                  type={showAuthToken ? "text" : "password"}
                  placeholder="Bearer token or application password"
                  value={form.auth_token}
                  onChange={(e) => setForm({ ...form, auth_token: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowAuthToken((v) => !v)}
                  className="absolute right-3 top-10 text-text-tertiary hover:text-text-primary transition-colors"
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
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Webhook"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card className="animate-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Zap className="h-10 w-10 text-text-tertiary mb-4" />
            <p className="text-body text-text-secondary">No webhooks configured</p>
            <p className="text-small text-text-tertiary mt-1">
              Connect WordPress, Webflow, Buffer, or any custom endpoint
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook, i) => (
            <Card
              key={webhook.id}
              className="animate-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-surface-2 p-2">
                    <Globe className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-body">{webhook.name}</CardTitle>
                    <p className="text-caption text-text-tertiary truncate max-w-[300px]">
                      {webhook.endpoint_url}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{webhook.type}</Badge>
                  <button
                    onClick={() => handleToggle(webhook.id, webhook.active)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    {webhook.active ? (
                      <ToggleRight className="h-5 w-5 text-success" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="rounded-lg p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
