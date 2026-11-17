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
  Clock,
  UserMinus,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Shield,
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
  double_opt_in: boolean;
  created_at: string;
  stats?: {
    subscribed: number;
    unsubscribed: number;
    bounced: number;
    pending: number;
    suppressed: number;
  };
}

type ContactStatus = "pending" | "subscribed" | "unsubscribed" | "bounced" | "complained" | "suppressed";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: ContactStatus;
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

type StatusFilter = "" | "subscribed" | "pending" | "unsubscribed" | "any_suppressed";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "Everyone" },
  { value: "subscribed", label: "Subscribed" },
  { value: "pending", label: "Waiting to confirm" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "any_suppressed", label: "Suppressed" },
];

const PAGE_SIZE = 50;

function statusBadge(status: ContactStatus) {
  if (status === "subscribed") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" />
        Subscribed
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3" />
        Waiting to confirm
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
  if (status === "suppressed") {
    return (
      <Badge variant="error">
        <UserMinus className="h-3 w-3" />
        Suppressed
      </Badge>
    );
  }
  return (
    <Badge variant="error">
      <AlertTriangle className="h-3 w-3" />
      {status === "complained" ? "Marked as spam" : "Bounced"}
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [togglingOptIn, setTogglingOptIn] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState("");

  const [suppressOpen, setSuppressOpen] = useState(false);
  const [suppressing, setSuppressing] = useState(false);
  const [suppressText, setSuppressText] = useState("");

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
    if (statusFilter) url.searchParams.set("status", statusFilter);

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
  }, [audienceId, page, search, statusFilter]);

  async function handleToggleDoubleOptIn() {
    if (!audience) return;
    setTogglingOptIn(true);
    try {
      const next = !audience.double_opt_in;
      const res = await fetch(`/api/projects/${projectId}/audiences/${audienceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ double_opt_in: next }),
      });
      if (!res.ok) {
        toast("Couldn't change that setting. Try again.", "error");
        return;
      }
      setAudience({ ...audience, double_opt_in: next });
      toast(
        next
          ? "New sign-ups now confirm their email before they're subscribed"
          : "New sign-ups are subscribed straight away",
        "success"
      );
    } finally {
      setTogglingOptIn(false);
    }
  }

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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Couldn't add this subscriber. Try again.", "error");
        return;
      }
      toast(
        data.status === "pending"
          ? "Added. We've emailed them a link to confirm."
          : "Subscriber added",
        "success"
      );
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

  async function handleSuppressList() {
    if (!suppressText.trim()) return;
    setSuppressing(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/audiences/${audienceId}/contacts/suppress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ list: suppressText }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Couldn't suppress that list. Check it and try again.", "error");
        return;
      }
      const parts = [
        `${data.suppressed} suppressed`,
        data.inserted > 0 ? `${data.inserted} new addresses blocked` : null,
        data.unchanged > 0 ? `${data.unchanged} already blocked` : null,
        data.invalid?.length > 0 ? `${data.invalid.length} skipped (not an email)` : null,
      ].filter(Boolean);
      toast(parts.join(" · "), "success");
      setSuppressOpen(false);
      setSuppressText("");
      await Promise.all([fetchAudience(), fetchContacts()]);
    } finally {
      setSuppressing(false);
    }
  }

  async function handleSetStatus(contact: Contact, status: "suppressed" | "subscribed") {
    if (
      status === "suppressed" &&
      !confirm(`Suppress ${contact.email}? They won't get any more emails from this list until you unsuppress them.`)
    )
      return;
    const res = await fetch(
      `/api/projects/${projectId}/audiences/${audienceId}/contacts/${contact.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error ?? "Couldn't change this subscriber. Try again.", "error");
      return;
    }
    toast(status === "suppressed" ? "Suppressed" : "Back on the list", "success");
    await Promise.all([fetchAudience(), fetchContacts()]);
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
  const textareaClass =
    "w-full resize-y rounded-md border border-line-strong bg-surface px-3.5 py-2 font-mono text-body-s text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

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
        <Button variant="outline" onClick={() => setSuppressOpen(true)}>
          <UserMinus className="h-4 w-4" />
          Paste a suppression list
        </Button>
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
        className="mb-6 rail:grid-cols-4"
        cells={[
          {
            label: "Subscribed",
            value: `${(audience.stats?.subscribed ?? 0).toLocaleString()} people`,
          },
          {
            label: "Waiting to confirm",
            value: (audience.stats?.pending ?? 0).toLocaleString(),
            context: "Signed up, haven't clicked the confirm link yet",
          },
          {
            label: "Unsubscribed",
            value: (audience.stats?.unsubscribed ?? 0).toLocaleString(),
          },
          {
            label: "Suppressed",
            value: (audience.stats?.suppressed ?? 0).toLocaleString(),
            context: "Bounced, marked as spam, or blocked by you",
          },
        ]}
      />

      {/* Double opt-in */}
      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-title text-text">Ask people to confirm their email</p>
                <Badge variant={audience.double_opt_in ? "success" : "secondary"}>
                  {audience.double_opt_in ? "On" : "Off"}
                </Badge>
              </div>
              <p className="mt-1 text-body-s text-text-2">
                {audience.double_opt_in
                  ? "New sign-ups get one email with a confirm link. They join the list, and any email series, only after they click it. Fewer fake addresses, better inbox placement."
                  : "New sign-ups join the list straight away. Turn this on to send them a confirm link first: fewer fake addresses, better inbox placement."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleDoubleOptIn}
            disabled={togglingOptIn}
            className="shrink-0"
          >
            {audience.double_opt_in ? (
              <ToggleRight className="h-4 w-4 text-teal" aria-hidden />
            ) : (
              <ToggleLeft className="h-4 w-4" aria-hidden />
            )}
            {togglingOptIn ? "Saving…" : audience.double_opt_in ? "Turn off" : "Turn on"}
          </Button>
        </div>
      </Card>

      {/* Search + filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
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
        <div className="sm:w-56">
          <label htmlFor="status-filter" className="sr-only">
            Show
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className={fieldClass}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value || "all"} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
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
            search || statusFilter
              ? "No one matches. Try a different email or filter."
              : "No subscribers yet. Add one, or import a CSV."
          }
          action={
            search || statusFilter ? undefined : (
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
                  {contacts.map((c) => {
                    const canSuppress = c.status === "subscribed" || c.status === "pending" || c.status === "unsubscribed";
                    const canUnsuppress = c.status === "suppressed";
                    return (
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
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {canSuppress && (
                              <IconButton
                                label="Suppress"
                                size="sm"
                                onClick={() => handleSetStatus(c, "suppressed")}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </IconButton>
                            )}
                            {canUnsuppress && (
                              <IconButton
                                label="Unsuppress"
                                size="sm"
                                onClick={() => handleSetStatus(c, "subscribed")}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </IconButton>
                            )}
                            <IconButton
                              label="Remove subscriber"
                              size="sm"
                              onClick={() => handleDeleteContact(c.id)}
                              className="hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            {audience.double_opt_in && (
              <p className="mb-4 text-body-s text-text-2">
                This list asks people to confirm. They&apos;ll get a confirm link and join once they click it.
              </p>
            )}
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
              column is saved as an extra field. Suppressed addresses are skipped.
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
              className={textareaClass}
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

      {/* Suppression list dialog */}
      {suppressOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="suppress-title"
            className="relative w-full max-w-2xl rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
          >
            <IconButton
              label="Close"
              size="sm"
              onClick={() => setSuppressOpen(false)}
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </IconButton>
            <h2 id="suppress-title" className="mb-1 text-heading text-text">
              Paste a suppression list
            </h2>
            <p className="mb-4 text-body-s text-text-2">
              One email per line, or separated by commas. Everyone on it is
              blocked from this list: people already here stop getting emails,
              and addresses that aren&apos;t here yet are saved as blocked so a
              later import or sign-up can&apos;t add them.
            </p>
            <label htmlFor="suppress-text" className="sr-only">
              Emails to suppress
            </label>
            <textarea
              id="suppress-text"
              value={suppressText}
              onChange={(e) => setSuppressText(e.target.value)}
              rows={10}
              placeholder={`alice@example.com\nbob@example.com`}
              className={textareaClass}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSuppressOpen(false)} disabled={suppressing}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSuppressList} disabled={suppressing || !suppressText.trim()}>
                {!suppressing && <UserMinus className="h-4 w-4" />}
                {suppressing ? "Suppressing…" : "Suppress these"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
