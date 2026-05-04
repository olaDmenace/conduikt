"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Trash2,
  Upload,
  Search,
  Mail,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  created_at: string;
  stats?: { subscribed: number; unsubscribed: number; bounced: number };
}

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: "subscribed" | "unsubscribed" | "bounced" | "complained";
  subscribed_at: string;
  unsubscribed_at: string | null;
  suppression_reason: string | null;
  custom_fields: Record<string, unknown>;
}

interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 50;

function statusBadge(status: Contact["status"]) {
  if (status === "subscribed") {
    return (
      <Badge variant="success" className="text-[0.65rem]">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Subscribed
      </Badge>
    );
  }
  if (status === "unsubscribed") {
    return (
      <Badge variant="secondary" className="text-[0.65rem]">
        <XCircle className="h-3 w-3 mr-1" />
        Unsubscribed
      </Badge>
    );
  }
  return (
    <Badge variant="error" className="text-[0.65rem]">
      <AlertTriangle className="h-3 w-3 mr-1" />
      {status === "complained" ? "Complained" : "Bounced"}
    </Badge>
  );
}

export default function AudienceDetailPage({
  params,
}: {
  params: Promise<{ id: string; audienceId: string }>;
}) {
  const { id: projectId, audienceId } = use(params);
  const { toast } = useToast();

  const [audience, setAudience] = useState<Audience | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState("");

  async function fetchAudience() {
    setLoadingAudience(true);
    const res = await fetch(
      `/api/projects/${projectId}/audiences/${audienceId}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      setAudience(data);
    } else {
      toast("Failed to load audience", "error");
    }
    setLoadingAudience(false);
  }

  async function fetchContacts() {
    setLoadingContacts(true);
    const url = new URL(
      `/api/projects/${projectId}/audiences/${audienceId}/contacts`,
      window.location.origin
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (search.trim()) url.searchParams.set("search", search.trim());

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok) {
      const data: ContactsResponse = await res.json();
      setContacts(data.contacts);
      setTotal(data.total);
    }
    setLoadingContacts(false);
  }

  useEffect(() => {
    fetchAudience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceId]);

  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceId, page, search]);

  async function handleAddContact() {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/audiences/${audienceId}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: newEmail.trim(),
            first_name: newFirst.trim() || undefined,
            last_name: newLast.trim() || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Failed to add contact", "error");
        return;
      }
      toast("Contact added", "success");
      setAddOpen(false);
      setNewEmail("");
      setNewFirst("");
      setNewLast("");
      await Promise.all([fetchAudience(), fetchContacts()]);
    } finally {
      setAdding(false);
    }
  }

  async function handleImport() {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/audiences/${audienceId}/contacts/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: csvText }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Import failed", "error");
        return;
      }
      const parts = [
        `${data.imported} imported`,
        data.skipped > 0 ? `${data.skipped} duplicates skipped` : null,
        data.failed > 0 ? `${data.failed} failed` : null,
        data.truncated ? "(plan limit reached, partial import)" : null,
      ].filter(Boolean);
      toast(parts.join(" · "), data.imported > 0 ? "success" : "warning");
      if (data.imported > 0) {
        setImportOpen(false);
        setCsvText("");
        await Promise.all([fetchAudience(), fetchContacts()]);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm("Remove this contact from the audience?")) return;
    const res = await fetch(
      `/api/projects/${projectId}/audiences/${audienceId}/contacts/${contactId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast("Contact removed", "success");
      await Promise.all([fetchAudience(), fetchContacts()]);
    } else {
      toast("Failed to remove contact", "error");
    }
  }

  async function handleDeleteAudience() {
    if (
      !confirm(
        "Delete this audience and all its contacts? This cannot be undone."
      )
    )
      return;
    const res = await fetch(
      `/api/projects/${projectId}/audiences/${audienceId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast("Audience deleted", "success");
      window.location.href = `/projects/${projectId}/audiences`;
    } else {
      toast("Failed to delete audience", "error");
    }
  }

  if (loadingAudience) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }
  if (!audience) {
    return (
      <div>
        <PageHeader title="Audience not found" />
        <Button asChild variant="ghost">
          <Link href={`/projects/${projectId}/audiences`}>
            <ArrowLeft className="h-4 w-4" />
            Back to audiences
          </Link>
        </Button>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <Link
        href={`/projects/${projectId}/audiences`}
        className="inline-flex items-center gap-1.5 text-small text-text-tertiary hover:text-text-primary mb-3 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All audiences
      </Link>

      <PageHeader
        title={audience.name}
        description={audience.description ?? undefined}
      >
        <Button variant="secondary" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Contact
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent>
            <p className="text-caption text-text-tertiary uppercase tracking-wider">
              Subscribed
            </p>
            <p className="text-h1 text-text-primary font-mono mt-1">
              {audience.stats?.subscribed ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-text-tertiary uppercase tracking-wider">
              Unsubscribed
            </p>
            <p className="text-h1 text-text-secondary font-mono mt-1">
              {audience.stats?.unsubscribed ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-text-tertiary uppercase tracking-wider">
              Bounced
            </p>
            <p className="text-h1 text-error font-mono mt-1">
              {audience.stats?.bounced ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-border-default bg-surface-1 py-2 pl-10 pr-3 text-small text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
      </div>

      {/* Contacts table */}
      {loadingContacts ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Mail className="h-8 w-8 text-text-tertiary mb-3" />
            <p className="text-body text-text-primary font-medium">
              {search ? "No matches" : "No contacts yet"}
            </p>
            <p className="text-small text-text-secondary mt-1">
              {search
                ? "Try a different search."
                : "Add a contact or import a CSV to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-small">
                <thead className="border-b border-border-default">
                  <tr className="text-text-tertiary">
                    <th className="text-left px-4 py-2.5 font-medium">Email</th>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Subscribed</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border-subtle last:border-0 hover:bg-surface-1"
                    >
                      <td className="px-4 py-2.5 text-text-primary truncate max-w-[280px]">
                        {c.email}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-4 py-2.5">{statusBadge(c.status)}</td>
                      <td className="px-4 py-2.5 text-text-tertiary">
                        {new Date(c.subscribed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="rounded-lg p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                          title="Remove contact"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-small">
              <span className="text-text-tertiary">
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Danger zone */}
      <Card className="mt-12 border-error/30">
        <CardContent>
          <h3 className="text-h3 text-error">Danger zone</h3>
          <p className="text-small text-text-secondary mt-1">
            Deleting an audience removes it from Resend too. Contacts and event
            history are gone for good.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-error hover:bg-error/10"
            onClick={handleDeleteAudience}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete audience
          </Button>
        </CardContent>
      </Card>

      {/* Add Contact modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-surface-0/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border-default bg-surface-1 p-6 shadow-[var(--shadow-elevated)]">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-h2 text-text-primary mb-4">Add contact</h2>
            <div className="space-y-3">
              <div>
                <label className="text-caption text-text-tertiary mb-1 block">Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alice@example.com"
                  className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption text-text-tertiary mb-1 block">First name</label>
                  <input
                    type="text"
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-caption text-text-tertiary mb-1 block">Last name</label>
                  <input
                    type="text"
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)} disabled={adding}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddContact} disabled={adding || !newEmail.trim()}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {adding ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV modal */}
      {importOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-surface-0/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border-default bg-surface-1 p-6 shadow-[var(--shadow-elevated)]">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-h2 text-text-primary mb-1">Import CSV</h2>
            <p className="text-small text-text-secondary mb-4">
              Paste your CSV. Required column: <code className="font-mono">email</code>. Optional: <code className="font-mono">first_name</code>, <code className="font-mono">last_name</code>. Anything else becomes a custom field.
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={12}
              placeholder={`email,first_name,last_name\nalice@example.com,Alice,Anderson\nbob@example.com,Bob,Brown`}
              className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-small font-mono text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-y"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)} disabled={importing}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing || !csvText.trim()}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
