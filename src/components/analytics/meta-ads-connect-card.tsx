"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Unlink } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Field } from "@/src/components/ui/input";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";

// Meta Ads connect card for the Analytics page (Phase 3 entry point).
// Hidden until NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION is "true": Meta has
// to approve the app before ads_read can be asked for. Connect goes
// through /api/integrations/meta-ads/connect; the ad account picker reads
// and writes /api/integrations/meta-ads/accounts.

interface AdAccount {
  id: string;
  name?: string | null;
  account_id?: string;
  currency?: string | null;
}

interface AccountsResponse {
  connected: boolean;
  reason?: string;
  selectedAccountId?: string | null;
  selectedAccountName?: string | null;
  accounts?: AdAccount[];
}

export function isMetaAdsCardEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION === "true";
}

export function MetaAdsConnectCard({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const accountsUrl = `/api/integrations/meta-ads/accounts?projectId=${encodeURIComponent(projectId)}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(accountsUrl);
      const body = (await res.json().catch(() => ({}))) as AccountsResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || `Could not load ad accounts (${res.status})`);
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ad accounts");
    } finally {
      setLoading(false);
    }
  }, [accountsUrl]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickAccount(accountId: string) {
    const account = data?.accounts?.find((a) => a.id === accountId);
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/meta-ads/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, accountId, accountName: account?.name ?? null }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not save the ad account");
      setData((prev) =>
        prev ? { ...prev, selectedAccountId: accountId, selectedAccountName: account?.name ?? null } : prev
      );
      toast("Ad account saved. Results arrive after the next sync.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the ad account", "error");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setSaving(true);
    try {
      const res = await fetch(accountsUrl, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not disconnect");
      setData({ connected: false });
      toast("Meta Ads disconnected from this project", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not disconnect", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!isMetaAdsCardEnabled()) return null;

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading Meta Ads connection">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={<Megaphone className="h-6 w-6" />} title={`We couldn't load Meta Ads: ${error}.`} />;
  }

  if (!data?.connected) {
    return (
      <EmptyState
        icon={<Megaphone className="h-6 w-6" />}
        title={
          data?.reason && data.reason !== "Meta Ads is not connected for this project"
            ? data.reason
            : "Connect your Meta ad account to see which ads earn clicks and feed that into next week's plan."
        }
        action={
          <Button size="sm" asChild>
            <a href={`/api/integrations/meta-ads/connect?project_id=${encodeURIComponent(projectId)}`}>
              Connect Meta Ads
            </a>
          </Button>
        }
      />
    );
  }

  const accounts = data.accounts ?? [];
  const selectId = `meta-ad-account-${projectId}`;

  return (
    <Card className="animate-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-title text-text">
          <Megaphone className="h-4 w-4 text-text-3" />
          Meta Ads
          <Badge variant="success">Connected</Badge>
        </h3>
        <Button size="sm" variant="ghost" onClick={disconnect} disabled={saving}>
          <Unlink className="h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>
      <div className="mt-4">
        {accounts.length === 0 ? (
          <p className="text-body-s text-text-2">
            No ad accounts found on this Meta login. Create one in Meta Ads Manager, then reconnect.
          </p>
        ) : (
          <Field
            label="Ad account"
            htmlFor={selectId}
            hint={data.selectedAccountId ? undefined : "Pick the account whose results should show here."}
          >
            <select
              id={selectId}
              value={data.selectedAccountId ?? ""}
              disabled={saving}
              onChange={(e) => e.target.value && pickAccount(e.target.value)}
              className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 font-sans text-[15px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Choose an ad account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.account_id || a.id}
                  {a.currency ? ` (${a.currency})` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </Card>
  );
}
