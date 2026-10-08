"use client";

import { useState, useEffect } from "react";
import { Shield, UserPlus, UserMinus, Mail, X, Plus } from "@/src/components/ui/lucide-icons";
import { Button, IconButton } from "@/src/components/ui/button";

type Admin = {
  id: string;
  full_name: string | null;
  email: string;
  lastSignIn: string | null;
  created_at: string;
};

export function AdminSettingsClient({ admins: initialAdmins }: { admins: Admin[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-admin emails state
  const [autoEmails, setAutoEmails] = useState<string[]>([]);
  const [newAutoEmail, setNewAutoEmail] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoMessage, setAutoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load auto-admin emails on mount
  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => setAutoEmails(d.emails ?? []))
      .catch(() => {});
  }, []);

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!promoteEmail.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: promoteEmail.trim(), action: "promote" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: `${data.user.name ?? promoteEmail} promoted to admin` });
        setPromoteEmail("");
        setAdmins((prev) => [
          ...prev,
          { id: data.user.id, full_name: data.user.name, email: promoteEmail.trim(), lastSignIn: null, created_at: new Date().toISOString() },
        ]);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDemote(admin: Admin) {
    if (!confirm(`Remove admin access from ${admin.full_name ?? admin.email}?`)) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: admin.email, action: "demote" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: `${admin.full_name ?? admin.email} demoted to user` });
        setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function saveAutoEmails(emails: string[]) {
    setAutoLoading(true);
    setAutoMessage(null);

    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAutoMessage({ type: "error", text: data.error });
      } else {
        setAutoEmails(data.emails);
        setAutoMessage({ type: "success", text: "Auto-admin emails updated" });
      }
    } catch {
      setAutoMessage({ type: "error", text: "Network error" });
    } finally {
      setAutoLoading(false);
    }
  }

  function handleAddAutoEmail(e: React.FormEvent) {
    e.preventDefault();
    const email = newAutoEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (autoEmails.includes(email)) {
      setAutoMessage({ type: "error", text: "Email already in list" });
      return;
    }
    const updated = [...autoEmails, email];
    setNewAutoEmail("");
    saveAutoEmails(updated);
  }

  function handleRemoveAutoEmail(email: string) {
    const updated = autoEmails.filter((e) => e !== email);
    saveAutoEmails(updated);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-s text-text">Admin settings</h1>
        <p className="mt-1 text-body text-text-2">
          Manage platform administrators and configuration
        </p>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-body ${
            message.type === "success"
              ? "border-line bg-teal-soft text-teal"
              : "border-line bg-surface-2 text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Promote existing user */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">Promote existing user</h2>
        </div>
        <p className="mb-4 text-body-s text-text-2">
          Grant admin access to a user who already has an account.
        </p>
        <form onSubmit={handlePromote} className="flex flex-wrap gap-3">
          <input
            type="email"
            placeholder="user@example.com"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            required
            className="flex-1 rounded-md border border-line-strong bg-surface px-4 py-2.5 text-body text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent max-w-md"
          />
          <Button type="submit" size="lg" disabled={loading || !promoteEmail.trim()}>
            {!loading && <Shield className="h-4 w-4" />}
            {loading ? "Working…" : "Promote"}
          </Button>
        </form>
      </div>

      {/* Auto-admin emails */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">Auto-admin emails</h2>
        </div>
        <p className="mb-4 text-body-s text-text-2">
          Users who sign up with these emails automatically get admin access.
          This survives database resets.
        </p>

        {autoMessage && (
          <div
            className={`mb-4 rounded-lg border px-4 py-2.5 text-body-s ${
              autoMessage.type === "success"
                ? "border-line bg-teal-soft text-teal"
                : "border-line bg-surface-2 text-danger"
            }`}
          >
            {autoMessage.text}
          </div>
        )}

        {/* Current auto-admin emails */}
        <div className="mb-4 space-y-2">
          {autoEmails.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between rounded-md border border-line bg-surface-2 px-4 py-2"
            >
              <span className="font-mono text-body-s text-text">{email}</span>
              <IconButton
                size="sm"
                label={`Remove ${email}`}
                onClick={() => handleRemoveAutoEmail(email)}
                disabled={autoLoading}
                className="hover:text-danger disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
          {autoEmails.length === 0 && (
            <p className="py-2 text-body-s text-text-3">
              No auto-admin emails configured
            </p>
          )}
        </div>

        {/* Add new */}
        <form onSubmit={handleAddAutoEmail} className="flex flex-wrap gap-3">
          <input
            type="email"
            placeholder="new-admin@example.com"
            value={newAutoEmail}
            onChange={(e) => setNewAutoEmail(e.target.value)}
            required
            className="flex-1 rounded-md border border-line-strong bg-surface px-4 py-2.5 text-body text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent max-w-md"
          />
          <Button type="submit" size="lg" variant="outline" disabled={autoLoading || !newAutoEmail.trim()}>
            {!autoLoading && <Plus className="h-4 w-4" />}
            {autoLoading ? "Saving…" : "Add"}
          </Button>
        </form>
      </div>

      {/* Current admins */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">
            Current admins ({admins.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="text-label text-text-3 pb-3 pr-4">Name</th>
                <th className="text-label text-text-3 pb-3 pr-4">Email</th>
                <th className="text-label text-text-3 pb-3 pr-4">Last sign in</th>
                <th className="text-label text-text-3 pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="py-3 pr-4 text-body text-text">
                    {admin.full_name ?? "Unnamed"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                    {admin.email}
                  </td>
                  <td className="py-3 pr-4 text-body-s text-text-2">
                    {admin.lastSignIn
                      ? new Date(admin.lastSignIn).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDemote(admin)}
                      disabled={loading}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-body text-text-3">
                    No admins configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform info */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">Platform info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-label text-text-3">Framework</p>
            <p className="text-body text-text">Next.js 16 + Supabase</p>
          </div>
          <div>
            <p className="mb-2 text-label text-text-3">Design system</p>
            <p className="text-body text-text">Direction C (sand, ink, orange accent)</p>
          </div>
          <div>
            <p className="mb-2 text-label text-text-3">AI provider</p>
            <p className="text-body text-text">Anthropic Claude API</p>
          </div>
          <div>
            <p className="mb-2 text-label text-text-3">Admin version</p>
            <p className="text-body text-text">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
