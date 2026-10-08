"use client";

import { useState } from "react";
import {
  Share2,
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  Wallet,
  DollarSign,
  X,
  TrendingUp,
  Users,
  MousePointerClick,
} from "@/src/components/ui/lucide-icons";
import { Button, IconButton } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

type ReferralLink = {
  id: string;
  code: string;
  label: string;
  partner_name: string;
  partner_email: string;
  active: boolean;
  commission_type: string;
  commission_rate: number | null;
  flat_amount_usd: number | null;
  created_at: string;
  clicks: number;
  conversions: number;
  paidConversions: number;
  totalEarnedUsd: number;
  unpaidEarnedUsd: number;
  revenueGeneratedUsd: number;
};

type Stats = {
  links: ReferralLink[];
  totals: {
    linkCount: number;
    clickCount: number;
    conversionCount: number;
    paidConversions: number;
    totalCommissionsUsd: number;
    unpaidCommissionsUsd: number;
  };
};

type Payout = {
  id: string;
  partner_name: string;
  partner_email: string;
  amount_usd: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export function ReferralsClient({
  stats: initialStats,
  payouts: initialPayouts,
}: {
  stats: Stats;
  payouts: Payout[];
}) {
  const [stats, setStats] = useState(initialStats);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [showCreate, setShowCreate] = useState(false);
  const [payoutLink, setPayoutLink] = useState<ReferralLink | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://conduikt.com";

  function copyLink(code: string) {
    navigator.clipboard.writeText(`${baseUrl}/r/${code}`);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  async function toggleActive(link: ReferralLink) {
    const res = await fetch(`/api/admin/referrals/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !link.active }),
    });
    if (res.ok) {
      setStats((s) => ({
        ...s,
        links: s.links.map((l) =>
          l.id === link.id ? { ...l, active: !l.active } : l
        ),
      }));
    }
  }

  async function deleteLink(link: ReferralLink) {
    if (!confirm(`Delete referral link "${link.label}"? This is permanent.`)) return;
    const res = await fetch(`/api/admin/referrals/${link.id}`, { method: "DELETE" });
    if (res.ok) {
      setStats((s) => ({
        ...s,
        links: s.links.filter((l) => l.id !== link.id),
        totals: { ...s.totals, linkCount: s.totals.linkCount - 1 },
      }));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-s text-text">Referral program</h1>
          <p className="mt-1 text-body text-text-2">
            Create trackable links, manage partners, and disburse commissions.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New referral link
        </Button>
      </div>

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

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<LinkIcon className="h-4 w-4" />}
          label="Active links"
          value={stats.totals.linkCount.toString()}
        />
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Total clicks"
          value={stats.totals.clickCount.toLocaleString()}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Signups"
          value={`${stats.totals.conversionCount} (${stats.totals.paidConversions} paid)`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Unpaid commissions"
          value={`$${stats.totals.unpaidCommissionsUsd.toFixed(2)}`}
          accent
        />
      </div>

      {/* Referral links table */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">Links ({stats.links.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="text-label text-text-3 pb-3 pr-4">Link</th>
                <th className="text-label text-text-3 pb-3 pr-4">Partner</th>
                <th className="text-label text-text-3 pb-3 pr-4">Commission</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Clicks</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Signups</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Unpaid</th>
                <th className="text-label text-text-3 pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.links.map((link) => (
                <tr key={link.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyLink(link.code)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1 font-mono text-caption text-text-2 hover:bg-surface-2 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)]"
                      >
                        {copied === link.code ? (
                          <Check className="h-3 w-3 text-teal" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        /r/{link.code}
                      </button>
                      <Badge variant={link.active ? "success" : "secondary"}>
                        {link.active ? "active" : "paused"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-body-s text-text">{link.label}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-body-s text-text">{link.partner_name}</div>
                    <div className="text-caption text-text-3">{link.partner_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-body-s text-text-2">
                    {link.commission_type === "flat"
                      ? `$${Number(link.flat_amount_usd ?? 0).toFixed(2)} flat`
                      : `${((link.commission_rate ?? 0) * 100).toFixed(0)}%`}
                  </td>
                  <td className="py-3 pr-4 text-right text-body-s font-mono text-text">
                    {link.clicks}
                  </td>
                  <td className="py-3 pr-4 text-right text-body-s font-mono text-text">
                    {link.conversions} <span className="text-text-3">({link.paidConversions})</span>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-body-s text-text">
                    ${link.unpaidEarnedUsd.toFixed(2)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="quiet"
                        onClick={() => setPayoutLink(link)}
                        disabled={link.unpaidEarnedUsd <= 0}
                      >
                        <Wallet className="h-3 w-3" />
                        Pay
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(link)}>
                        {link.active ? "Pause" : "Resume"}
                      </Button>
                      <IconButton
                        size="sm"
                        variant="outline"
                        label={`Delete ${link.label}`}
                        onClick={() => deleteLink(link)}
                        className="text-danger"
                      >
                        <X className="h-3 w-3" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {stats.links.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-body text-text-3">
                    No referral links yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout ledger */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-text-3" />
          <h2 className="text-title text-text">Payout history ({payouts.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="text-label text-text-3 pb-3 pr-4">Date</th>
                <th className="text-label text-text-3 pb-3 pr-4">Partner</th>
                <th className="text-label text-text-3 pb-3 pr-4">Method</th>
                <th className="text-label text-text-3 pb-3 pr-4">Reference</th>
                <th className="text-label text-text-3 pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 text-body-s text-text-2">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-body-s text-text">{p.partner_name}</div>
                    <div className="text-caption text-text-3">{p.partner_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-body-s text-text-2 capitalize">
                    {p.method ?? "Not set"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-caption text-text-3">
                    {p.reference ?? "None"}
                  </td>
                  <td className="py-3 text-right text-body-s font-mono text-text">
                    ${Number(p.amount_usd).toFixed(2)}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-body text-text-3">
                    No payouts disbursed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(link) => {
            setStats((s) => ({
              ...s,
              links: [
                {
                  ...link,
                  clicks: 0,
                  conversions: 0,
                  paidConversions: 0,
                  totalEarnedUsd: 0,
                  unpaidEarnedUsd: 0,
                  revenueGeneratedUsd: 0,
                },
                ...s.links,
              ],
              totals: { ...s.totals, linkCount: s.totals.linkCount + 1 },
            }));
            setShowCreate(false);
            setMessage({ type: "success", text: "Referral link created" });
          }}
          onError={(text) => setMessage({ type: "error", text })}
        />
      )}

      {payoutLink && (
        <PayoutModal
          link={payoutLink}
          onClose={() => setPayoutLink(null)}
          onCreated={(payout) => {
            setPayouts((p) => [payout, ...p]);
            setStats((s) => ({
              ...s,
              links: s.links.map((l) =>
                l.id === payoutLink.id
                  ? { ...l, unpaidEarnedUsd: Math.max(0, l.unpaidEarnedUsd - Number(payout.amount_usd)) }
                  : l
              ),
              totals: {
                ...s.totals,
                unpaidCommissionsUsd: Math.max(
                  0,
                  s.totals.unpaidCommissionsUsd - Number(payout.amount_usd)
                ),
              },
            }));
            setPayoutLink(null);
            setMessage({ type: "success", text: "Payout recorded" });
          }}
          onError={(text) => setMessage({ type: "error", text })}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface p-5">
      <div className="mb-2 flex items-center gap-2 text-text-3">
        {icon}
        <span className="text-label">{label}</span>
      </div>
      <p
        className={`text-numeric text-[1.5rem] ${
          accent ? "text-accent-hover" : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CreateModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (link: ReferralLink) => void;
  onError: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: "",
    label: "",
    partner_name: "",
    partner_email: "",
    commission_type: "percentage" as "percentage" | "flat",
    commission_rate: "0.2",
    flat_amount_usd: "10",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          label: form.label,
          partner_name: form.partner_name,
          partner_email: form.partner_email,
          commission_type: form.commission_type,
          commission_rate: Number(form.commission_rate),
          flat_amount_usd: Number(form.flat_amount_usd),
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Failed to create");
      } else {
        onCreated(data);
      }
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading text-text">New referral link</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Slug (URL)">
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="summer-launch"
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
            />
            <span className="mt-1 block font-mono text-caption text-text-3">
              conduikt.com/r/{form.code || "your-slug"}
            </span>
          </Field>
          <Field label="Internal label">
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Summer 2026 — influencer campaign"
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Partner name">
              <input
                required
                value={form.partner_name}
                onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </Field>
            <Field label="Partner email">
              <input
                type="email"
                required
                value={form.partner_email}
                onChange={(e) => setForm({ ...form, partner_email: e.target.value })}
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </Field>
          </div>
          <Field label="Commission type">
            <select
              value={form.commission_type}
              onChange={(e) =>
                setForm({ ...form, commission_type: e.target.value as "percentage" | "flat" })
              }
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="percentage">Percentage of revenue</option>
              <option value="flat">Flat amount per paid signup</option>
            </select>
          </Field>
          {form.commission_type === "percentage" ? (
            <Field label="Rate (e.g. 0.2 = 20%)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.commission_rate}
                onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
              />
            </Field>
          ) : (
            <Field label="Flat amount (USD)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.flat_amount_usd}
                onChange={(e) => setForm({ ...form, flat_amount_usd: e.target.value })}
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
              />
            </Field>
          )}
          <Field label="Notes (optional)">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {!loading && <Plus className="h-4 w-4" />}
              {loading ? "Creating…" : "Create link"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PayoutModal({
  link,
  onClose,
  onCreated,
  onError,
}: {
  link: ReferralLink;
  onClose: () => void;
  onCreated: (p: Payout) => void;
  onError: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount_usd: link.unpaidEarnedUsd.toFixed(2),
    method: "bank",
    reference: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/referrals/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_name: link.partner_name,
          partner_email: link.partner_email,
          amount_usd: Number(form.amount_usd),
          method: form.method,
          reference: form.reference,
          notes: form.notes,
          referral_link_id: link.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "Failed to record payout");
      } else {
        onCreated(data);
      }
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading text-text">Record payout</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="mb-4 rounded-md border border-line bg-surface-2 px-3 py-2">
          <div className="text-label text-text-3">Partner</div>
          <div className="text-body-s text-text">{link.partner_name}</div>
          <div className="font-mono text-caption text-text-3">
            Unpaid: ${link.unpaidEarnedUsd.toFixed(2)}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Amount (USD)">
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.amount_usd}
              onChange={(e) => setForm({ ...form, amount_usd: e.target.value })}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
            />
          </Field>
          <Field label="Method">
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="bank">Bank transfer</option>
              <option value="paypal">PayPal</option>
              <option value="crypto">Crypto</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Reference / Txn ID (optional)">
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
            />
          </Field>
          <Field label="Notes (optional)">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {!loading && <Wallet className="h-4 w-4" />}
              {loading ? "Recording…" : "Record payout"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-label text-text-3">{label}</span>
      {children}
    </label>
  );
}
