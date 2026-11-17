"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Globe,
  Mail,
  Lock,
  CheckCircle2,
  ArrowUpRight,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Clock,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PageHeader } from "@/src/components/layout/page-header";
import { SettingsTabs } from "@/src/components/settings/settings-tabs";
import { useToast } from "@/src/components/ui/toast";
import { CONDUIKT_SHARED_FROM_EMAIL } from "@/src/lib/email/marketing";
import type { PlanTier } from "@/src/lib/plans";

interface DnsRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl?: string | number;
  priority?: number;
  status: "pending" | "verified" | "failed" | "not_started";
}

interface DomainView {
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed";
  from_local_part: string;
  from_email: string;
  dns_records: DnsRecord[];
  verified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
}

interface DomainState {
  plan: PlanTier;
  eligible: boolean;
  shared_from_email: string;
  domain: DomainView | null;
}

const POLL_MS = 15_000;

function recordStatusBadge(status: DnsRecord["status"]) {
  if (status === "verified") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Found
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="error">
        <AlertTriangle className="h-3 w-3" aria-hidden />
        Not found
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3" aria-hidden />
      Waiting
    </Badge>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      label={copied ? "Copied" : `Copy ${label}`}
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: nothing to do, the value is visible */
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
    </IconButton>
  );
}

export default function EmailDomainPage() {
  const { toast } = useToast();
  const [state, setState] = useState<DomainState | null>(null);
  const [loading, setLoading] = useState(true);

  const [domainInput, setDomainInput] = useState("");
  const [localInput, setLocalInput] = useState("hello");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editingLocal, setEditingLocal] = useState(false);
  const [localDraft, setLocalDraft] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/email-domain", { cache: "no-store" });
    if (res.ok) {
      const data: DomainState = await res.json();
      setState(data);
    } else {
      toast("Couldn't load your sending domain. Refresh to try again.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const check = useCallback(
    async (silent: boolean) => {
      if (!silent) setChecking(true);
      try {
        const res = await fetch("/api/email-domain/verify", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!silent) toast(data.error ?? "Couldn't check the records. Try again.", "error");
          return;
        }
        setState((prev) => (prev ? { ...prev, domain: data.domain } : prev));
        if (!silent) {
          if (data.domain?.status === "verified") toast("Your domain is verified", "success");
          else if (data.warning) toast(data.warning, "warning");
          else toast("Checked. Some records aren't live yet.", "info");
        }
      } finally {
        if (!silent) setChecking(false);
      }
    },
    [toast]
  );

  // Poll every 15s while the domain is pending so the page turns green on
  // its own once the records are live.
  const pending = state?.domain && state.domain.status !== "verified";
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!pending) return;
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible") check(true);
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pending, check]);

  async function handleAdd() {
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/email-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput, from_local_part: localInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? "Couldn't add that domain. Try again.");
        return;
      }
      setState((prev) => (prev ? { ...prev, domain: data.domain } : prev));
      setDomainInput("");
      toast("Domain added. Now add the records below at your domain provider.", "success");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove this sending domain? Your emails go back to the shared sender.")) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/email-domain", { method: "DELETE" });
      if (!res.ok) {
        toast("Couldn't remove the domain. Try again.", "error");
        return;
      }
      setState((prev) => (prev ? { ...prev, domain: null } : prev));
      toast("Domain removed", "success");
    } finally {
      setRemoving(false);
    }
  }

  async function handleSaveLocal() {
    const res = await fetch("/api/email-domain", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_local_part: localDraft }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error ?? "Couldn't save that address.", "error");
      return;
    }
    setState((prev) => (prev ? { ...prev, domain: data.domain } : prev));
    setEditingLocal(false);
    toast("Sender address saved", "success");
  }

  const domain = state?.domain ?? null;
  const eligible = state?.eligible ?? false;
  // A verified domain only sends while the plan still allows it. After a
  // downgrade the row stays (so it can be removed or picked up again on
  // upgrade) but every email goes back to the shared sender.
  const paused = !!domain && !eligible;
  const live = domain?.status === "verified" && eligible;
  const currentFrom = live ? domain!.from_email : CONDUIKT_SHARED_FROM_EMAIL;

  return (
    <div>
      <PageHeader
        title="Sending domain"
        description="Where your marketing emails come from. Your own domain (Pro and up) lands in inboxes more reliably and carries your brand."
      />
      <SettingsTabs />

      {/* Current sender */}
      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-title text-text">Current sender</p>
              {paused ? (
                <Badge variant="warning">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Domain paused
                </Badge>
              ) : (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Active
                </Badge>
              )}
            </div>
            <p className="mb-3 text-body-s text-text-2">
              {live
                ? "Sign-up confirmation emails go out from your own domain. One-off emails and email series still come from Conduikt's shared sender for now."
                : paused
                  ? "Your plan no longer includes sending from your own domain, so your emails go out from Conduikt's shared sender. Upgrade to use your domain again."
                  : "Your emails go out from Conduikt's shared sender. People see your project name as the sender name."}
            </p>
            {loading ? (
              <Skeleton className="h-9 w-72" />
            ) : (
              <div className="break-all rounded-md border border-line bg-ground px-3 py-2 font-mono text-body-s text-text">
                {currentFrom}
              </div>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4 md:p-6" role="status" aria-label="Loading">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !eligible && !domain ? (
        <Card>
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-title text-text">Use your own sending domain</p>
                <Badge variant="pro">Pro and up</Badge>
              </div>
              <p className="mb-4 text-body-s text-text-2">
                Send from <code className="font-mono">hello@yourcompany.com</code> instead of our
                shared address. Setup is three records at your domain provider and takes about 10 minutes.
              </p>
              <div className="flex flex-col gap-3 rounded-md border border-line bg-ground p-4 sm:flex-row sm:items-start">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-3" aria-hidden />
                <div className="flex-1">
                  <p className="text-title text-text">Available on Pro and above</p>
                  <p className="mt-1 text-caption text-text-3">
                    Upgrade to Pro ($49/mo) or Growth ($99/mo) to send from your own domain.
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href="/settings/billing">
                    Upgrade
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : !domain ? (
        <Card>
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-title text-text">Add your sending domain</p>
              <p className="mb-4 text-body-s text-text-2">
                Type the domain you send from. A subdomain like{" "}
                <code className="font-mono">mail.yourcompany.com</code> keeps your main domain&apos;s
                reputation separate, which most senders prefer.
              </p>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!saving && domainInput.trim()) handleAdd();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <Input
                    label="Send from"
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    placeholder="Try: hello"
                    hint="The part before the @"
                    maxLength={64}
                  />
                  <Input
                    label="Domain"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="Try: mail.yourcompany.com"
                    error={formError ?? undefined}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={saving || !domainInput.trim()}>
                    {saving ? "Adding…" : "Add domain"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="break-all font-mono text-title text-text">{domain.domain}</p>
                {domain.status === "verified" ? (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Verified
                  </Badge>
                ) : domain.status === "failed" ? (
                  <Badge variant="error">
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    Records not found
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <span className="live-dot" aria-hidden />
                    Waiting for records
                  </Badge>
                )}
              </div>

              {paused ? (
                <div className="mb-4 flex flex-col gap-3 rounded-md border border-line bg-ground p-4 sm:flex-row sm:items-start">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-3" aria-hidden />
                  <div className="flex-1">
                    <p className="text-title text-text">Paused until you upgrade</p>
                    <p className="mt-1 text-caption text-text-3">
                      Sending from your own domain is on Pro and above. Your records stay in place; emails
                      use the shared sender until then. You can also remove the domain below.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/settings/billing">
                      Upgrade
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              ) : null}

              {domain.status === "verified" ? (
                <p className="mb-4 text-body-s text-text-2">
                  All records are live. Sign-up confirmation emails go out from{" "}
                  <code className="font-mono text-text">{domain.from_email}</code>. One-off emails and
                  email series still use the shared sender for now.
                </p>
              ) : (
                <p className="mb-4 text-body-s text-text-2">
                  Add these records at your domain provider (where you bought the domain). We check
                  every 15 seconds while this page is open. Records can take up to an hour to show up.
                </p>
              )}

              {/* Sender address */}
              <div className="mb-4 rounded-md border border-line bg-ground p-3">
                <p className="mb-1 text-label text-text-3">Sender address</p>
                {editingLocal ? (
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveLocal();
                    }}
                  >
                    <div className="flex-1">
                      <Input
                        label="The part before the @"
                        value={localDraft}
                        onChange={(e) => setLocalDraft(e.target.value)}
                        maxLength={64}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingLocal(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="break-all font-mono text-body-s text-text">{domain.from_email}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocalDraft(domain.from_local_part);
                        setEditingLocal(true);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>

              {/* DNS records */}
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full text-body-s">
                  <thead className="border-b border-line bg-ground">
                    <tr className="text-left">
                      <th className="px-3 py-2 text-label text-text-3">Type</th>
                      <th className="px-3 py-2 text-label text-text-3">Name</th>
                      <th className="px-3 py-2 text-label text-text-3">Value</th>
                      <th className="px-3 py-2 text-label text-text-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domain.dns_records.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-text-3">
                          No records yet. Press &quot;Check again&quot; to fetch them.
                        </td>
                      </tr>
                    ) : (
                      domain.dns_records.map((r, i) => (
                        <tr key={`${r.type}-${r.name}-${i}`} className="border-b border-line align-top last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-text">
                            {r.type}
                            {typeof r.priority === "number" && (
                              <span className="block text-caption text-text-3">priority {r.priority}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-start gap-1">
                              <code className="break-all font-mono text-text">{r.name}</code>
                              <CopyButton value={r.name} label="name" />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-start gap-1">
                              <code className="max-w-[360px] break-all font-mono text-text">{r.value}</code>
                              <CopyButton value={r.value} label="value" />
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{recordStatusBadge(r.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-caption text-text-3">
                  {domain.last_checked_at
                    ? `Last checked ${new Date(domain.last_checked_at).toLocaleTimeString()}`
                    : "Not checked yet"}
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleRemove} disabled={removing}>
                    <Trash2 className="h-3.5 w-3.5" />
                    {removing ? "Removing…" : "Remove"}
                  </Button>
                  {domain.status !== "verified" && (
                    <Button size="sm" onClick={() => check(false)} disabled={checking}>
                      <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
                      {checking ? "Checking…" : "Check again"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Why it matters */}
      <div className="mt-6 rounded-lg border border-dashed border-line p-4 md:p-6">
        <p className="mb-3 text-label text-text-3">Why this matters</p>
        <ul className="space-y-2 text-body-s text-text-2">
          <li className="flex gap-2">
            <span className="shrink-0 text-text-3" aria-hidden>·</span>
            <span>
              <strong className="font-medium text-text">More emails reach the inbox:</strong>{" "}
              Mailbox providers trust a sender that proves it owns its domain. Fewer emails end up in
              the promotions tab.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-text-3" aria-hidden>·</span>
            <span>
              <strong className="font-medium text-text">Your brand on every email:</strong>{" "}
              People see <code className="font-mono">hello@yourcompany.com</code> instead of{" "}
              <code className="break-all font-mono">{CONDUIKT_SHARED_FROM_EMAIL}</code>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-text-3" aria-hidden>·</span>
            <span>
              <strong className="font-medium text-text">Your reputation is yours:</strong>{" "}
              How other Conduikt users send no longer affects you.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
