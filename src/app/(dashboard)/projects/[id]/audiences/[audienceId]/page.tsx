"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Upload,
  Search,
  Mail,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";
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
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" />
        Subscribed
      </Badge>
    );
  }
  if (status === "unsubscribed") {
    return (
      <Badge variant="secondary">
        <XCircle className="h-3 w-3" />
        Unsubscribed
      </Badge>
    );
  }
  return (
    <Badge variant="error">
      <AlertTriangle className="h-3 w-3" />
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
      toast("Couldn't load this list. Refresh to try again.", "error");
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
        toast(err.error ?? "Couldn't add this subscriber. Try again.", "error");
        return;
      }
      toast("Subscriber added", "success");
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
        toast(data.error ?? "The import failed. Check the CSV and try again.", "error");
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
    if (!confirm("Remove this subscriber from the list?")) return;
    const res = await fetch(
      `/api/projects/${projectId}/audiences/${audienceId}/contacts/${contactId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast("Subscriber removed", "success");
      await Promise.all([fetchAudience(), fetchContacts()]);
    } else {
      toast("Couldn't remove this subscriber. Try again.", "error");
    }
  }

  async function handleDeleteAudience() {
    if (
      !confirm(
        "Delete this list and everyone on it? You can't undo this."
      )
    )
      return;
    const res = await fetch(
      `/api/projects/${projectId}/audiences/${audienceId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast("List deleted", "success");
      window.location.href = `/projects/${projectId}/audiences`;
    } else {
      toast("Couldn't delete this list. Try again.", "error");
    }
  }

  if (loadingAudience) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!audience) {
    return (
      <div>
        <PageHeader title="We couldn't find this list" />
        <Button asChild variant="ghost">
          <Link href={`/projects/${projectId}/audiences`}>
            <ArrowLeft className="h-4 w-4" />
            Back to subscribers
          </Link>
        </Button>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fieldClass =
    "h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div>
      <Link
        href={`/projects/${projectId}/audiences`}
        className="hover-link mb-3 inline-flex items-center gap-1.5 text-body-s text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All subscriber lists
      </Link>

      <PageHeader
        title={audience.name}
        description={audience.description ?? undefined}
      >
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" />
          Import a CSV
        </Button>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add subscriber
        </Button>
      </PageHeader>

      {/* Stats */}
      <KpiStrip
        className="mb-6 rail:grid-cols-3"
        cells={[
          {
            label: "Subscribed",
            value: `${(audience.stats?.subscribed ?? 0).toLocaleString()} people`,
          },
          {
            label: "Unsubscribed",
            value: (audience.stats?.unsubscribed ?? 0).toLocaleString(),
          },
          {
            label: "Bounced",
            value: (audience.stats?.bounced ?? 0).toLocaleString(),
            context: "Emails that couldn't be delivered",
          },
        ]}
      />

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
        <label htmlFor="contact-search" className="sr-only">
          Search by email
        </label>
        <input
          id="contact-search"
          type="text"
          placeholder="Try: alice@example.com"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={`${fieldClass} pl-10`}
        />
      </div>

      {/* Contacts table */}
      {loadingContacts ? (
        <div className="space-y-2" role="status" aria-label="Loading subscribers">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title={
            search
              ? "No one matches that search. Try a different email."
              : "No subscribers yet. Add one, or import a CSV."
          }
          action={
            search ? undefined : (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Add subscriber
              </Button>
            )
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden p-0 md:p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-body-s">
                <thead className="border-b border-line">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-label text-text-3">Email</th>
                    <th className="px-4 py-3 text-label text-text-3">Name</th>
                    <th className="px-4 py-3 text-label text-text-3">Status</th>
                    <th className="px-4 py-3 text-label text-text-3">Joined</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-line last:border-0 hover:bg-ground"
                    >
                      <td className="max-w-[280px] truncate px-4 py-2.5 text-text">
                        {c.email}
                      </td>
                      <td className="px-4 py-2.5 text-text-2">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || (
                          <span className="text-text-3">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{statusBadge(c.status)}</td>
                      <td className="px-4 py-2.5 font-mono text-text-3">
                        {new Date(c.subscribed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <IconButton
                          label="Remove subscriber"
                          size="sm"
                          onClick={() => handleDeleteContact(c.id)}
                          className="hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-body-s">
              <span className="text-text-3">
                Page {page} of {totalPages} · {total.toLocaleString()} people
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
      <Card className="mt-12 border-danger">
        <h3 className="text-title text-danger">Delete this list</h3>
        <p className="mt-1 text-body-s text-text-2">
          This removes it from Resend too. Subscribers and their history are
          gone for good.
        </p>
        <Button
          variant="danger"
          size="sm"
          className="mt-3"
          onClick={handleDeleteAudience}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete list
        </Button>
      </Card>

      {/* Add subscriber dialog */}
      {addOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-contact-title"
            className="relative w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
          >
            <IconButton
              label="Close"
              size="sm"
              onClick={() => setAddOpen(false)}
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </IconButton>
            <h2 id="add-contact-title" className="mb-4 text-heading text-text">
              Add a subscriber
            </h2>
            <div className="space-y-3">
              <Input
                label="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="alice@example.com"
                autoFocus
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First name"
                  type="text"
                  value={newFirst}
                  onChange={(e) => setNewFirst(e.target.value)}
                />
                <Input
                  label="Last name"
                  type="text"
                  value={newLast}
                  onChange={(e) => setNewLast(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)} disabled={adding}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddContact} disabled={adding || !newEmail.trim()}>
                  {!adding && <UserPlus className="h-4 w-4" />}
                  {adding ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV dialog */}
      {importOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-csv-title"
            className="relative w-full max-w-2xl rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
          >
            <IconButton
              label="Close"
              size="sm"
              onClick={() => setImportOpen(false)}
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </IconButton>
            <h2 id="import-csv-title" className="mb-1 text-heading text-text">
              Import a CSV
            </h2>
            <p className="mb-4 text-body-s text-text-2">
              Paste your CSV. It needs an <code className="font-mono">email</code> column.{" "}
              <code className="font-mono">first_name</code> and{" "}
              <code className="font-mono">last_name</code> are optional. Any other
              column is saved as an extra field.
            </p>
            <label htmlFor="csv-text" className="sr-only">
              CSV
            </label>
            <textarea
              id="csv-text"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={12}
              placeholder={`email,first_name,last_name\nalice@example.com,Alice,Anderson\nbob@example.com,Bob,Brown`}
              className="w-full resize-y rounded-md border border-line-strong bg-surface px-3.5 py-2 font-mono text-body-s text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)} disabled={importing}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing || !csvText.trim()}>
                {!importing && <Upload className="h-4 w-4" />}
                {importing ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
