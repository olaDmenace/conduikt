"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Twitter, Linkedin, Facebook, Music2, CheckCircle2, AlertCircle, Link2, Unlink, Search, Clock, Pencil } from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { useToast } from "@/src/components/ui/toast";
import { createClient } from "@/src/lib/supabase/client";

interface ConnectedAccount {
  platform: string;
  platform_username: string | null;
  token_expires_at: string | null;
  // We don't expose the raw tokens to the client — only whether they
  // exist. The DB select coerces to booleans below.
  //
  // has_access_token = false is our "needs reconnect" signal: the row
  // survives (so we know which handle it was), but the tokens have been
  // nulled by the refresh helper after a permanent failure.
  has_access_token: boolean;
  has_refresh_token: boolean;
  created_at: string;
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // GSC site picker state
  const [gscPickerOpen, setGscPickerOpen] = useState(false);
  const [gscSites, setGscSites] = useState<
    { siteUrl: string; permissionLevel: string }[]
  >([]);
  const [gscCurrent, setGscCurrent] = useState<string | null>(null);
  const [gscSitesLoading, setGscSitesLoading] = useState(false);
  const [gscSitesError, setGscSitesError] = useState<string | null>(null);
  const [gscSwitching, setGscSwitching] = useState<string | null>(null);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "x") toast("X account connected", "success");
    if (connected === "linkedin") toast("LinkedIn account connected", "success");
    if (connected === "facebook") toast("Facebook Page connected", "success");
    if (connected === "tiktok") toast("TikTok account connected", "success");
    if (connected === "gsc") toast("Google Search Console connected", "success");
    if (connected === "ga4") toast("Google Analytics 4 connected", "success");
    if (connected === "youtube") toast("YouTube channel connected", "success");
    if (error) toast(decodeURIComponent(error), "error");
    // Clean URL
    window.history.replaceState({}, "", "/settings/integrations");
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    // Pull refresh_token only to know if it EXISTS — never display it.
    // The badge logic below uses presence of a refresh token to decide
    // whether the connection is healthy (will silently rotate on use)
    // or actually broken (no way to refresh, user must reconnect).
    const { data } = await supabase
      .from("connected_accounts")
      .select(
        "platform, platform_username, token_expires_at, access_token, refresh_token, created_at",
      );
    setAccounts(
      (data ?? []).map((row) => ({
        platform: row.platform,
        platform_username: row.platform_username,
        token_expires_at: row.token_expires_at,
        has_access_token: Boolean(row.access_token),
        has_refresh_token: Boolean(row.refresh_token),
        created_at: row.created_at,
      }))
    );
    setLoading(false);
  }

  async function openGscPicker() {
    setGscPickerOpen(true);
    setGscSitesLoading(true);
    setGscSitesError(null);
    try {
      const res = await fetch("/api/integrations/gsc/sites");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGscSitesError(data.error || "We couldn't load your Search Console sites. Close this and try again.");
        return;
      }
      setGscSites(data.sites ?? []);
      setGscCurrent(data.current ?? null);
    } finally {
      setGscSitesLoading(false);
    }
  }

  async function selectGscSite(siteUrl: string) {
    setGscSwitching(siteUrl);
    try {
      const res = await fetch("/api/integrations/gsc/sites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "We couldn't switch the site. Try again.", "error");
        return;
      }
      setGscCurrent(siteUrl);
      setAccounts((prev) =>
        prev.map((a) =>
          a.platform === "gsc" ? { ...a, platform_username: siteUrl } : a
        )
      );
      toast(`Search Console site set to ${siteUrl}`, "success");
      setGscPickerOpen(false);
    } finally {
      setGscSwitching(null);
    }
  }

  async function disconnect(platform: string) {
    setDisconnecting(platform);
    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("platform", platform);

    if (error) {
      toast("We couldn't disconnect that account. Try again.", "error");
    } else {
      const names: Record<string, string> = { x: "X", linkedin: "LinkedIn", facebook: "Facebook", tiktok: "TikTok", gsc: "Google Search Console", ga4: "Google Analytics 4", youtube: "YouTube" };
      toast(`${names[platform] ?? platform} disconnected`, "info");
      setAccounts((prev) => prev.filter((a) => a.platform !== platform));
    }
    setDisconnecting(null);
  }

  const xAccount = accounts.find((a) => a.platform === "x");
  const liAccount = accounts.find((a) => a.platform === "linkedin");
  const fbAccount = accounts.find((a) => a.platform === "facebook");
  const ttAccount = accounts.find((a) => a.platform === "tiktok");

  function isExpired(account: ConnectedAccount) {
    // The token-refresh helper nulls out access_token when a refresh
    // permanently fails (rather than deleting the row). That's our
    // authoritative "needs reconnect" signal — check it first.
    if (!account.has_access_token) return true;
    // If we still hold a refresh_token, the next API call to Google
    // (handled by getValidGoogleToken) silently rotates the access
    // token before making the request — so a stale token_expires_at
    // doesn't actually break anything. Only flag as expired when
    // there's no refresh_token AND the access token is past its TTL,
    // which means the user really does need to reconnect.
    if (account.has_refresh_token) return false;
    if (!account.token_expires_at) return false;
    return new Date(account.token_expires_at) < new Date();
  }

  const publishingIntegrations = [
    {
      key: "x",
      name: "X (Twitter)",
      icon: Twitter,
      description: "Post to X straight from the Content Studio.",
      connectHref: "/api/integrations/x/connect",
      account: xAccount,
      comingSoon: false,
    },
    {
      key: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      description: "Post to your LinkedIn profile from the Content Studio.",
      connectHref: "/api/integrations/linkedin/connect",
      account: liAccount,
      comingSoon: false,
    },
    {
      key: "facebook",
      name: "Facebook Page",
      icon: Facebook,
      description: "Post text and images to your Facebook Page from the Content Studio.",
      connectHref: "/api/integrations/facebook/connect",
      account: fbAccount,
      comingSoon: process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION !== "true",
    },
    {
      key: "tiktok",
      name: "TikTok",
      icon: Music2,
      description: "Send video ads to your TikTok inbox as drafts. Review and publish them in the TikTok app.",
      connectHref: "/api/integrations/tiktok/connect",
      account: ttAccount,
      comingSoon: false,
    },
  ];

  // Google integrations (GSC, GA4, YouTube) are now per-project rather
  // than per-user, so they don't appear here — they're connected and
  // managed inside each project's Analytics tab. The cards below are
  // user-level only (one X / LinkedIn / Facebook account, used across
  // all your projects).

  type Integration = (typeof publishingIntegrations)[number];

  function renderIntegrationCard(integration: Integration, i: number) {
    const connected = !!integration.account;
    const expired = integration.account ? isExpired(integration.account) : false;

    return (
      <Card
        key={integration.key}
        className="animate-in flex flex-col gap-4 sm:flex-row sm:items-center"
        style={{ animationDelay: `${i * 60}ms` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <integration.icon className="h-5 w-5 shrink-0 text-text" aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title text-text">{integration.name}</h3>
              {connected && !expired ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Connected
                </Badge>
              ) : connected && expired ? (
                <Badge variant="warning">
                  <AlertCircle className="h-3 w-3" aria-hidden />
                  Reconnect needed
                </Badge>
              ) : integration.comingSoon ? (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3" aria-hidden />
                  Coming soon
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )}
            </div>
            <p className="mt-0.5 text-body-s text-text-2">
              {connected && integration.account?.platform_username
                ? `@${integration.account.platform_username}`
                : integration.comingSoon
                  ? "Waiting on Meta business verification. We'll email you when this is live."
                  : integration.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {connected ? (
            <>
              {integration.key === "gsc" && !expired && (
                <Button variant="quiet" size="sm" onClick={openGscPicker}>
                  <Pencil className="h-4 w-4" />
                  Change site
                </Button>
              )}
              {/* Row exists but tokens have been nulled by the refresh
                  helper: give the user a direct Reconnect action that
                  reruns OAuth. The callback upserts on (user_id,
                  platform) so the same row gets fresh tokens in place,
                  AND any recently-failed scheduled posts on this
                  channel auto-retry. */}
              {expired && integration.connectHref && (
                <Button size="sm" asChild>
                  <a href={integration.connectHref}>
                    <Link2 className="h-4 w-4" />
                    Reconnect
                  </a>
                </Button>
              )}
              <Button
                variant="quiet"
                size="sm"
                onClick={() => disconnect(integration.key)}
                disabled={disconnecting === integration.key}
              >
                {disconnecting !== integration.key && <Unlink className="h-4 w-4" />}
                {disconnecting === integration.key ? "Disconnecting…" : "Disconnect"}
              </Button>
            </>
          ) : integration.comingSoon ? (
            <Button variant="outline" size="sm" disabled>
              <Clock className="h-4 w-4" />
              Coming soon
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <a href={integration.connectHref}>
                <Link2 className="h-4 w-4" />
                {expired ? "Reconnect" : "Connect"}
              </a>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect your social accounts so Conduikt can post for you."
      />

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading integrations">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Publishing */}
          <section>
            <div className="mb-4">
              <h2 className="text-heading text-text">Publishing</h2>
              <p className="mt-1 text-body-s text-text-2">
                Connect social accounts so Conduikt can post from the Content Studio for you.
              </p>
            </div>
            <div className="space-y-3">
              {publishingIntegrations.map((integration, i) =>
                renderIntegrationCard(integration, i)
              )}
            </div>
          </section>

          {/* Analytics & insights: moved to per-project. */}
          <section>
            <div className="mb-4">
              <h2 className="text-heading text-text">Analytics and insights</h2>
              <p className="mt-1 text-body-s text-text-2">
                Google Search Console, Google Analytics 4 and YouTube are
                connected per project, so each one can use its own site,
                property and channel.
              </p>
            </div>
            <Card className="animate-in flex items-start gap-3">
              <Search className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
              <div>
                <p className="text-title text-text">
                  Connect inside each project
                </p>
                <p className="mt-1 text-body-s text-text-2">
                  Open any project, go to the Analytics tab, and you&rsquo;ll
                  see Connect buttons for Search Console, GA4 and YouTube. Each project
                  can use a different Google account or property, which helps
                  agencies with several client sites.
                </p>
              </div>
            </Card>
          </section>

          {/* Info */}
          <p className="animate-in max-w-[64ch] text-body-s text-text-3" style={{ animationDelay: "120ms" }}>
            Your sign-in tokens are stored securely and only used for what each connection asks for. You can disconnect any connection at any time.
          </p>
        </div>
      )}

      <Dialog open={gscPickerOpen} onOpenChange={setGscPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a Search Console site</DialogTitle>
            <DialogDescription>
              Pick which verified site to pull keyword data from. You can switch any time.
            </DialogDescription>
          </DialogHeader>

          {gscSitesLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading sites">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : gscSitesError ? (
            <div role="alert" className="rounded-md border border-line bg-surface-2 p-4">
              <p className="text-body-s text-danger">{gscSitesError}</p>
            </div>
          ) : gscSites.length === 0 ? (
            <div className="rounded-md border border-line bg-surface-2 p-4">
              <p className="text-body-s text-text-2">
                No verified sites found in this Google account. Verify a site in
                Google Search Console, then open this again.
              </p>
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {gscSites.map((site) => {
                const isCurrent = site.siteUrl === gscCurrent;
                const isSwitching = gscSwitching === site.siteUrl;
                return (
                  <button
                    key={site.siteUrl}
                    onClick={() => selectGscSite(site.siteUrl)}
                    disabled={gscSwitching !== null}
                    aria-pressed={isCurrent}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                      isCurrent
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:bg-surface-2"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-title text-text">
                        {site.siteUrl}
                      </p>
                      <p className="mt-0.5 text-caption text-text-3">
                        {site.permissionLevel}
                      </p>
                    </div>
                    {isSwitching ? (
                      <span className="shrink-0 text-caption text-text-3">Switching…</span>
                    ) : isCurrent ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" aria-label="Current site" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status" aria-label="Loading integrations">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
