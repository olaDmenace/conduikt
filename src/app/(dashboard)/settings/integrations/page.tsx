"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Twitter, Linkedin, Facebook, CheckCircle2, AlertCircle, Loader2, Link2, Unlink, Search, Clock, Pencil } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
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
    if (connected === "x") toast("X account connected successfully!", "success");
    if (connected === "linkedin") toast("LinkedIn account connected successfully!", "success");
    if (connected === "facebook") toast("Facebook Page connected successfully!", "success");
    if (connected === "gsc") toast("Google Search Console connected!", "success");
    if (error) toast(decodeURIComponent(error), "error");
    // Clean URL
    window.history.replaceState({}, "", "/settings/integrations");
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const { data } = await supabase
      .from("connected_accounts")
      .select("platform, platform_username, token_expires_at, created_at");
    setAccounts(data ?? []);
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
        setGscSitesError(data.error || "Failed to load GSC sites");
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
        toast(data.error || "Failed to switch site", "error");
        return;
      }
      setGscCurrent(siteUrl);
      setAccounts((prev) =>
        prev.map((a) =>
          a.platform === "gsc" ? { ...a, platform_username: siteUrl } : a
        )
      );
      toast(`GSC site set to ${siteUrl}`, "success");
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
      toast("Failed to disconnect account", "error");
    } else {
      const names: Record<string, string> = { x: "X", linkedin: "LinkedIn", facebook: "Facebook", gsc: "Google Search Console" };
      toast(`${names[platform] ?? platform} disconnected`, "info");
      setAccounts((prev) => prev.filter((a) => a.platform !== platform));
    }
    setDisconnecting(null);
  }

  const xAccount = accounts.find((a) => a.platform === "x");
  const liAccount = accounts.find((a) => a.platform === "linkedin");
  const fbAccount = accounts.find((a) => a.platform === "facebook");
  const gscAccount = accounts.find((a) => a.platform === "gsc");

  function isExpired(account: ConnectedAccount) {
    if (!account.token_expires_at) return false;
    return new Date(account.token_expires_at) < new Date();
  }

  const integrations = [
    {
      key: "x",
      name: "X (Twitter)",
      icon: Twitter,
      description: "Post content directly to X from the Content Studio.",
      connectHref: "/api/integrations/x/connect",
      account: xAccount,
      comingSoon: false,
    },
    {
      key: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      description: "Publish posts to your LinkedIn profile from the Content Studio.",
      connectHref: "/api/integrations/linkedin/connect",
      account: liAccount,
      comingSoon: false,
    },
    {
      key: "facebook",
      name: "Facebook Page",
      icon: Facebook,
      description: "Publish text and image posts to your Facebook Page from the Content Studio.",
      connectHref: "/api/integrations/facebook/connect",
      account: fbAccount,
      comingSoon: true,
    },
    {
      key: "gsc",
      name: "Google Search Console",
      icon: Search,
      description: "Import real keyword rankings and click data into your Growth Playbook.",
      connectHref: "/api/integrations/gsc/connect",
      account: gscAccount,
      comingSoon: false,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect your social accounts to publish content directly from Conduikt"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration, i) => {
            const connected = !!integration.account;
            const expired = integration.account ? isExpired(integration.account) : false;

            return (
              <Card
                key={integration.key}
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-6">
                  {/* Icon + info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-default bg-surface-2">
                      <integration.icon className="h-5 w-5 text-text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-h3 text-text-primary">{integration.name}</h3>
                        {connected && !expired ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : connected && expired ? (
                          <Badge variant="warning">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Token expired
                          </Badge>
                        ) : integration.comingSoon ? (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Coming soon
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not connected</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-small text-text-secondary">
                        {connected && integration.account?.platform_username
                          ? `@${integration.account.platform_username}`
                          : integration.comingSoon
                            ? "Awaiting Meta business verification. We'll email you when this is live."
                            : integration.description}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {connected ? (
                      <>
                        {integration.key === "gsc" && !expired && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={openGscPicker}
                          >
                            <Pencil className="h-4 w-4" />
                            Change site
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => disconnect(integration.key)}
                          disabled={disconnecting === integration.key}
                        >
                          {disconnecting === integration.key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4" />
                          )}
                          Disconnect
                        </Button>
                      </>
                    ) : integration.comingSoon ? (
                      <Button variant="secondary" size="sm" disabled>
                        <Clock className="h-4 w-4" />
                        Coming soon
                      </Button>
                    ) : (
                      <Button size="sm" asChild>
                        <a href={integration.connectHref}>
                          <Link2 className="h-4 w-4" />
                          {expired ? "Reconnect" : "Connect"}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Info card */}
          <Card className="animate-in" style={{ animationDelay: "120ms" }}>
            <CardContent className="py-5">
              <p className="text-small text-text-secondary">
                Connected accounts are used to publish content directly from the Content
                Studio. Your OAuth tokens are stored securely and only used to post on
                your behalf. You can disconnect at any time.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={gscPickerOpen} onOpenChange={setGscPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a Search Console site</DialogTitle>
            <DialogDescription>
              Pick which verified property to pull keyword data from. You can switch any time.
            </DialogDescription>
          </DialogHeader>

          {gscSitesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 text-accent animate-spin" />
            </div>
          ) : gscSitesError ? (
            <div className="rounded-lg border border-border-default bg-surface-2 p-4">
              <p className="text-small text-text-secondary">{gscSitesError}</p>
            </div>
          ) : gscSites.length === 0 ? (
            <div className="rounded-lg border border-border-default bg-surface-2 p-4">
              <p className="text-small text-text-secondary">
                No verified properties found in this Google account. Verify a site in
                Google Search Console, then reopen this dialog.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {gscSites.map((site) => {
                const isCurrent = site.siteUrl === gscCurrent;
                const isSwitching = gscSwitching === site.siteUrl;
                return (
                  <button
                    key={site.siteUrl}
                    onClick={() => selectGscSite(site.siteUrl)}
                    disabled={gscSwitching !== null}
                    className={`w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isCurrent
                        ? "border-accent bg-accent/5"
                        : "border-border-default bg-surface-2 hover:bg-surface-3"
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-small font-medium text-text-primary truncate">
                        {site.siteUrl}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {site.permissionLevel}
                      </p>
                    </div>
                    {isSwitching ? (
                      <Loader2 className="h-4 w-4 text-accent animate-spin shrink-0" />
                    ) : isCurrent ? (
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
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
    <Suspense fallback={<div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
