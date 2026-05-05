"use client";

import { useState, useEffect } from "react";
import { Shield, UserPlus, UserMinus, Loader2, Mail, X, Plus } from "lucide-react";

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
        <h1 className="text-h1 text-text-primary">Admin Settings</h1>
        <p className="text-body text-text-secondary mt-1">
          Manage platform administrators and configuration
        </p>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-body ${
            message.type === "success"
              ? "border-success/20 bg-success/5 text-success"
              : "border-error/20 bg-error/5 text-error"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Promote existing user */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-text-primary">Promote Existing User</h2>
        </div>
        <p className="text-small text-text-secondary mb-4">
          Grant admin access to a user who already has an account.
        </p>
        <form onSubmit={handlePromote} className="flex gap-3">
          <input
            type="email"
            placeholder="user@example.com"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            required
            className="flex-1 rounded-lg border border-border-default bg-surface-2 px-4 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 max-w-md"
          />
          <button
            type="submit"
            disabled={loading || !promoteEmail.trim()}
            className="rounded-lg bg-gradient-to-br from-[#D9663A] to-[#B24E27] px-5 py-2.5 text-[0.875rem] font-medium text-on-accent shadow-[0_0_20px_var(--accent-glow)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Promote
          </button>
        </form>
      </div>

      {/* Auto-admin emails */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-text-primary">Auto-Admin Emails</h2>
        </div>
        <p className="text-small text-text-secondary mb-4">
          Users who sign up with these emails automatically get admin access.
          This survives database resets.
        </p>

        {autoMessage && (
          <div
            className={`rounded-lg border px-4 py-2.5 text-small mb-4 ${
              autoMessage.type === "success"
                ? "border-success/20 bg-success/5 text-success"
                : "border-error/20 bg-error/5 text-error"
            }`}
          >
            {autoMessage.text}
          </div>
        )}

        {/* Current auto-admin emails */}
        <div className="space-y-2 mb-4">
          {autoEmails.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-2 px-4 py-2.5"
            >
              <span className="text-body text-text-primary">{email}</span>
              <button
                onClick={() => handleRemoveAutoEmail(email)}
                disabled={autoLoading}
                className="rounded-md p-1 text-text-tertiary hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {autoEmails.length === 0 && (
            <p className="text-small text-text-tertiary py-2">
              No auto-admin emails configured
            </p>
          )}
        </div>

        {/* Add new */}
        <form onSubmit={handleAddAutoEmail} className="flex gap-3">
          <input
            type="email"
            placeholder="new-admin@example.com"
            value={newAutoEmail}
            onChange={(e) => setNewAutoEmail(e.target.value)}
            required
            className="flex-1 rounded-lg border border-border-default bg-surface-2 px-4 py-2.5 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 max-w-md"
          />
          <button
            type="submit"
            disabled={autoLoading || !newAutoEmail.trim()}
            className="rounded-lg border border-border-strong bg-surface-2 px-4 py-2.5 text-[0.875rem] font-medium text-text-primary hover:bg-surface-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {autoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </form>
      </div>

      {/* Current admins */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-warning" />
          <h2 className="text-h3 text-text-primary">
            Current Admins ({admins.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Name</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Email</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Last Sign In</th>
                <th className="text-caption text-text-tertiary pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="py-3 pr-4 text-body text-text-primary">
                    {admin.full_name ?? "Unnamed"}
                  </td>
                  <td className="py-3 pr-4 text-small text-text-secondary">
                    {admin.email}
                  </td>
                  <td className="py-3 pr-4 text-small text-text-secondary">
                    {admin.lastSignIn
                      ? new Date(admin.lastSignIn).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDemote(admin)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-error/20 bg-error/5 px-3 py-1.5 text-[0.8125rem] font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-tertiary text-body">
                    No admins configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform info */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">Platform Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-caption text-text-tertiary mb-1">Framework</p>
            <p className="text-body text-text-primary">Next.js 15 + Supabase</p>
          </div>
          <div>
            <p className="text-caption text-text-tertiary mb-1">Design System</p>
            <p className="text-body text-text-primary">Mineral (Obsidian + Copper)</p>
          </div>
          <div>
            <p className="text-caption text-text-tertiary mb-1">AI Provider</p>
            <p className="text-body text-text-primary">Anthropic Claude API</p>
          </div>
          <div>
            <p className="text-caption text-text-tertiary mb-1">Admin Version</p>
            <p className="text-body text-text-primary">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
