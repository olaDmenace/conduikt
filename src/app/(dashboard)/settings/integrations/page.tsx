"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Twitter, Linkedin, CheckCircle2, AlertCircle, Loader2, Link2, Unlink } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
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

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "x") toast("X account connected successfully!", "success");
    if (connected === "linkedin") toast("LinkedIn account connected successfully!", "success");
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

  async function disconnect(platform: string) {
    setDisconnecting(platform);
    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("platform", platform);

    if (error) {
      toast("Failed to disconnect account", "error");
    } else {
      toast(`${platform === "x" ? "X" : "LinkedIn"} account disconnected`, "info");
      setAccounts((prev) => prev.filter((a) => a.platform !== platform));
    }
    setDisconnecting(null);
  }

  const xAccount = accounts.find((a) => a.platform === "x");
  const liAccount = accounts.find((a) => a.platform === "linkedin");

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
    },
    {
      key: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      description: "Publish posts to your LinkedIn profile from the Content Studio.",
      connectHref: "/api/integrations/linkedin/connect",
      account: liAccount,
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
                        {connected && !expired && (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        {connected && expired && (
                          <Badge variant="warning">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Token expired
                          </Badge>
                        )}
                        {!connected && (
                          <Badge variant="secondary">Not connected</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-small text-text-secondary">
                        {connected && integration.account?.platform_username
                          ? `@${integration.account.platform_username}`
                          : integration.description}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {connected && !expired ? (
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
