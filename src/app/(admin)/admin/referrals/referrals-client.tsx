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
  Loader2,
  X,
  TrendingUp,
  Users,
  MousePointerClick,
} from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">Referral Program</h1>
          <p className="text-body text-text-secondary mt-1">
            Create trackable links, manage partners, and disburse commissions.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#D4945A] to-[#C88550] px-4 py-2.5 text-[0.875rem] font-medium text-on-accent shadow-[0_0_20px_var(--accent-glow)] hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Referral Link
        </button>
      </div>

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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<LinkIcon className="h-4 w-4" />}
          label="Active Links"
          value={stats.totals.linkCount.toString()}
        />
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Total Clicks"
          value={stats.totals.clickCount.toLocaleString()}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Signups"
          value={`${stats.totals.conversionCount} (${stats.totals.paidConversions} paid)`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Unpaid Commissions"
          value={`$${stats.totals.unpaidCommissionsUsd.toFixed(2)}`}
          accent
        />
      </div>

      {/* Referral links table */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-text-primary">Links ({stats.links.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Link</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Partner</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Commission</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Clicks</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Signups</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Unpaid</th>
                <th className="text-caption text-text-tertiary pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.links.map((link) => (
                <tr key={link.id} className="border-b border-border-subtle last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyLink(link.code)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 font-mono text-[0.75rem] text-text-secondary hover:bg-surface-3 transition-colors"
                      >
                        {copied === link.code ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        /r/{link.code}
                      </button>
                      <span
                        className={`text-[0.6875rem] rounded-full px-2 py-0.5 ${
                          link.active
                            ? "bg-success/10 text-success"
                            : "bg-surface-2 text-text-tertiary"
                        }`}
                      >
                        {link.active ? "active" : "paused"}
                      </span>
                    </div>
                    <div className="text-small text-text-primary mt-1">{link.label}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-small text-text-primary">{link.partner_name}</div>
                    <div className="text-[0.75rem] text-text-tertiary">{link.partner_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-small text-text-secondary">
                    {link.commission_type === "flat"
                      ? `$${Number(link.flat_amount_usd ?? 0).toFixed(2)} flat`
                      : `${((link.commission_rate ?? 0) * 100).toFixed(0)}%`}
                  </td>
                  <td className="py-3 pr-4 text-right text-small font-mono text-text-primary">
                    {link.clicks}
                  </td>
                  <td className="py-3 pr-4 text-right text-small font-mono text-text-primary">
                    {link.conversions} <span className="text-text-tertiary">({link.paidConversions})</span>
                  </td>
                  <td className="py-3 pr-4 text-right text-small font-mono text-accent">
                    ${link.unpaidEarnedUsd.toFixed(2)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setPayoutLink(link)}
                        disabled={link.unpaidEarnedUsd <= 0}
                        className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1 text-[0.75rem] font-medium text-accent hover:bg-accent/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Wallet className="h-3 w-3" />
                        Pay
                      </button>
                      <button
                        onClick={() => toggleActive(link)}
                        className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1 text-[0.75rem] text-text-secondary hover:bg-surface-3 transition-colors"
                      >
                        {link.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => deleteLink(link)}
                        className="rounded-md border border-error/20 bg-error/5 px-2.5 py-1 text-[0.75rem] text-error hover:bg-error/10 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {stats.links.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-text-tertiary text-body">
                    No referral links yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout ledger */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-text-primary">Payout History ({payouts.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Date</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Partner</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Method</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Reference</th>
                <th className="text-caption text-text-tertiary pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="py-3 pr-4 text-small text-text-secondary">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-small text-text-primary">{p.partner_name}</div>
                    <div className="text-[0.75rem] text-text-tertiary">{p.partner_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-small text-text-secondary capitalize">
                    {p.method ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-[0.75rem] text-text-tertiary font-mono">
                    {p.reference ?? "—"}
                  </td>
                  <td className="py-3 text-right text-small font-mono text-text-primary">
                    ${Number(p.amount_usd).toFixed(2)}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-tertiary text-body">
                    No payouts disbursed yet
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
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      <div className="flex items-center gap-2 text-text-tertiary mb-1">
        {icon}
        <span className="text-caption">{label}</span>
      </div>
      <p
        className={`text-[1.5rem] font-semibold font-mono leading-none ${
          accent ? "text-accent" : "text-text-primary"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-border-default bg-surface-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 text-text-primary">New Referral Link</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Slug (URL)">
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="summer-launch"
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary font-mono"
            />
            <span className="text-[0.6875rem] text-text-tertiary mt-1 block">
              conduikt.com/r/{form.code || "your-slug"}
            </span>
          </Field>
          <Field label="Internal label">
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Summer 2026 — influencer campaign"
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Partner name">
              <input
                required
                value={form.partner_name}
                onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary"
              />
            </Field>
            <Field label="Partner email">
              <input
                type="email"
                required
                value={form.partner_email}
                onChange={(e) => setForm({ ...form, partner_email: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary"
              />
            </Field>
          </div>
          <Field label="Commission type">
            <select
              value={form.commission_type}
              onChange={(e) =>
                setForm({ ...form, commission_type: e.target.value as "percentage" | "flat" })
              }
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary"
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
                className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary font-mono"
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
                className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary font-mono"
              />
            </Field>
          )}
          <Field label="Notes (optional)">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary resize-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-default bg-surface-2 px-4 py-2 text-[0.875rem] text-text-secondary hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#D4945A] to-[#C88550] px-4 py-2 text-[0.875rem] font-medium text-on-accent hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create link
            </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border-default bg-surface-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 text-text-primary">Record Payout</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 mb-4">
          <div className="text-[0.75rem] text-text-tertiary">Partner</div>
          <div className="text-small text-text-primary">{link.partner_name}</div>
          <div className="text-[0.75rem] text-text-tertiary">
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
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary font-mono"
            />
          </Field>
          <Field label="Method">
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary"
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
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary font-mono"
            />
          </Field>
          <Field label="Notes (optional)">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-body text-text-primary resize-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-default bg-surface-2 px-4 py-2 text-[0.875rem] text-text-secondary hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#D4945A] to-[#C88550] px-4 py-2 text-[0.875rem] font-medium text-on-accent hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Record payout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-caption text-text-tertiary mb-1 block">{label}</span>
      {children}
    </label>
  );
}
